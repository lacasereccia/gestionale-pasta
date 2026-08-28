const CACHE_NAME = 'pastificio-v3-dropdowns';
const FILES = [
  './', './index.html', './app.js', './styles.css', './tablet.css', './catalog.css',
  './orders.css', './calendar.css', './login.css', './quick.css', './enhancements.css',
  './order-flow.css', './order-list.css', './quick-sidebar.css', './hours.css',
  './senigallia-controls.css', './hours-name.css', './hours-print.css',
  './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
