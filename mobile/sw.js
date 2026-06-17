var CACHE = 'r-storage-mobile-v3';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg'
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

function isAppAsset(url) {
  return url.pathname.indexOf('/mobile/') !== -1 &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html'));
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  if (isAppAsset(url)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res.ok) {
          caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  if (url.pathname.indexOf('/assets/') !== -1 || url.pathname.indexOf('/js/data.js') !== -1) {
    e.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          return fetch(e.request).then(function (res) {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(function () { return cached; });
        });
      })
    );
    return;
  }
});
