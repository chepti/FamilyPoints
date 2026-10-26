/* רשת קודם, מטמון כגיבוי: כך עדכונים מגיעים מיד, והאפליקציה עדיין נפתחת בלי חיבור. */
const CACHE = 'familypoints-v4';
const FONTS = 'familypoints-fonts'; // גופן Rubik: נשמר אחרי הטעינה הראשונה כדי שגם בלי רשת יראה אותו דבר
const EXTRA = ['manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];

// הקבצים בדף מגיעים עם ?v=<גרסה>. לכן בהתקנה שומרים את הדף עצמו ואת בדיוק הכתובות שהוא מבקש,
// אחרת ביקור ראשון ואז ניתוק (לפני טעינה שנייה) לא היה נפתח.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'reload' });
    if (!res.ok) throw new Error('index ' + res.status);
    const forRoot = res.clone();
    const forIndex = res.clone();
    const html = await res.text();
    await c.put('./', forRoot);
    await c.put('index.html', forIndex);
    const assets = [...new Set([...html.matchAll(/(?:src|href)="((?:css|js)\/[^"]+)"/g)].map((m) => m[1]))];
    await Promise.all(assets.map((u) => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(EXTRA.map((u) => c.add(new Request(u, { cache: 'reload' }))));
  })().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// שומרים רק תשובות תקינות, ומוחקים גרסאות ישנות של אותו קובץ (?v=...) כדי שהמטמון לא יתנפח עם כל פריסה
async function remember(req, res) {
  if (!res || !res.ok || res.status !== 200) return;
  const c = await caches.open(CACHE);
  await c.put(req, res);
  const u = new URL(req.url);
  if (!u.searchParams.has('v')) return;
  for (const k of await c.keys()) {
    const ku = new URL(k.url);
    if (ku.pathname === u.pathname && ku.searchParams.has('v') && k.url !== req.url) await c.delete(k);
  }
}

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
      .then((res) => { e.waitUntil(remember(req, res.clone())); return res; })
      .catch(() => caches.match(req).then((hit) => hit ||
        // רק ניווט חוזר לדף הבית. קובץ קוד שחסר לא יקבל HTML במקום JavaScript
        (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});
