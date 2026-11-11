// Service worker mínimo. A propósito NO guarda en caché datos ni páginas de la
// clínica (información sensible y que cambia a cada momento): solo conserva una
// pantalla de "sin conexión" para cuando el dispositivo se queda sin internet.
const CACHE = 'clinica-marla-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, '/logo-marla-firma.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)))
    return
  }
  if (new URL(req.url).pathname === '/logo-marla-firma.png') {
    event.respondWith(fetch(req).catch(() => caches.match(req)))
  }
})
