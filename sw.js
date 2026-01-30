const CACHE_NAME = "english-kiddo-cache-v1";

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./lessons.js",
];

/* Cache-first for images and assets, network-first for core app files */
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    if (req.method !== "GET") return;

    const isSameOrigin = url.origin === self.location.origin;
    if (!isSameOrigin) return;

    const isImage =
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg");

    const isAssetFolder =
        url.pathname.includes("/assets/") || url.pathname.includes("/images/");

    if (isImage || isAssetFolder) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    return res;
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(req)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return res;
            })
            .catch(() => caches.match(req))
    );
});
