/* מאגר הנתונים: הכל נשמר ב-localStorage של המכשיר. */
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

  function defaults() {
    return {
      v: 1,
      onboarded: false,
      members: [],
      tasks: [],
      completions: [],
      settings: { pin: '', requireApproval: true },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = defaults();
        return Object.assign(base, parsed, {
          settings: Object.assign(base.settings, parsed.settings || {}),
        });
      }
    } catch (e) {
      persistent = false;
    }
    return defaults();
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      persistent = false;
    }
    listeners.forEach((fn) => fn());
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

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
    save();
    return c;
  }

  function setCompletionStatus(id, status) {
    const c = state.completions.find((x) => x.id === id);
    if (c) { c.status = status; save(); }
  }

  function removeCompletion(id) {
    state.completions = state.completions.filter((c) => c.id !== id);
    save();
  }

  function upsertMember(m) {
    const i = state.members.findIndex((x) => x.id === m.id);
    if (i >= 0) state.members[i] = m; else state.members.push(m);
    save();
  }

  function deleteMember(id) {
    state.members = state.members.filter((m) => m.id !== id);
    state.tasks.forEach((t) => { t.assignees = t.assignees.filter((a) => a !== id); });
    save();
  }

  function upsertTask(t) {
    const i = state.tasks.findIndex((x) => x.id === t.id);
    if (i >= 0) state.tasks[i] = t; else state.tasks.push(t);
    save();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    save();
  }

  function addSampleTasks() {
    SAMPLE_TASKS.forEach((s) => state.tasks.push({ id: uid(), assignees: [], ...s }));
    save();
  }

  function update(fn) { fn(state); save(); }

  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.tasks) ||
        !Array.isArray(parsed.completions)) {
      throw new Error('הקובץ לא נראה כמו גיבוי של האפליקציה');
    }
    const base = defaults();
    state = Object.assign(base, parsed, { settings: Object.assign(base.settings, parsed.settings || {}) });
    save();
  }

  function reset() {
    state = defaults();
    save();
  }

  return {
    get state() { return state; },
    get persistent() { return persistent; },
    onChange: (fn) => listeners.push(fn),
    uid, member, task, taskStatus, pointsFor, pending, roundPts,
    periodKey, windowStart,
    addCompletion, setCompletionStatus, removeCompletion,
    upsertMember, deleteMember, upsertTask, deleteTask,
    addSampleTasks, update, exportJSON, importJSON, reset,
  };
})();
