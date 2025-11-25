const CACHE_NAME = 'manege-pro-v1.30-offline';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/index.tsx',
    '/manifest.json',
    '/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache, caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
        console.error('Failed to cache app shell', err);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and network fails, the request will fail.
          // This is expected for dynamic data. App shell should be in cache.
        });
      })
  );
});