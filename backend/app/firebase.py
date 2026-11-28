"""Firebase Admin (Realtime Database + Cloud Messaging), initialised once."""
import threading

import firebase_admin
from firebase_admin import credentials, db

from app import config

_lock = threading.Lock()


def init() -> firebase_admin.App:
  with _lock:
    if firebase_admin._apps:
      return firebase_admin.get_app()
    sa = config.service_account()
    if not sa:
      raise RuntimeError('Set FIREBASE_SERVICE_ACCOUNT (service-account JSON) or GOOGLE_APPLICATION_CREDENTIALS')
    return firebase_admin.initialize_app(credentials.Certificate(sa), {'databaseURL': config.DATABASE_URL})


def ref(path: str) -> db.Reference:
  init()
  return db.reference(path)


def val(path: str):
  return ref(path).get()
