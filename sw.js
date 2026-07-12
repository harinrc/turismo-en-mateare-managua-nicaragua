const CACHE_NAME = "mateare-vivo-v27";
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

const NETWORK_FIRST_FILES = new Set([
  "index.html",
  "main.css",
  "app.js",
  "content.js",
  "firebase.js",
  "firebase-config.js",
  "manifest.json"
]);

function isNetworkFirstPath(pathname) {
  if (!pathname || pathname === "/") return true;

  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const fileName = normalized.split("/").pop() || "";
  return NETWORK_FIRST_FILES.has(fileName);
}

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

  if (isNetworkFirstPath(url.pathname)) {
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
