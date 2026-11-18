// Service worker FINORA: hanya menyimpan aset statis + halaman offline.
// Data keuangan/halaman berotentikasi TIDAK pernah disimpan di cache perangkat.
const V = "finora-sw-v1";
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll([OFFLINE, "/icon-192.png"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match(OFFLINE))); }
});
