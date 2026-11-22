// Fa funzionare l'app anche senza internet. Cambia VERSIONE a ogni aggiornamento dei file.
const VERSIONE = 'finanze-v1';
const FILE = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/util.js', 'js/db.js', 'js/store.js', 'js/calc.js',
  'js/categorie.js', 'js/grafici.js', 'js/excel.js', 'js/views/home.js', 'js/views/movimenti.js', 'js/views/modulo.js', 'js/views/budget.js',
  'js/views/analisi.js', 'js/views/altro.js', 'vendor/xlsx.mini.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((k) => Promise.all(k.filter((x) => x !== VERSIONE).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
// risponde subito con la copia salvata (veloce e offline) e intanto scarica la versione nuova
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSIONE).then(async (c) => {
    const salvata = await c.match(e.request, { ignoreSearch: true });
    const rete = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return salvata || (await rete) || c.match('index.html');
  }));
});
