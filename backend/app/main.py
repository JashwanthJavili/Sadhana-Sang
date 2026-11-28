"""
Sadhana Sang notification server (FastAPI).

Run locally:   uvicorn app.main:app --reload        (from the backend/ folder)
Deploy:        Render (see ../render.yaml) — free plan works.

Delivery is made reliable by three triggers that all do the same safe work:
  1. a live database listener on `pushQueue`     → instant while the server is awake
  2. POST /kick from the app after every action   → wakes a sleeping free server
  3. a scheduler tick every minute + GET /cron    → catches anything missed, sends daily reminders
"""
import hmac
import logging
import time

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import config, firebase
from app.queue import listener_alive, process_queue, start_listener
from app.reminders import send_due_reminders

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('sadhana')

app = FastAPI(title='Sadhana Sang notifications', docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS, allow_methods=['GET', 'POST'], allow_headers=['*'])

_scheduler = BackgroundScheduler(timezone=config.TIMEZONE)


def tick() -> dict:
  if not listener_alive():
    start_listener()
  out = {}
  try:
    out['queue'] = process_queue()
  except Exception as err:
    log.error('queue tick failed: %s', err)
    out['queue_error'] = str(err)
  try:
    out['reminders'] = send_due_reminders()
  except Exception as err:
    log.error('reminder tick failed: %s', err)
    out['reminders_error'] = str(err)
  return out


@app.on_event('startup')
def startup():
  try:
    firebase.init()
    start_listener()
  except Exception as err:
    log.error('startup: %s', err)
  _scheduler.add_job(tick, 'interval', minutes=1, id='tick', max_instances=1, coalesce=True)
  _scheduler.start()
  tick()


@app.get('/')
@app.get('/health')
def health():
  return {'status': 'ok', 'listener': listener_alive(), 'time': int(time.time() * 1000)}


@app.post('/kick')
def kick():
  """The app calls this right after queueing a push. No secret needed: it only processes verified queue items."""
  return {'status': 'ok', **process_queue()}


@app.api_route('/cron', methods=['GET', 'POST'])
def cron(x_cron_secret: str | None = Header(None), secret: str | None = None, force_reminders: bool = False):
  """External cron (e.g. cron-job.org every 5 min): wakes the server and runs a tick."""
  provided = x_cron_secret or secret or ''
  if not config.CRON_SECRET or not hmac.compare_digest(provided, config.CRON_SECRET):
    raise HTTPException(status_code=403, detail='Forbidden')
  out = tick()
  if force_reminders:
    out['forced'] = send_due_reminders(force=True)
  return {'status': 'ok', **out}
