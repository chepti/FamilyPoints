/* רשת קודם, מטמון כגיבוי: כך עדכונים מגיעים מיד, והאפליקציה עדיין נפתחת בלי חיבור. */
const CACHE = 'familypoints-v3';
const FONTS = 'familypoints-fonts'; // גופן Rubik: נשמר אחרי הטעינה הראשונה כדי שגם בלי רשת יראה אותו דבר
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/store.js', 'js/sync.js', 'js/art.js', 'js/brush.js', 'js/brushreport.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'GET' && (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')) {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit ||
      fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
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
