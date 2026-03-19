const CACHE_NAME = "timepk-cache-v6.29";

const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "offline.html",
  "assets/icons/timepk-icon-192.png",
  "assets/icons/timepk-icon-512.png",
  "assets/icons/timepk-logo.png",
  "assets/screenshots/screenshot-desktop.png",
  "assets/screenshots/screenshot-mobile.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  if (event.request.mode === "navigate" || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            try {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            } catch (e) {
              console.warn("[SW] Kunne ikke cache response", e);
            }
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match("offline.html");
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              try {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              } catch (e) {
                console.warn("[SW] Kunne ikke cache asset", e);
              }
            }
            return response;
          })
          .catch(() => caches.match("offline.html"));
      })
    );
  }
});