const CACHE_NAME = "timepk-cache-v5.20";

const ASSETS = [
  "index.html", // bytt til "timepk.html" hvis det er den du bruker
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

// Installer service worker og legg alt i cache
self.addEventListener("install", event => {
  console.log("[SW] Installerer og cacher filer...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Aktiver og fjern gammel cache
self.addEventListener("activate", event => {
  console.log("[SW] Aktiverer og rydder gammel cache...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Håndter fetch – network først for HTML/JS, så cache, ellers offline.html
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // For HTML og JS: network-first (alltid hent nyeste versjon først)
  if (event.request.mode === "navigate" || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache den nye versjonen
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          console.log("[SW] Network feilet, bruker cache:", event.request.url);
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            if (event.request.mode === "navigate") {
              return caches.match("offline.html");
            }
          });
        })
    );
  } else {
    // For bilder og andre assets: cache først (raskere)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          console.log("[SW] Fra cache:", event.request.url);
          return cached;
        }
        return fetch(event.request).catch(() => {
          console.warn("[SW] Offline – bruker offline fallback");
          return caches.match("offline.html");
        });
      })
    );
  }
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  self.clients.matchAll({ type: "window" }).then(clients => {
    clients.forEach(client => client.postMessage({ type: "NEW_VERSION" }));
  });
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});