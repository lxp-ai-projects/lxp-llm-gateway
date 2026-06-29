self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map(async (key) => {
            try {
              await caches.delete(key);
            } catch {
              // Keep unregister/claim moving even if one cache entry is already broken.
            }
          }),
        ),
      )
      .then(async () => {
        try {
          await self.registration.unregister();
        } finally {
          await self.clients.claim();
        }
      }),
  );
});
