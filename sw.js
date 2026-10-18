/* רשת קודם, מטמון כגיבוי: כך עדכונים מגיעים מיד, והאפליקציה עדיין נפתחת בלי חיבור. */
const CACHE = 'familypoints-v2';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/store.js', 'js/sync.js', 'js/art.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // קריאות ה-API אף פעם לא עוברות דרך המטמון
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
  );
});
