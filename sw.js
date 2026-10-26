/**
 * @fileoverview Service Worker para soporte Offline y PWA de Armador de Horarios.
 */

const CACHE_NAME = 'armador-horarios-cache-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/grid.css',
  './css/responsive.css',
  './src/main.js',
  './src/config.js',
  './src/utils.js',
  './src/parser.js',
  './src/solver.js',
  './src/solver.worker.js',
  './src/metrics.js',
  './src/storage.js',
  './src/grid.js',
  './src/exporter.js',
  './src/store.js',
  './src/ui.js',
  './vendor/html2canvas.min.js',
  './vendor/remixicon/remixicon.css',
  './vendor/remixicon/remixicon.woff2',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones no GET o de esquemas no soportados (ej. chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver recurso en caché y refrescar en segundo plano (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no está en caché, ir a la red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
