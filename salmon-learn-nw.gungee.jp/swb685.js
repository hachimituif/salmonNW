const CACHE_NAME = "Salmon-Learn-Caches-v0.0.0"

const urlsToCache = [
  "/maplist/index.html",
  "/about/index.html",
  "/map/index.html",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response ? response : fetch(event.request)
    }),
  )
})
