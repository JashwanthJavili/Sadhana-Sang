# Push notifications

Same design as ArthaLedger: a small always-on **Python (FastAPI) server** sends Firebase Cloud
Messaging pushes. No Cloud Functions, so the free Firebase plan is enough.

## How a notification travels

1. A devotee sends a message, sends a request, or accepts one.
2. The app writes a small item to `pushQueue/{id}` (`{type, from, chatId | requestId | requester, at}`)
   and calls `POST <server>/kick`.
3. The server checks the item against the real data (the chat, request or connection),
   respects blocks and the user's `notify*` settings, sends a **data-only** push with
   `Urgency: high` to every device in `users/{uid}/fcmTokens`, then deletes the item.
4. The browser wakes `frontend/public/sw.js` even if the app is closed, and it shows the
   notification. Tapping it opens the right screen.

The server sends queued items from three triggers, so none is lost:
- a live database listener on `pushQueue` (sends within a second while the server is awake)
- `/kick`, called by the app after each action
- a scheduler tick every minute, plus `GET /cron` from an outside cron job

Festival and Ekadashi reminders for tomorrow go out once a day from 7:00 AM India time
(`REMINDER_HOUR`). Only users in `pushSubscribers` get them, and only if `notifyFestivals` is not off.

## One-time setup

1. **Web push key (VAPID):** Firebase console → Project settings → Cloud Messaging →
   Web Push certificates → Generate. Put it in `frontend/.env` as `VITE_FIREBASE_VAPID_KEY`.
2. **Service account:** Firebase console → Project settings → Service accounts → Generate new
   private key (a JSON file). Never commit it.
3. **Deploy the server on Render** (free): New → Blueprint → pick this repo. It reads `render.yaml`.
   Set these environment variables:
   - `FIREBASE_SERVICE_ACCOUNT` = the whole JSON on one line
   - `CRON_SECRET` = any long random string
4. Put the server URL in `frontend/.env` as `VITE_PUSH_SERVER_URL=https://<name>.onrender.com`,
   then rebuild and deploy the app.
5. **Keep it awake:** a free Render server sleeps after 15 idle minutes. On https://cron-job.org,
   add a job every 5 minutes for `https://<name>.onrender.com/cron?secret=<CRON_SECRET>`.
   This keeps the server awake, so pushes arrive instantly and the daily reminder always runs.
6. Publish the database rules: `firebase deploy --only database`. The rules add `pushQueue`.

## Run locally

```
cd backend
pip install -r requirements.txt
set GOOGLE_APPLICATION_CREDENTIALS=service-account.json
uvicorn app.main:app --reload --port 8000
```

Check it at `http://localhost:8000/health`. Trigger a tick with `/cron?secret=...`, or test
the daily reminder at once with `&force_reminders=true`.

## Limits that no code can remove

- **iPhone:** notifications work only after the app is added to the Home Screen (iOS 16.4+).
- Some Android phones' battery savers delay pushes for apps that are rarely opened. Users can
  set Sadhana Sang (or Chrome) to "Unrestricted" battery use.
- If a user blocks notifications in the browser, the app can only ask them to allow them again.
