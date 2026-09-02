// Service Worker der SYGS-App.
// Zweck: Die installierte App startet schnell und zeigt bei fehlendem Netz
// eine verstaendliche Seite statt des Browser-Dinosauriers.
//
// Wichtig: Persoenliche Daten werden NICHT zwischengespeichert. Weder
// /api/* noch Admin-, Aufgaben- oder Login-Seiten landen im Cache - sonst
// koennte auf einem geteilten Geraet der naechste Nutzer Reste sehen.
//
// Bei Aenderungen die VERSION hochzaehlen, sonst behalten installierte
// Apps den alten Cache.
const VERSION = "v1"
const STATIC_CACHE = `sygs-static-${VERSION}`
const PAGE_CACHE = `sygs-pages-${VERSION}`
const OFFLINE_URL = "/offline.html"

const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png"]

// Seiten mit persoenlichem Inhalt: immer frisch aus dem Netz
const PRIVATE_PREFIXES = ["/admin", "/aufgaben", "/login", "/register", "/verify"]

// Dateien, die sich unter ihrer URL nie aendern
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/images/"]

const startsWithAny = (path, prefixes) => prefixes.some((prefix) => path.startsWith(prefix))

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Ein fehlendes Einzelbild darf die Installation nicht verhindern
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("sygs-") && key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Netz zuerst, Cache als Rueckfall: Inhalte sind immer aktuell, offline
// erscheint die zuletzt gesehene Fassung bzw. die Offline-Seite.
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(PAGE_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    return offline || Response.error()
  }
}

// Cache zuerst: fuer Dateien mit unveraenderlicher URL
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Nur GET; alles Schreibende geht unveraendert ans Netz
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API niemals zwischenspeichern (Anmeldung, Formulare, Aufgaben)
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    if (startsWithAny(url.pathname, PRIVATE_PREFIXES)) {
      event.respondWith(
        fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
      )
      return
    }
    event.respondWith(networkFirst(request))
    return
  }

  if (startsWithAny(url.pathname, STATIC_PREFIXES)) {
    event.respondWith(cacheFirst(request))
  }
})

// Erlaubt der Seite, eine bereitstehende neue Fassung sofort zu aktivieren
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})
