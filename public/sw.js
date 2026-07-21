// ============================================================
// ZAKUPSY - Service Worker v2.0 (PWA + Offline)
// ============================================================

const CACHE_NAME = 'zakupsy-v2';
const OFFLINE_QUEUE = 'zakupsy-sync-queue';

// Assets cached on install (App Shell)
const STATIC_ASSETS = [
  '/',
  '/home',
  '/lists',
  '/manifest.json',
  '/icon.png',
  '/icon.svg',
];

// ============================================================
// INSTALL — Cache the app shell immediately
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Activate new SW immediately
});

// ============================================================
// ACTIVATE — Remove old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control of all open tabs
});

// ============================================================
// FETCH — Smart routing strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // STRATEGY 1: Cache-first for Google Fonts & static files
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.pathname.match(/\.(png|svg|ico|woff2?|ttf|css)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // STRATEGY 2: Network-first for Next.js pages & API
  if (
    url.hostname === self.location.hostname ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // STRATEGY 3: Network-only for Supabase (real-time data)
  // We let it fail silently — mutations go through sync queue
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })));
    return;
  }
});

// ============================================================
// Cache-first: try cache, if miss fetch and cache
// ============================================================
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Brak połączenia', { status: 503 });
  }
}

// ============================================================
// Network-first: try network, fall back to cache
// ============================================================
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    // Update cache with fresh response (only for same-origin pages)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: return the offline shell
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// ============================================================
// BACKGROUND SYNC — Replay queued mutations when online
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'zakupsy-sync') {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  const db = await openQueueDB();
  const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
  const store = tx.objectStore(OFFLINE_QUEUE);
  const allRequests = await getAllFromStore(store);

  for (const item of allRequests) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      // Remove from queue after successful replay
      const deleteTx = db.transaction(OFFLINE_QUEUE, 'readwrite');
      deleteTx.objectStore(OFFLINE_QUEUE).delete(item.id);
    } catch {
      // Still offline — leave in queue
      break;
    }
  }
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Masz nową wiadomość!',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/notifications' },
      actions: [
        { action: 'open', title: 'Otwórz' },
        { action: 'dismiss', title: 'Zamknij' },
      ],
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Zakupsy', options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// ============================================================
// IndexedDB helpers for offline queue
// ============================================================
function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('zakupsy-offline', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(OFFLINE_QUEUE, {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}
