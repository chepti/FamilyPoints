/* מאגר הנתונים: נשמר ב-localStorage, ומסונכרן לשרת דרך Sync (js/sync.js) כשמחוברים. */
const Store = (() => {
  const KEY = 'familypoints.v1';
  const listeners = [];
  let persistent = true;

  const SAMPLE_TASKS = [
    { title: 'ניקוי המקרר', emoji: '🧊', points: 20, period: 'month', times: 1, team: true },
    { title: 'שטיפת רצפה (ספונג׳ה)', emoji: '🧽', points: 10, period: 'week', times: 1, team: true },
    { title: 'שאיבת אבק', emoji: '🌀', points: 8, period: 'week', times: 1, team: false },
    { title: 'ניקוי שירותים', emoji: '🚽', points: 10, period: 'week', times: 1, team: false },
    { title: 'הוצאת הזבל', emoji: '🗑️', points: 3, period: 'day', times: 1, team: false },
    { title: 'סידור החדר', emoji: '🛏️', points: 4, period: 'day', times: 1, team: false },
    { title: 'פריקת מדיח', emoji: '🍽️', points: 4, period: 'day', times: 1, team: false },
    { title: 'הכנת שולחן לארוחה', emoji: '🍴', points: 3, period: 'day', times: 1, team: true },
    { title: 'קיפול כביסה', emoji: '👕', points: 6, period: 'week', times: 3, team: true },
    { title: 'השקיית הצמחים', emoji: '🪴', points: 3, period: 'week', times: 1, team: false },
    { title: 'ניקוי חלונות', emoji: '🪟', points: 15, period: 'month', times: 1, team: true },
    { title: 'סידור ארון נעליים', emoji: '👟', points: 6, period: 'month', times: 1, team: false },
  ];

  const defaultSettings = () => ({ pin: '', requireApproval: true });

  function defaults() {
    return {
      v: 2,
      onboarded: false,
      members: [],
      tasks: [],
      completions: [],
      brushes: [], // צחצוח שיניים: {id, memberId, day, slot: 'm'|'e', ts}
      settings: defaultSettings(),
      // מצב סנכרון: on = מחוברים לשרת, rev = הגרסה האחרונה שקיבלנו,
      // dirty = רשומות ששונו כאן ועוד לא נשלחו
      sync: { on: false, rev: 0, n: 0, dirty: {} },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = defaults();
        const s = Object.assign(base, parsed, {
          settings: Object.assign(defaultSettings(), parsed.settings || {}),
          sync: Object.assign(base.sync, parsed.sync || {}),
        });
        // נתונים ישנים (גרסה 1) לא ידעו על סדר: משלימים לפי מיקום במערך
        s.members.forEach((m, i) => { if (m.o == null) m.o = i + 1; });
        s.tasks.forEach((t, i) => { if (t.o == null) t.o = i + 1; });
        s.v = 2;
        return s;
      }
    } catch (e) {
      persistent = false;
    }
    return defaults();
  }

  let state = load();

  function persist(notify = true) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      persistent = false;
    }
    if (notify) listeners.forEach((fn) => fn());
  }
  const save = () => persist(true);

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- מעקב שינויים לסנכרון ---------- */
  function mark(t, id, del = false) {
    const s = state.sync;
    if (!s.on) return;
    s.n += 1;
    s.dirty[t + ':' + id] = { n: s.n, del };
  }
  // סוג רשומה לא מוכר (מגרסה חדשה יותר של האפליקציה) מתעלמים ממנו, לא מערבבים אותו ברשימה אחרת
  const listFor = (t) => ({ member: state.members, task: state.tasks, completion: state.completions, brush: state.brushes }[t] || null);
  const lookup = (t, id) => {
    if (t === 'settings') return state.settings;
    const list = listFor(t);
    return list ? list.find((x) => x.id === id) : undefined;
  };
  const byOrder = (a, b) => (a.o - b.o) || (a.id < b.id ? -1 : 1);
  const sortAll = () => { state.members.sort(byOrder); state.tasks.sort(byOrder); };

  function hasDirty() { return Object.keys(state.sync.dirty).length > 0; }

  function collectDirty() {
    const changes = [];
    const sent = {};
    for (const [key, e] of Object.entries(state.sync.dirty)) {
      const [t, id] = key.split(':');
      sent[key] = e.n;
      const rec = e.del ? null : lookup(t, id);
      changes.push(rec ? { t, id, d: rec } : { t, id, del: 1 });
    }
    return { changes, sent };
  }

  function applyRecord(r) {
    if (r.t === 'settings') {
      if (!r.del) state.settings = Object.assign(defaultSettings(), r.d);
      return;
    }
    const list = listFor(r.t);
    if (!list) return;
    const i = list.findIndex((x) => x.id === r.id);
    if (r.del) { if (i >= 0) list.splice(i, 1); return; }
    if (i >= 0) list[i] = r.d; else list.push(r.d);
  }

  /* תשובת שרת: מנקים מה שנשלח, ומיישמים שינויים של אחרים (לא דורסים מה שעוד לא נשלח) */
  function applySync(res, sent) {
    const s = state.sync;
    const acks = res.acks || {};
    for (const [key, n] of Object.entries(sent || {})) {
      if (s.dirty[key] && s.dirty[key].n === n) delete s.dirty[key];
    }
    let applied = 0;
    for (const r of res.changes || []) {
      const key = r.t + ':' + r.id;
      if (acks[key] === r.rev) continue; // ההד של הכתיבה שלנו עצמנו
      if (s.dirty[key]) continue; // שינינו שוב בזמן שהבקשה בדרך
      applyRecord(r);
      applied++;
    }
    s.rev = Math.max(s.rev, res.rev || 0);
    sortAll();
    persist(applied > 0);
    return applied;
  }

  function syncOn(on) {
    state.sync.on = on;
    if (!on) { state.sync.dirty = {}; state.sync.rev = 0; }
    persist(false);
  }

  function markAllDirty() {
    state.members.forEach((m) => mark('member', m.id));
    state.tasks.forEach((t) => mark('task', t.id));
    state.completions.forEach((c) => mark('completion', c.id));
    state.brushes.forEach((b) => mark('brush', b.id));
    mark('settings', 'main');
    persist(false);
  }

  function replaceFromRemote(res) {
    const sync = state.sync;
    state = defaults();
    state.sync = Object.assign(state.sync, { on: sync.on });
    applySync(res, {});
    state.onboarded = state.members.length > 0;
    persist(true);
  }

  /* ---------- זמן ותקופות ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function weekStart(d) {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    s.setDate(s.getDate() - s.getDay()); // השבוע מתחיל ביום ראשון
    return s;
  }
  function periodKey(period, ts) {
    const d = new Date(ts);
    if (period === 'day') return dayKey(d);
    if (period === 'week') return dayKey(weekStart(d));
    if (period === 'month') return monthKey(d);
    return 'once';
  }
  function windowStart(win, now = Date.now()) {
    const d = new Date(now);
    if (win === 'week') return weekStart(d).getTime();
    if (win === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return 0;
  }

  /* ---------- שליפות ---------- */
  const member = (id) => state.members.find((m) => m.id === id);
  const task = (id) => state.tasks.find((t) => t.id === id);

  function taskStatus(t, now = Date.now()) {
    const key = periodKey(t.period, now);
    const live = state.completions.filter(
      (c) => c.taskId === t.id && periodKey(t.period, c.ts) === key
    );
    const times = t.period === 'once' ? 1 : t.times;
    return {
      count: live.length,
      pending: live.filter((c) => c.status === 'pending').length,
      times,
      done: live.length >= times,
    };
  }

  const roundPts = (n) => Math.round(n * 10) / 10;

  function pointsFor(memberId, win, now = Date.now()) {
    const from = windowStart(win, now);
    let sum = 0;
    for (const c of state.completions) {
      if (c.status === 'approved' && c.ts >= from && c.members.includes(memberId)) {
        sum += c.pointsEach;
      }
    }
    return roundPts(sum);
  }

  function pending() {
    return state.completions.filter((c) => c.status === 'pending');
  }

  /* ---------- פעולות ---------- */
  function addCompletion(taskId, memberIds, now = Date.now()) {
    const t = task(taskId);
    if (!t || !memberIds.length) return null;
    const allParents = memberIds.every((id) => (member(id) || {}).role === 'parent');
    const status = !state.settings.requireApproval || allParents ? 'approved' : 'pending';
    const c = {
      id: uid(),
      taskId,
      title: t.title,
      emoji: t.emoji,
      points: t.points,
      ts: now,
      members: memberIds.slice(),
      pointsEach: roundPts(t.points / memberIds.length),
      status,
    };
    state.completions.push(c);
    mark('completion', c.id);
    save();
    return c;
  }

  function setCompletionStatus(id, status) {
    const c = state.completions.find((x) => x.id === id);
    if (c) { c.status = status; mark('completion', id); save(); }
  }

  function removeCompletion(id) {
    state.completions = state.completions.filter((c) => c.id !== id);
    mark('completion', id, true);
    save();
  }

  function upsertMember(m) {
    if (m.o == null) m.o = Date.now();
    const i = state.members.findIndex((x) => x.id === m.id);
    if (i >= 0) state.members[i] = m; else state.members.push(m);
    mark('member', m.id);
    sortAll();
    save();
  }

  function deleteMember(id) {
    state.members = state.members.filter((m) => m.id !== id);
    mark('member', id, true);
    state.tasks.forEach((t) => {
      if (t.assignees.includes(id)) {
        t.assignees = t.assignees.filter((a) => a !== id);
        mark('task', t.id);
      }
    });
    save();
  }

  function upsertTask(t) {
    if (t.o == null) t.o = Date.now();
    const i = state.tasks.findIndex((x) => x.id === t.id);
    if (i >= 0) state.tasks[i] = t; else state.tasks.push(t);
    mark('task', t.id);
    sortAll();
    save();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    mark('task', id, true);
    save();
  }

  function addSampleTasks() {
    const base = Date.now();
    SAMPLE_TASKS.forEach((s, i) => {
      const t = { id: uid(), assignees: [], o: base + i, ...s };
      state.tasks.push(t);
      mark('task', t.id);
    });
    sortAll();
    save();
  }

  /* ---------- צחצוח שיניים ---------- */
  // מזהה קבוע לכל (בן משפחה, יום, בוקר/ערב): שני מכשירים שמסמנים אותו דבר לא יוצרים כפילות
  const brushId = (memberId, day, slot) => `${memberId}_${day}_${slot}`;
  const isBrushed = (memberId, day, slot) => state.brushes.some((b) => b.id === brushId(memberId, day, slot));

  function setBrush(memberId, day, slot, on, now = Date.now()) {
    const id = brushId(memberId, day, slot);
    const i = state.brushes.findIndex((b) => b.id === id);
    if (on) {
      if (i >= 0) return;
      state.brushes.push({ id, memberId, day, slot, ts: now });
      mark('brush', id);
    } else {
      if (i < 0) return;
      state.brushes.splice(i, 1);
      mark('brush', id, true);
    }
    save();
  }

  // כמה שינויים מחכים לשליחה (לתצוגת "אין חיבור")
  const pendingCount = () => Object.keys(state.sync.dirty).length;

  function setSettings(patch) {
    Object.assign(state.settings, patch);
    mark('settings', 'main');
    save();
  }

  function finishOnboarding(members) {
    const base = Date.now();
    state.members = members.map((m, i) => ({ ...m, o: base + i }));
    state.members.forEach((m) => mark('member', m.id));
    state.onboarded = true;
    save();
  }

  function exportJSON() {
    const { sync, ...rest } = state;
    return JSON.stringify(rest, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.tasks) ||
        !Array.isArray(parsed.completions)) {
      throw new Error('הקובץ לא נראה כמו גיבוי של האפליקציה');
    }
    const old = { member: state.members, task: state.tasks, completion: state.completions, brush: state.brushes };
    const sync = state.sync;
    const next = Object.assign(defaults(), parsed, {
      settings: Object.assign(defaultSettings(), parsed.settings || {}),
    });
    next.sync = sync;
    next.members.forEach((m, i) => { if (m.o == null) m.o = i + 1; });
    next.tasks.forEach((t, i) => { if (t.o == null) t.o = i + 1; });
    state = next;
    // רשומות שהיו וכבר לא בגיבוי נמחקות גם אצל כולם
    for (const [t, list] of Object.entries(old)) {
      list.forEach((x) => { if (!lookup(t, x.id)) mark(t, x.id, true); });
    }
    markAllDirty();
    save();
  }

  /* מוחק הכל. כשמחוברים לסנכרון זה נמחק גם אצל שאר המשפחה */
  function reset() {
    const sync = state.sync;
    const tomb = (t, list) => list.forEach((x) => { sync.n += 1; sync.dirty[t + ':' + x.id] = { n: sync.n, del: true }; });
    if (sync.on) {
      tomb('member', state.members);
      tomb('task', state.tasks);
      tomb('completion', state.completions);
      tomb('brush', state.brushes);
    }
    state = defaults();
    state.sync = sync;
    persist(true);
  }

  return {
    get state() { return state; },
    get persistent() { return persistent; },
    onChange: (fn) => listeners.push(fn),
    uid, member, task, taskStatus, pointsFor, pending, roundPts,
    periodKey, windowStart,
    addCompletion, setCompletionStatus, removeCompletion,
    upsertMember, deleteMember, upsertTask, deleteTask,
    addSampleTasks, setSettings, finishOnboarding,
    exportJSON, importJSON, reset,
    isBrushed, setBrush,
    // סנכרון
    hasDirty, pendingCount, collectDirty, applySync, syncOn, markAllDirty, replaceFromRemote,
  };
})();
