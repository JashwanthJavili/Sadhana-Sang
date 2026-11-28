/* Service Worker for Sadhana Sang PWA - Auto-Update Optimized */

const APP_VERSION = '1.3.3';
const CACHE_NAME = `sadhana-sang-v${APP_VERSION}`;
const RUNTIME_CACHE = `sadhana-runtime-v${APP_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.css'
];

// Send version info to clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Clear all caches on demand
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache v3');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Fetch event - Network-first for API calls, Cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Firebase API calls - always use network
  if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Never intercept in local development (Vite serves un-hashed modules)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Network-first for page navigations so new deployments show up immediately
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache JS, CSS, fonts, images
          if (request.method === 'GET' && 
              (request.destination === 'script' || 
               request.destination === 'style' ||
               request.destination === 'font' ||
               request.destination === 'image')) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        }).catch(() => {
          // Offline fallback
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/* ------------------------------------------------------------------ Push */
// FCM data-only messages arrive as { data: { title, body, link, tag, icon } }.
// A `notification` object is handled too (e.g. messages sent from the console).
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { data: { body: event.data ? event.data.text() : '' } };
  }
  const data = payload.data || {};
  const notif = payload.notification || {};
  const fcmLink = payload.fcmOptions && payload.fcmOptions.link;
  const title = data.title || notif.title || 'Sadhana Sang';
  const options = {
    body: data.body || notif.body || '',
    icon: data.icon || notif.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || notif.tag || 'sadhana-sang',
    renotify: true,
    vibrate: [80, 40, 80],
    data: { link: data.link || fcmLink || notif.click_action || '/' }
  };
  // If the app is open and focused, hand the message to the page (in-app toast via
  // onForegroundMessage in services/push.ts) instead of a system notification.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const visible = clientList.filter((c) => c.focused && c.visibilityState === 'visible');
      if (visible.length) {
        visible.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED', payload: { title, body: options.body, link: options.data.link, tag: options.tag } }));
        return undefined;
      }
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  const target = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const sameOrigin = clientList.filter((c) => c.url.startsWith(self.location.origin));
      const client = sameOrigin.find((c) => c.focused) || sameOrigin[0];
      if (client) {
        return client.focus().then((c) => {
          const win = c || client;
          if ('navigate' in win && win.url !== target) {
            return win.navigate(target).catch(() => {
              win.postMessage({ type: 'NAVIGATE', link });
            });
          }
          return win;
        });
      }
      return self.clients.openWindow(target);
    })
  );
});
