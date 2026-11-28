"""Festival & Ekadashi reminders: once a day (from REMINDER_HOUR local time) for tomorrow's dates."""
import datetime
import logging
from zoneinfo import ZoneInfo

from app import config, firebase
from app.push import opted_out, send_to_user

log = logging.getLogger('sadhana.reminders')
STATE = 'serverState/festivalReminders/lastDate'


def _today_tomorrow():
  now = datetime.datetime.now(ZoneInfo(config.TIMEZONE))
  return now, now.strftime('%Y-%m-%d'), (now + datetime.timedelta(days=1)).strftime('%Y-%m-%d')


def _ekadashi(loc: str, tomorrow: str, cache: dict, names: dict):
  if loc in cache:
    return cache[loc]
  rec = firebase.val(f'ekadashi/observances/{loc}/{tomorrow}')
  result = rec if isinstance(rec, dict) and rec.get('slug') else None
  if rec is None and loc != config.DEFAULT_EKADASHI_LOCATION:
    # A city with no records of its own uses the default location's dates
    if not firebase.ref(f'ekadashi/observances/{loc}').order_by_key().limit_to_first(1).get():
      result = _ekadashi(config.DEFAULT_EKADASHI_LOCATION, tomorrow, cache, names)
  if result and '_name' not in result:
    slug = result['slug']
    if slug not in names:
      names[slug] = firebase.val(f'ekadashi/content/{slug}/name') or f'{slug.replace("-", " ").title()} Ekadashi'
    result = {**result, '_name': names[slug]}
  cache[loc] = result
  return result


def send_due_reminders(force: bool = False) -> dict:
  now, today, tomorrow = _today_tomorrow()
  if not force and (now.hour < config.REMINDER_HOUR or firebase.val(STATE) == today):
    return {'reminders': 'not due'}
  firebase.ref(STATE).set(today)  # mark first: overlapping ticks never double-send

  fests = firebase.ref('festivals').order_by_child('date').equal_to(tomorrow).get() or {}
  festivals = [{'id': k, **v} for k, v in fests.items() if isinstance(v, dict) and v.get('name')]
  uids = list((firebase.val('pushSubscribers') or {}).keys())
  cache, names, sent = {}, {}, 0
  for uid in uids:
    try:
      if opted_out(uid, 'notifyFestivals'):
        continue
      loc = firebase.val(f'users/{uid}/ekadashiLocation/id') or config.DEFAULT_EKADASHI_LOCATION
      ek = _ekadashi(loc, tomorrow, cache, names)
      items = []
      if ek:
        items.append({'name': ek['_name'], 'link': f"/#/ekadashi/{ek['slug']}?date={tomorrow}", 'desc': 'Fasting day tomorrow'})
      items += [{'name': f['name'], 'link': f"/#/festival/{f['id']}", 'desc': f.get('shortDescription')} for f in festivals]
      if not items:
        continue
      title = 'Tomorrow: ' + ' · '.join(i['name'] for i in items)
      body = items[0]['desc'] if len(items) == 1 and items[0]['desc'] else 'May your sadhana be blessed 🙏'
      link = items[0]['link'] if len(items) == 1 else '/#/festivals'
      sent += send_to_user(uid, title, body, link, f'reminder-{tomorrow}')
    except Exception as err:
      log.warning('reminder failed uid=%s: %s', uid, err)
  log.info('reminders for %s: festivals=%s subscribers=%s sent=%s', tomorrow, len(festivals), len(uids), sent)
  return {'reminders_for': tomorrow, 'festivals': len(festivals), 'subscribers': len(uids), 'sent': sent}
