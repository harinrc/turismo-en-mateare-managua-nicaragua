const CACHE_NAME = "mateare-vivo-v24";
const APP_SHELL = [
  "./",
  "./index.html",
  "./main.css",
  "./app.js",
  "./content.js",
  "./firebase.js",
  "./firebase-config.js",
  "./manifest.json",
  "./favicon.svg",
  "./icon-192.svg",
  "./icon-512.svg"
];

const NETWORK_FIRST_PATHS = new Set([
  "/turismo-en-mateare-managua-nicaragua/",
  "/turismo-en-mateare-managua-nicaragua/index.html",
  "/turismo-en-mateare-managua-nicaragua/main.css",
  "/turismo-en-mateare-managua-nicaragua/app.js",
  "/turismo-en-mateare-managua-nicaragua/content.js",
  "/turismo-en-mateare-managua-nicaragua/firebase.js",
  "/turismo-en-mateare-managua-nicaragua/firebase-config.js",
  "/turismo-en-mateare-managua-nicaragua/manifest.json"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (!isSameOrigin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (NETWORK_FIRST_PATHS.has(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
