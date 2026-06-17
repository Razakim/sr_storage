var CACHE = 'r-storage-mobile-v2';
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
  './js/sync.js',
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
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  if (url.pathname.indexOf('/assets/') !== -1) {
    e.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          var network = fetch(e.request).then(function (res) {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  if (SHELL.some(function (p) { return url.pathname.endsWith(p.replace('./', '').replace('../', '')); }) ||
      url.pathname.indexOf('/mobile/') !== -1 && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html'))) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        var fetched = fetch(e.request).then(function (res) {
          if (res.ok) {
            caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
          }
          return res;
        });
        return cached || fetched;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).catch(function () { return caches.match(e.request); })
  );
});
