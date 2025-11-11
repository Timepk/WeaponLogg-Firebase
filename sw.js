const CACHE_NAME = "timepk-cache-v5.13";

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

// Håndter fetch – cache først, så nett, ellers offline.html
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log("[SW] Fra cache:", event.request.url);
        return cached;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          console.warn("[SW] Offline – viser offline.html");
          return caches.match("offline.html");
        }
      });
    })
  );
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

 