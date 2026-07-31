// Service worker for offline app loading.
// This caches the app's own files (not your data — that's IndexedDB, separate
// and already offline-safe) so the app can open with zero internet connection,
// not just run offline once it's already loaded.
//
// Bump CACHE_NAME any time the app's files are updated and redeployed, so
// returning visitors get the new version instead of being stuck on old code.
var CACHE_NAME = 'webkinz-house-v2';
var APP_SHELL = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(
        APP_SHELL.map(function(url){
          return fetch(url, { mode: url.indexOf('http') === 0 ? 'no-cors' : 'same-origin' })
            .then(function(res){ return cache.put(url, res); })
            .catch(function(){ /* ignore individual failures, e.g. font CDN unreachable on first install */ });
        })
      );
    })
  );
});

self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// cache-first: try the cache immediately (works offline), and quietly
// refresh the cache in the background from the network when available
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
