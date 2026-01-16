// Service Worker per PWA
const CACHE_NAME = 'lista-spesa-v1';
const urlsToCache = [
  '/',
  '/index.html',
];

// Installazione del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Attivazione del service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: strategia network-first per dati dinamici (Firebase)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la risposta per poterla usare e salvare
        const responseToCache = response.clone();
        
        // Salva solo risorse statiche in cache
        if (event.request.url.startsWith('http') && 
            !event.request.url.includes('firestore') &&
            !event.request.url.includes('firebase')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, prova a servire dalla cache
        return caches.match(event.request);
      })
  );
});
