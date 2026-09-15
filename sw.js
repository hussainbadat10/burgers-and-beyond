// Caches only the static shell (HTML/CSS/JS/images) for fast repeat loads
// and basic offline browsing — never the Firestore data itself (menu prices,
// daily specials, "Open Now" status). Those come from network on every load
// same as before; if there's no network, the page just falls back to
// whatever "menu is loading" state it already shows rather than risking
// showing stale prices or a wrong open/closed badge as if it were current.
//
// admin.html (and its own JS) is deliberately NOT cached — it's a
// password-protected internal tool, not something worth precaching for
// every visitor, and editing content offline wouldn't work anyway.
var CACHE_NAME = 'bnb-shell-v1';

var PRECACHE_URLS = [
  'index.html',
  'menu.html',
  'about.html',
  'contact.html',
  'privacy.html',
  '404.html',
  'css/style.css',
  'js/script.js',
  'js/cart.js',
  'js/firebase-config.js',
  'js/menu-loader.js',
  'js/promo.js',
  'js/site-content.js',
  'js/store-status.js',
  'js/analytics.js',
  'images/favicon.png',
  'images/icon.png',
  'images/icon-192.png',
  'images/apple-touch-icon.png',
  'images/logo.png',
  'images/sanha-logo.png',
  'site.webmanifest'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Only handle same-origin GET requests — let Firestore, Cloudinary,
  // Google Fonts, gstatic (Firebase SDK), and GA4 pass straight through
  // untouched, exactly as if this service worker didn't exist.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // admin.html sits in the same directory as everything else, so this
  // service worker's scope (and clients.claim()) unavoidably covers it too
  // once a visitor has loaded any other page first — navigator.serviceWorker
  // .controller will be non-null there even though admin.html never
  // registers this file itself. That's harmless as long as its own
  // requests are never actually cached or served from cache, which this
  // guard guarantees: real network, every time, no exceptions.
  var isAdminRequest = url.pathname.endsWith('/admin.html') ||
    url.pathname.endsWith('/js/admin.js') ||
    url.pathname.endsWith('/js/seed-data.js');
  if (isAdminRequest) return;

  if (event.request.mode === 'navigate') {
    // HTML pages: always prefer a fresh network copy while online, so a
    // returning visitor never gets stuck on a stale page after a deploy.
    // Cache is only ever used as an offline fallback.
    event.respondWith(
      fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('index.html');
        });
      })
    );
    return;
  }

  // Static assets (CSS/JS/images): serve from cache instantly if present,
  // but always refetch in the background so the cache is never more than
  // one visit stale.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () { return cached; });

      return cached || fetchPromise;
    })
  );
});
