var CACHE = 'r-storage-mobile-v1';
var SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/nav.css',
  './css/auth.css',
  './css/browse.css',
  './css/add.css',
  './css/preview.css',
  './js/db.js',
  './js/auth.js',
  './js/catalog.js',
  './js/router.js',
  './js/render.js',
  './js/preview.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  '../js/data.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  if (url.pathname.indexOf('/assets/') !== -1) {
    e.respondWith(
      caches.open(CACHE).then(function (cache) {
        return fetch(e.request).then(function (res) {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(function () {
          return cache.match(e.request);
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (res) {
        if (res.ok && url.origin === self.location.origin) {
          caches.open(CACHE).then(function (cache) {
            cache.put(e.request, res.clone());
          });
        }
        return res;
      });
      return cached || fetched;
    }).catch(function () {
      return caches.match('./index.html');
    })
  );
});
