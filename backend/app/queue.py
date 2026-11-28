"""
Push queue: the app writes `pushQueue/{id}` = {type, from, chatId|requestId, at} right after
a user sends a message, sends a request, or accepts one. The server checks every item
against the real data (so nobody can fake a notification), sends it, and deletes it.

Items are processed by: the live listener (instant while the server is awake),
the /kick endpoint (the app wakes a sleeping server), and every scheduler/cron tick.
"""
import logging
import threading
import time

from app import config, firebase
from app.push import is_blocked, opted_out, send_to_user

log = logging.getLogger('sadhana.queue')
_lock = threading.Lock()


def _name(uid: str, fallback: str = 'A devotee') -> str:
  for p in (f'publicProfiles/{uid}/userName', f'circleProfiles/female/{uid}/userName', f'circleProfiles/male/{uid}/userName', f'users/{uid}/userName'):
    n = firebase.val(p)
    if n:
      return str(n)
  return fallback


def _message(item: dict) -> int:
  chat_id, sender = item.get('chatId'), item.get('from')
  participants = firebase.val(f'chats/{chat_id}/participants') or []
  if sender not in participants:
    return 0
  recipient = next((p for p in participants if p != sender), None)
  if not recipient or is_blocked(recipient, sender) or opted_out(recipient, 'notifyMessages'):
    return 0
  # Message text is end-to-end encrypted and never leaves the app
  return send_to_user(recipient, _name(sender), 'Sent you a message 🙏', f'/#/chat/{chat_id}', f'chat-{chat_id}', ttl=6 * 3600)


def _request(item: dict) -> int:
  rid = item.get('requestId')
  req = firebase.val(f'connectionRequests/{rid}') or {}
  if req.get('fromUserId') != item.get('from') or req.get('status') != 'pending':
    return 0
  to = req.get('toUserId')
  if not to or is_blocked(to, req['fromUserId']) or opted_out(to, 'notifyRequests'):
    return 0
  who = req.get('fromUserName') or _name(req['fromUserId'])
  return send_to_user(to, 'New connection request', f'{who} wants to connect with you', '/#/connection-requests', f'request-{rid}')


def _accepted(item: dict) -> int:
  """`from` accepted `requester`'s request; the request itself is deleted on accept, so check the new connection."""
  accepter, requester = item.get('from'), item.get('requester')
  conn = firebase.val(f'connections/{requester}/{accepter}') or {}
  if not conn or time.time() * 1000 - float(conn.get('connectedAt') or 0) > config.QUEUE_MAX_AGE_MS:
    return 0
  if opted_out(requester, 'notifyRequests'):
    return 0
  who = conn.get('userName') or _name(accepter)
  return send_to_user(requester, 'Request accepted', f'{who} accepted your connection request 🙏', '/#/community', f'accepted-{accepter}')


HANDLERS = {'message': _message, 'request': _request, 'accepted': _accepted}


def process_queue() -> dict:
  """Send every pending item once. Safe to call often and from several triggers."""
  if not _lock.acquire(blocking=False):
    return {'skipped': 'busy'}
  sent = handled = 0
  try:
    items = firebase.val('pushQueue') or {}
    now = time.time() * 1000
    for key, item in items.items():
      firebase.ref(f'pushQueue/{key}').delete()  # claim first: never send twice
      handled += 1
      if not isinstance(item, dict) or now - float(item.get('at') or 0) > config.QUEUE_MAX_AGE_MS:
        continue
      fn = HANDLERS.get(item.get('type'))
      if not fn:
        continue
      try:
        sent += fn(item)
      except Exception as err:  # one bad item must not stop the rest
        log.error('queue item %s failed: %s', key, err)
  finally:
    _lock.release()
  return {'handled': handled, 'sent': sent}


_listener = None


def start_listener() -> None:
  """Live listener: reacts within a second while the server is awake."""
  global _listener
  if _listener is not None:
    return

  def on_event(event):
    if event.data is not None:
      threading.Thread(target=process_queue, daemon=True).start()

  try:
    _listener = firebase.ref('pushQueue').listen(on_event)
    log.info('pushQueue listener started')
  except Exception as err:
    _listener = None
    log.error('pushQueue listener failed: %s', err)


def listener_alive() -> bool:
  return _listener is not None
