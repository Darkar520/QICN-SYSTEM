// QICN runtime cleanup worker.
// Intentionally disables offline caching to prevent stale/corrupted bundles on static hosts.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});

self.addEventListener('fetch', () => {
  // no-op by design
});
