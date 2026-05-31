const CACHE_NAME = 'mood-logger-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/index.js',
  '/main.css',
];

self.oninstall = event => {
  console.log('Install event: %s', CACHE_NAME);
  // Activate immediately after updating
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => console.log('Cached all assets.')));
};

self.onactivate = event => {
  console.log('Activate event: %s', CACHE_NAME);
  event.waitUntil(caches.keys().then(
    cacheKeys => Promise.all(
      cacheKeys.filter(cacheName => cacheName !== CACHE_NAME)
        .map(oldCache => caches.delete(oldCache).then(
          () => console.log('Deleting old cache: %s', oldCache))))));
};

self.onfetch = event => {
  const url = new URL(event.request.url).pathname;
  console.log('Fetch event: %s', url);
  if (urlsToCache.includes(url)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then(cache => cache.match(event.request))
        .then(cacheResponse => {
          if (cacheResponse) {
            console.log('Cache hit!');
            return cacheResponse;
          }
          console.log('Cache miss!');
          return fetch(event.request).then(
            fetchResponse => {
              console.log('Caching new response.');
              cache.put(event.request, fetchResponse);
              return fetchResponse;
            });
        }));
  }
};
