# Android app (Trusted Web Activity)

The PWA can be shipped to the Play Store as a **Trusted Web Activity** — a thin
Android wrapper that opens the live site full‑screen in Chrome, with no URL bar.

## Prerequisites

- The site deployed over HTTPS (e.g. Firebase Hosting) with `/manifest.json`
  and `/sw.js` served (see `firebase.json` headers).
- JDK 17 and Android SDK — Bubblewrap offers to download both on first run.

## Build

```bash
npx @bubblewrap/cli init --manifest https://<your-domain>/manifest.json
```

Answer the prompts:

- **Application ID / package name:** `com.sadhanasang.app` (must match
  `public/.well-known/assetlinks.json`)
- **Display mode:** standalone · **Status bar / nav colour:** `#FBF5EA`
- **Notification delegation:** **Yes** (lets web push show as app notifications)
- **Signing key:** create a new keystore and keep it (and its passwords) safe —
  you need the same key for every update.

Then:

```bash
npx @bubblewrap/cli build      # produces app-release-signed.apk and app-release-bundle.aab
```

Upload the `.aab` to the Play Console.

## Digital Asset Links (removes the URL bar)

1. Get the SHA‑256 fingerprint(s):
   - Upload key: `keytool -list -v -keystore android.keystore` (or
     `npx @bubblewrap/cli fingerprint list`).
   - **If you use Play App Signing** (default), also copy the *App signing key
     certificate* SHA‑256 from Play Console → Setup → App integrity.
2. Put them in `public/.well-known/assetlinks.json`, replacing the `TODO`
   entry (format `AB:CD:…`, list both fingerprints).
3. Rebuild and redeploy hosting; check
   `https://<your-domain>/.well-known/assetlinks.json` returns JSON, and verify
   with <https://developers.google.com/digital-asset-links/tools/generator>.

If verification fails the app still works but shows a browser URL bar.

## Push inside the TWA

With notification delegation enabled, the TWA delegates `Notification`
permission to the Android app: `enablePush()` shows the Android 13+ system
permission prompt, and FCM pushes received by the site's service worker appear
as notifications of the Android app (with its icon). No native FCM code is
needed — the same `frontend/services/push.ts` + `backend/` setup is used. Tapping a
notification opens the TWA at the notification's `link`.

## Updating

Web changes go live on deploy — no new APK is needed. Rebuild the app only when
the manifest (name, icons, colours, shortcuts) changes:
`npx @bubblewrap/cli update && npx @bubblewrap/cli build`, and bump the version
code.
