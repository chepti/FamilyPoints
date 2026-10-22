/* סנכרון בין מכשירים מול api/index.php באותו אתר. אם אין שרת מוגדר, האפליקציה עובדת מקומית. */
const Sync = (() => {
  const API = 'api/index.php';
  const KEY_LS = 'familypoints.key';
  const POLL_MS = 10000;

  const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } };

  const listeners = [];
  let key = lsGet(KEY_LS);
  let available = !!key;          // יש מפתח שמור = מניחים שהשרת קיים
  let ready = false;
  let unreachable = false;        // אין תשובה מהשרת (רשת/5xx), לא אותו דבר כמו "אין שרת סנכרון"
  let status = key ? 'connecting' : 'off'; // off | connecting | ok | offline | auth
  let busy = false;
  let again = false;
  let started = false;
  let pushTimer = null;

  function setStatus(s) {
    if (s === status) return;
    status = s;
    listeners.forEach((fn) => fn());
  }

  async function call(action, body, k = key) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(`${API}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Key': k },
        body: JSON.stringify(body || {}),
        signal: ctl.signal,
        cache: 'no-store',
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* לא JSON */ }
      if (!res.ok || !data || data.ok !== true) {
        const err = new Error((data && data.error) || 'http_' + res.status);
        err.status = res.status;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(to);
    }
  }

  const enabled = () => available && !!key && Store.state.sync.on;

  async function syncNow() {
    if (!enabled() || status === 'auth') return;
    // המכשיר יודע שאין רשת: לא מחכים 15 שניות ל-timeout. השינויים נשארים בתור וייצאו כשהרשת תחזור.
    if (navigator.onLine === false) { setStatus('offline'); return; }
    if (busy) { again = true; return; }
    busy = true;
    try {
      const { changes, sent } = Store.collectDirty();
      const res = await call('sync', { since: Store.state.sync.rev, changes });
      Store.applySync(res, sent);
      setStatus('ok');
    } catch (e) {
      setStatus(e.status === 401 ? 'auth' : 'offline');
    } finally {
      busy = false;
      if (again) { again = false; syncNow(); }
    }
  }

  function start() {
    if (started || !enabled()) return;
    started = true;
    setInterval(() => { if (!document.hidden) syncNow(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
    window.addEventListener('online', syncNow);
    window.addEventListener('offline', () => setStatus('offline'));
    window.addEventListener('focus', syncNow);
    Store.onChange(() => {
      if (!enabled() || !Store.hasDirty()) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(syncNow, 400);
    });
    syncNow();
  }

  /* בודק פעם אחת אם יש שרת סנכרון מוגדר */
  async function init() {
    unreachable = false;
    if (!key) {
      if (location.protocol === 'file:') {
        available = false;
      } else {
        try {
          const r = await call('ping', {}, '');
          available = !!r.configured;
        } catch (e) {
          // 404/405/501 = אין שרת סנכרון בכתובת הזו (עבודה מקומית). כל כשל אחר זמני.
          available = false;
          unreachable = ![404, 405, 501].includes(e.status);
        }
      }
    }
    ready = true;
    start();
  }

  /* מתחבר עם קוד משפחה. confirmReplace() נשאלת אם גם כאן וגם בשרת כבר יש נתונים */
  async function connect(code, confirmReplace) {
    const k = code.trim();
    const ping = await call('ping', {}, k);
    if (!ping.auth) throw new Error('bad_key');
    const res = await call('sync', { since: 0, changes: [] }, k);
    const remoteHas = res.changes.some((r) => r.t === 'member' && !r.del);
    const localHas = Store.state.members.length > 0;
    if (remoteHas && localHas && !(await confirmReplace())) return 'cancelled';

    key = k;
    lsSet(KEY_LS, k);
    available = true;
    Store.syncOn(true);
    if (remoteHas) Store.replaceFromRemote(res);
    else if (localHas) Store.markAllDirty();
    setStatus('connecting');
    start();
    await syncNow();
    return remoteHas ? 'joined' : localHas ? 'uploaded' : 'empty';
  }

  function disconnect() {
    key = '';
    lsSet(KEY_LS, '');
    Store.syncOn(false);
    setStatus('off');
  }

  return {
    init, connect, disconnect, syncNow,
    onStatus: (fn) => listeners.push(fn),
    get available() { return available; },
    get enabled() { return enabled(); },
    get ready() { return ready; },
    get unreachable() { return unreachable; },
    get status() { return status; },
  };
})();
