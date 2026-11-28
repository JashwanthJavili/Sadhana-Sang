"""Settings read from environment variables (set them in Render → Environment)."""
import json
import os

DATABASE_URL = os.getenv('FIREBASE_DATABASE_URL', 'https://sadhanatracker-92f04-default-rtdb.firebaseio.com')
# Either the full service-account JSON as one env var, or a path to the file
SERVICE_ACCOUNT_JSON = os.getenv('FIREBASE_SERVICE_ACCOUNT', '')
SERVICE_ACCOUNT_PATH = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
# Shared secret for the external cron URL (cron-job.org etc.)
CRON_SECRET = os.getenv('CRON_SECRET', '')
ALLOWED_ORIGINS = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', '*').split(',') if o.strip()]

TIMEZONE = 'Asia/Kolkata'
# Festival / Ekadashi reminders go out once a day from this local hour (for tomorrow's dates)
REMINDER_HOUR = int(os.getenv('REMINDER_HOUR', '7'))
DEFAULT_EKADASHI_LOCATION = 'mayapur'
ICON = '/icon-192.png'
# Queue items older than this are dropped instead of sent (stale news is worse than none)
QUEUE_MAX_AGE_MS = 6 * 60 * 60 * 1000


def service_account():
  if SERVICE_ACCOUNT_JSON:
    return json.loads(SERVICE_ACCOUNT_JSON)
  if SERVICE_ACCOUNT_PATH:
    return SERVICE_ACCOUNT_PATH
  return None
