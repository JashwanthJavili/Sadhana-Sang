"""
Sends FCM web pushes as *data-only* messages.

Data-only means the browser wakes the app's service worker (public/sw.js) even when
the app is closed, and the worker shows the notification itself. `Urgency: high`
asks Android to deliver right away (even in Doze); TTL keeps it queued while the
phone is offline.
"""
import logging
from typing import Dict, List

from firebase_admin import messaging

from app import config, firebase

log = logging.getLogger('sadhana.push')
_DEAD = ('unregistered', 'not-found', 'invalid-registration', 'invalid-argument', 'sender-id-mismatch')


def _tokens(uid: str) -> Dict[str, str]:
  data = firebase.val(f'users/{uid}/fcmTokens') or {}
  return {k: v.get('token') for k, v in data.items() if isinstance(v, dict) and v.get('token')}


def opted_out(uid: str, pref: str) -> bool:
  return firebase.val(f'users/{uid}/settings/{pref}') is False


def is_blocked(blocker: str, other: str) -> bool:
  return bool(firebase.val(f'blocks/{blocker}/{other}'))


def send_to_user(uid: str, title: str, body: str, link: str = '/', tag: str = 'sadhana-sang', ttl: int = 24 * 3600) -> int:
  tokens = _tokens(uid)
  if not tokens:
    return 0
  keys: List[str] = list(tokens.keys())
  msg = messaging.MulticastMessage(
    tokens=[tokens[k] for k in keys],
    data={'title': title, 'body': body, 'link': link, 'tag': tag, 'icon': config.ICON},
    webpush=messaging.WebpushConfig(headers={'Urgency': 'high', 'TTL': str(ttl)}),
    android=messaging.AndroidConfig(priority='high', ttl=ttl),
  )
  res = messaging.send_each_for_multicast(msg)
  for i, r in enumerate(res.responses):
    if r.success:
      continue
    code = str(getattr(r.exception, 'code', r.exception)).lower()
    log.warning('push failed uid=%s: %s', uid, code)
    if any(c in code for c in _DEAD):
      firebase.ref(f'users/{uid}/fcmTokens/{keys[i]}').delete()
  if res.success_count == 0 and not _tokens(uid):
    firebase.ref(f'pushSubscribers/{uid}').delete()
  log.info('push uid=%s ok=%s fail=%s tag=%s', uid, res.success_count, res.failure_count, tag)
  return res.success_count
