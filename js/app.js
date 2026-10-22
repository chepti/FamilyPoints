(() => {
  'use strict';
  const S = Store;
  const $app = document.getElementById('app');

  const AVATARS = ['🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐵', '🦊', '🐰', '🐱', '🐶', '🦄', '🐙', '🦋', '🐧', '🦉', '🐢', '🐳', '🦒', '🐘'];
  const COLORS = ['#e76f51', '#e9a23b', '#2a9d8f', '#5a8dee', '#9b6bd3', '#d66ba0', '#3aa6b9', '#6c9a5b', '#c2703d', '#7b8794'];
  const TASK_EMOJIS = ['🧹', '🧽', '🧺', '🧼', '🚿', '🛁', '🚽', '🗑️', '🍽️', '🍴', '🥣', '🛒', '👕', '🧦', '🛏️', '🪴', '🌿', '🐶', '🐱', '🐟', '🪟', '🚗', '📚', '🎒', '🧊', '🍳', '🥕', '📦', '🔧', '🪣', '🧴', '♻️', '🌀', '👟', '☀️', '🎈'];
  const PERIODS = { day: 'יומי', week: 'שבועי', month: 'חודשי', year: 'שנתי', any: 'לפי צורך', once: 'חד־פעמי' };
  const BOARDS = { week: 'השבוע', month: 'החודש', all: 'מאז ומעולם' };

  /* ---------- כלים ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8 7.5 9.5 4.4-1.5 7.5-5.1 7.5-9.5V6L12 3z"/><path d="m9.5 12 1.7 1.7 3.3-3.4"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 16.9l-5.2 2.9 1-5.9-4.3-4.2 5.9-.8L12 3.5z"/>',
    users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 20c.4-3.6 2.9-5.5 6-5.5s5.6 1.9 6 5.5"/><path d="M16 5.4a3.3 3.3 0 0 1 0 6.2"/><path d="M18 14.8c1.9.7 3.1 2.4 3.4 5.2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    tooth: '<path d="M12 5.2C13.2 4.2 14.4 3.7 15.8 3.7 18.1 3.7 20 5.5 20 8c0 2-.8 3.2-1.4 5-.6 2-.6 5-1.4 7.3-.3.9-1.4.8-1.7-.1-.5-1.4-.9-3.4-1.7-4.2-.5-.5-3.1-.5-3.6 0-.8.8-1.2 2.8-1.7 4.2-.3.9-1.4 1-1.7.1C6 18 6 15 5.4 13 4.8 11.2 4 10 4 8c0-2.5 1.9-4.3 4.2-4.3 1.4 0 2.6.5 3.8 1.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    play: '<path d="M6 4.5v15l13-7.5z"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6M16 9l6 6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
  };
  function icon(name, size = 20, fill = false) {
    return h('span', {
      class: 'icon', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`,
    });
  }

  const store = (kind) => ({
    get(k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window[kind].setItem(k, v); } catch (e) { /* ignore */ } },
  });
  const ls = store('localStorage');
  const ss = store('sessionStorage');

  const ui = {
    me: ls.get('familypoints.me'),
    board: 'week',
    filter: 'all',
    showDone: false,
    adminTab: 'approvals',
    unlocked: ss.get('familypoints.unlocked') === '1',
    edit: false, // מצב עריכה בעמוד המשימות (הורים בלבד)
  };

  /* ---------- מצב הורה ---------- */
  // בלי קוד הורים מוגדר אין הגנה (כמו אזור ההורים). עם קוד: צריך להזין אותו פעם אחת בכל ביקור.
  const canAdmin = () => !S.state.settings.pin || ui.unlocked;
  function unlock() { ui.unlocked = true; ss.set('familypoints.unlocked', '1'); }
  // שדה שם משתמש נסתר קבוע, כדי שהדפדפן לא יערבב את הקוד עם סיסמאות אחרות של chepti.com
  const hiddenUser = () => h('input', {
    type: 'text', name: 'username', autocomplete: 'username', value: 'familypoints', readonly: true, tabindex: '-1', style: { display: 'none' },
  });

  function requireParent(then) {
    if (canAdmin()) { then(); return; }
    const input = h('input', {
      type: 'password', inputmode: 'numeric', autocomplete: 'current-password', maxlength: '8',
      placeholder: '••••', 'aria-label': 'קוד הורים', class: 'pin-input',
    });
    const sh = sheet('קוד הורים', h('form', {
      onsubmit: (e) => {
        e.preventDefault();
        if (input.value === S.state.settings.pin) { unlock(); sh.close(); then(); }
        else { toast('קוד שגוי'); input.value = ''; input.focus(); }
      },
    },
    hiddenUser(), input,
    h('div', { class: 'sheet-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => sh.close() }, 'ביטול'),
      h('button', { class: 'btn primary', type: 'submit' }, 'כניסה'))));
    setTimeout(() => input.focus(), 60);
  }

  const fmt = (n) => String(S.roundPts(n));
  const plural = (n, one, many) => (n === 1 ? one : many);
  const letter = (name) => (name || '').trim().charAt(0) || '?';

  function avatar(m, size = 40) {
    const isLetter = !m.avatar;
    return h('span', {
      class: 'avatar' + (isLetter ? ' letter' : ''),
      style: { background: m.color, width: size + 'px', height: size + 'px', fontSize: Math.round(size * (isLetter ? 0.46 : 0.56)) + 'px' },
      'aria-hidden': 'true',
    }, m.avatar || letter(m.name));
  }

  function freqLabel(t) {
    if (t.period === 'once') return 'חד־פעמי';
    if (t.period === 'any') return 'לפי צורך';
    const unit = { day: 'ביום', week: 'בשבוע', month: 'בחודש', year: 'בשנה' }[t.period];
    return t.times === 1 ? `פעם ${unit}` : `${t.times} פעמים ${unit}`;
  }
  function resetLabel(t) {
    return { day: 'מתאפס מחר', week: 'מתאפס ביום ראשון', month: 'מתאפס ב-1 לחודש', year: 'מתאפס ב-1 בינואר', once: '' }[t.period];
  }

  function when(ts) {
    const d = new Date(ts);
    const days = (Date.now() - ts) / 86400000;
    try {
      return days < 6
        ? d.toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    } catch (e) {
      return d.toLocaleDateString();
    }
  }

  function toast(msg, action) {
    const el = h('div', { class: 'toast' + (action ? ' long' : '') },
      h('span', null, msg),
      action && h('button', { class: 'toast-act', type: 'button', onclick: () => { action.fn(); el.remove(); } }, action.label));
    document.getElementById('toasts').append(el);
    setTimeout(() => el.remove(), action ? 5600 : 3100);
  }

  function burst() {
    const colors = ['#ef6a4c', '#f2b134', '#1f9d8f', '#5a8dee', '#9b6bd3'];
    const wrap = h('div', { class: 'confetti' });
    for (let i = 0; i < 26; i++) {
      wrap.append(h('i', {
        style: {
          left: Math.random() * 100 + '%',
          background: colors[i % colors.length],
          animationDelay: Math.random() * 0.4 + 's',
          animationDuration: 1.5 + Math.random() * 1 + 's',
          transform: `rotate(${Math.random() * 360}deg)`,
        },
      }));
    }
    document.body.append(wrap);
    setTimeout(() => wrap.remove(), 3000);
  }

  /* חלונית קופצת. יציבות:
   * - נסגרת בלחיצה על הרקע רק אם גם הלחיצה התחילה על הרקע (גרירת בחירת טקסט שנגמרת מחוץ לחלונית לא סוגרת)
   * - Escape ולחיצה על הרקע משפיעים רק על החלונית העליונה (אישור מעל עורך לא סוגר את שניהם)
   * - opts.dirty(): אם יש שינויים שלא נשמרו, הרקע לא סוגר, ו-X/Escape מבקשים אישור
   * - opts.onDismiss(): נקרא כשהחלונית נסגרת בכל דרך (למשל כדי לשחרר הבטחה שמחכה לה) */
  const sheetStack = [];
  function sheet(title, content, opts = {}) {
    const overlay = h('div', { class: 'overlay' });
    const token = {};
    let downOnBackdrop = false;
    const isTop = () => sheetStack[sheetStack.length - 1] === token;

    function close() {
      if (!overlay.isConnected) return;
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      const i = sheetStack.indexOf(token);
      if (i >= 0) sheetStack.splice(i, 1);
      if (opts.onDismiss) opts.onDismiss();
    }
    async function attemptClose() {
      if (opts.dirty && opts.dirty()) {
        if (!(await askConfirm('לסגור בלי לשמור? מה שמילאתם יימחק.', 'כן, לסגור'))) return;
        if (opts.onDiscard) opts.onDiscard();
      }
      close();
    }
    const onKey = (e) => { if (e.key === 'Escape' && isTop()) attemptClose(); };

    overlay.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === overlay; });
    overlay.addEventListener('click', (e) => {
      const real = e.target === overlay && downOnBackdrop;
      downOnBackdrop = false;
      if (!real || !isTop()) return;
      if (opts.dirty && opts.dirty()) { // יש מה לאבד: לא סוגרים בטעות, רק רועדים
        const box = overlay.querySelector('.sheet');
        box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
        return;
      }
      close();
    });

    overlay.append(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' },
        h('h2', null, title),
        h('button', { class: 'x', type: 'button', 'aria-label': 'סגירה', onclick: attemptClose }, '✕')),
      content));
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    sheetStack.push(token);
    return { close, root: overlay };
  }

  function askConfirm(message, okLabel = 'כן, למחוק') {
    return new Promise((resolve) => {
      let sh;
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
      const done = (v) => { settle(v); sh.close(); };
      sh = sheet('בטוחים?', h('div', null,
        h('p', { style: { margin: '4px 0 0', fontSize: '17px' } }, message),
        h('div', { class: 'sheet-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => done(false) }, 'ביטול'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => done(true) }, okLabel))),
      { onDismiss: () => settle(false) });
    });
  }

  function pickAvatar(cb, name) {
    const sh = sheet('בחירת סמל', h('div', { class: 'emoji-grid' },
      h('button', { type: 'button', class: 'letter-opt', 'aria-label': 'אות ראשונה של השם', onclick: () => { sh.close(); cb(''); } }, letter(name)),
      AVATARS.map((a) => h('button', { type: 'button', onclick: () => { sh.close(); cb(a); } }, a))));
  }

  function empty(text) {
    return h('div', { class: 'empty' }, h('div', { html: Art.empty() }), text);
  }

  /* ---------- מסגרת ---------- */
  function setMe(id) {
    ui.me = id || null;
    ls.set('familypoints.me', id || '');
  }

  function pickMe() {
    const sh = sheet('מי אתם?', h('div', null,
      h('div', { class: 'pick-grid' }, S.state.members.map((m) =>
        h('button', {
          type: 'button', class: 'pick' + (ui.me === m.id ? ' on' : ''),
          onclick: () => { setMe(m.id); sh.close(); render(); },
        }, avatar(m, 44), h('span', null, m.name)))),
      h('p', { class: 'sheet-note', style: { color: 'var(--muted)', fontWeight: 400 } }, 'נזכור אותך במכשיר הזה, ומשימות יירשמו על שמך בלחיצה אחת.'),
      ui.me && h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { setMe(null); sh.close(); render(); } }, 'ניקוי בחירה'))));
  }

  const SYNC_LABEL = { ok: 'מסונכרן', connecting: 'מתחבר…', offline: 'אין חיבור', auth: 'קוד שגוי' };
  const Brush = BrushScreen.create({ h, S, avatar, icon, toast, burst, render: () => render(), me: () => ui.me });
  const SYNC_TEXT = {
    ok: 'מחוברים. שינויים מופיעים בכל המכשירים תוך כמה שניות.',
    connecting: 'מתחבר…',
    offline: 'אין חיבור לשרת כרגע. שינויים יישלחו כשהחיבור יחזור.',
    auth: 'הקוד שגוי או הוחלף. נתקו והתחברו מחדש.',
  };
  function syncChip() {
    if (!Sync.enabled) return null;
    const st = SYNC_LABEL[Sync.status] ? Sync.status : 'connecting';
    const waiting = S.pendingCount();
    const label = st === 'offline' && waiting > 0 ? `${SYNC_LABEL[st]} · ${waiting} ממתינים` : SYNC_LABEL[st];
    return h('button', {
      class: 'sync-chip', type: 'button',
      title: st === 'offline' ? 'עובדים בלי רשת. השינויים נשמרים כאן ויישלחו כשהחיבור יחזור' : 'מצב סנכרון בין המכשירים',
      onclick: () => { Sync.syncNow(); },
    }, h('span', { class: 'dot ' + st }), label);
  }

  function tabLink(href, ico, label, key, active, badge) {
    return h('a', { href, class: 'tab' + (active === key ? ' on' : ''), 'aria-current': active === key ? 'page' : null },
      icon(ico, 24), h('span', null, label),
      badge > 0 && h('i', { class: 'badge' }, badge));
  }

  function shell(view, active) {
    const me = S.member(ui.me);
    return h('div', { class: 'shell' },
      h('header', { class: 'top' },
        h('a', { class: 'brand', href: '#/' }, icon('star', 22, true), 'נקודות משפחה'),
        h('div', { class: 'top-left' },
          syncChip(),
          h('button', { class: 'me-btn' + (me ? '' : ' unset'), type: 'button', onclick: pickMe },
            me ? [avatar(me, 30), me.name] : 'מי אני?'))),
      !S.persistent && h('div', { class: 'warn' }, 'הדפדפן חוסם שמירה של נתונים (גלישה בסתר?). שינויים יימחקו ברענון.'),
      Sync.status === 'auth' && h('div', { class: 'warn' },
        'קוד המשפחה לא תקין (אולי הוחלף). היכנסו להורים ← הגדרות ← סנכרון והתחברו מחדש.'),
      h('main', { class: 'view', 'data-tab': active }, view),
      h('footer', { class: 'site-foot' },
        h('a', { href: 'https://chepti.com', target: '_blank', rel: 'noopener' }, 'חולמים תקשוב'),
        h('a', {
          class: 'feedback', href: 'mailto:chepti@gmail.com?subject=' + encodeURIComponent('משוב על נקודות משפחה'),
          title: 'שלחו לנו מייל עם רעיון או תקלה',
        }, icon('mail', 15), 'משוב')),
      h('nav', { class: 'tabbar', 'aria-label': 'ניווט ראשי' },
        tabLink('#/', 'home', 'בית', 'home', active),
        tabLink('#/tasks', 'check', 'משימות', 'tasks', active),
        tabLink('#/brush', 'tooth', 'צחצוח', 'brush', active),
        tabLink('#/admin', 'shield', 'הורים', 'admin', active, S.pending().length)));
  }

  /* ---------- סימון משימה כבוצעה ---------- */
  // מי מבצע: מי שהעמוד שייך לו (עמוד אישי), אחרת הדמות שנבחרה במכשיר
  function actor(preselect) {
    const id = preselect && preselect.length ? preselect[0] : ui.me;
    return S.member(id) ? id : null;
  }

  function completeNow(t, ids) {
    const c = S.addCompletion(t.id, ids);
    if (!c) return;
    burst();
    toast(c.status === 'pending' ? 'נשלח לאישור ההורים' : `נוספו ${fmt(c.pointsEach)} נקודות`,
      { label: 'ביטול', fn: () => S.removeCompletion(c.id) });
  }

  // אין דמות שנבחרה: שואלים פעם אחת, זוכרים, ורושמים
  function askWho(t) {
    const sh = sheet('מי אתם?', h('div', null,
      h('div', { class: 'pick-grid' }, S.state.members.map((m) =>
        h('button', {
          type: 'button', class: 'pick',
          onclick: () => { setMe(m.id); sh.close(); completeNow(t, [m.id]); },
        }, avatar(m, 44), h('span', null, m.name)))),
      h('p', { class: 'sheet-note', style: { color: 'var(--muted)', fontWeight: 400 } }, 'נזכור אותך במכשיר הזה, ובפעם הבאה זה יירשם בלחיצה אחת.')));
  }

  // עבודה משותפת: בוחרים עם מי, והניקוד מתחלק
  function openComplete(t, preselect) {
    const members = S.state.members;
    const initial = (preselect && preselect.length ? preselect : [ui.me]).filter((id) => S.member(id));
    const sel = new Set(initial);
    const info = h('div', { class: 'sheet-note' });
    const grid = h('div', { class: 'pick-grid' });
    const ok = h('button', {
      class: 'btn good', type: 'button',
      onclick: () => { sh.close(); completeNow(t, [...sel]); },
    }, 'סיימנו');

    function paint() {
      grid.replaceChildren(...members.map((m) => h('button', {
        type: 'button', class: 'pick' + (sel.has(m.id) ? ' on' : ''),
        onclick: () => { sel.has(m.id) ? sel.delete(m.id) : sel.add(m.id); paint(); },
      }, avatar(m, 44), h('span', null, m.name))));
      ok.disabled = sel.size === 0;
      info.textContent = sel.size === 0 ? 'בחרו מי עבד על המשימה'
        : sel.size === 1 ? `יתווספו ${fmt(t.points)} נקודות`
          : `${sel.size} עובדים יחד, ${fmt(S.roundPts(t.points / sel.size))} נקודות לכל אחד`;
    }

    const sh = sheet(`${t.emoji} ${t.title}`, h('div', null,
      h('div', { class: 'label', style: { textAlign: 'center' } }, 'מי עבד על זה ביחד?'),
      info, grid,
      h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => sh.close() }, 'ביטול'), ok)));
    paint();
  }

  /* ---------- כרטיס משימה ---------- */
  function taskCard(t, preselect, editing = false) {
    const st = S.taskStatus(t);
    const assignees = t.assignees.map(S.member).filter(Boolean);
    const who = actor(preselect);
    return h('div', {
      class: 'task' + (st.done ? ' done' : '') + (editing ? ' editing' : ''),
      onclick: editing ? () => openTaskEditor(t) : null,
    },
      h('div', { class: 'task-emoji', 'aria-hidden': 'true' }, t.emoji),
      h('div', { class: 'task-main' },
        h('div', { class: 'task-title' }, t.title),
        h('div', { class: 'task-meta' },
          h('span', { class: 'pill' }, freqLabel(t)),
          t.team && h('span', { class: 'pill team' }, icon('users', 13), 'אפשר ביחד'),
          t.period !== 'once' && t.period !== 'any' && st.times > 1 && h('span', { class: 'pill' }, `${st.count}/${st.times}`),
          t.period === 'any' && st.count > 0 && h('span', { class: 'pill' }, `${st.count} החודש`),
          t.period === 'any' && st.pending > 0 && h('span', { class: 'pill' }, `${st.pending} ממתינים לאישור`)),
        assignees.length > 0 && h('div', { class: 'task-who' }, 'מיועד ל:', assignees.map((m) => avatar(m, 22)))),
      h('div', { class: 'task-side' },
        h('div', { class: 'pts' }, icon('star', 14, true), fmt(t.points)),
        editing
          ? h('button', {
            class: 'btn small', type: 'button', onclick: (e) => { e.stopPropagation(); openTaskEditor(t); },
          }, icon('pencil', 16), 'עריכה')
          : st.done
          ? h('div', { class: 'done-note' }, icon('check', 14), st.pending ? ' ממתין לאישור' : ' בוצע', resetLabel(t) ? ' · ' + resetLabel(t) : '')
          : h('div', { class: 'task-actions' },
            t.team && h('button', {
              class: 'btn small ghost', type: 'button', title: 'עבדנו על זה ביחד', 'aria-label': 'ביחד',
              onclick: () => openComplete(t, who ? [who] : []),
            }, icon('users', 16), h('span', { class: 'lbl' }, 'ביחד')),
            h('button', {
              class: 'btn go', type: 'button',
              onclick: () => { if (who) completeNow(t, [who]); else askWho(t); },
            }, 'סיימתי'))));
  }

  /* ---------- בית ---------- */
  function homeView() {
    const rows = S.state.members
      .map((m) => ({ m, pts: S.pointsFor(m.id, ui.board) }))
      .sort((a, b) => b.pts - a.pts);
    const max = Math.max(1, ...rows.map((r) => r.pts));
    const total = S.roundPts(rows.reduce((s, r) => s + r.pts, 0));
    const open = S.state.tasks.filter((t) => t.period !== 'any' && !S.taskStatus(t).done).length; // "לפי צורך" תמיד פתוחה, לא סופרים
    const pend = S.pending().length;

    // בטאבלט רחב: ימין = ציור וסיכום, שמאל = טבלת המובילים (ראו .home-grid ב-CSS)
    return h('div', { class: 'home-grid' },
      h('div', { class: 'home-side' },
        h('div', { class: 'hero', html: Art.hero() }),
        h('div', { class: 'summary' },
          h('div', { class: 'stat' }, h('b', null, fmt(total)), h('span', null, 'נקודות למשפחה ' + BOARDS[ui.board])),
          h('div', { class: 'stat' }, h('b', null, open), h('span', null, plural(open, 'משימה פתוחה', 'משימות פתוחות'))),
          h('div', { class: 'stat' }, h('b', null, pend), h('span', null, 'מחכות לאישור')))),
      h('div', { class: 'home-main' },
        h('div', { class: 'section-title' }, 'מי מוביל'),
        h('div', { class: 'seg', role: 'tablist' }, Object.entries(BOARDS).map(([k, label]) =>
          h('button', { type: 'button', class: ui.board === k ? 'on' : '', onclick: () => { ui.board = k; render(); } }, label))),
        rows.length
          ? h('ol', { class: 'board' }, rows.map((r) => {
            const rank = rows.findIndex((x) => x.pts === r.pts);
            return h('li', null, h('a', { class: 'row', href: '#/m/' + r.m.id },
              h('span', { class: 'rank' + (r.pts > 0 && rank < 3 ? ' r' + (rank + 1) : '') }, rank + 1),
              avatar(r.m, 44),
              h('div', { class: 'info' }, h('div', { class: 'name' }, r.m.name),
                h('div', { class: 'bar' }, h('i', { style: { width: (r.pts / max) * 100 + '%', background: r.m.color } }))),
              h('div', { class: 'score' }, fmt(r.pts), h('small', null, 'נקודות'))));
          }))
          : empty('עוד אין בני משפחה. מוסיפים אותם במסך ההורים.')));
  }

  /* ---------- משימות ---------- */
  function toggleEdit() {
    if (ui.edit) { ui.edit = false; render(); return; }
    requireParent(() => { ui.edit = true; render(); });
  }

  function tasksView() {
    const editing = ui.edit && canAdmin();
    const filters = { all: 'הכל', ...PERIODS };
    const list = S.state.tasks.filter((t) => ui.filter === 'all' || t.period === ui.filter);
    const withStatus = list.map((t) => ({ t, st: S.taskStatus(t) }));
    // במצב עריכה רואים את כל המשימות (גם שהושלמו), כדי שאפשר יהיה לערוך כל אחת
    const openOnes = withStatus.filter((x) => editing || !x.st.done).sort((a, b) => b.t.points - a.t.points);
    const doneOnes = editing ? [] : withStatus.filter((x) => x.st.done);
    const card = (x) => taskCard(x.t, undefined, editing);

    // ב"הכל" מקבצים לפי תדירות (יומי, שבועי, חודשי, חד־פעמי), ובתוך כל קבוצה הכי שווה למעלה
    const openList = () => {
      if (ui.filter !== 'all') return h('div', { class: 'tasklist' }, openOnes.map(card));
      return Object.entries(PERIODS).map(([period, label]) => {
        const items = openOnes.filter((x) => x.t.period === period);
        return items.length > 0 && h('section', { class: 'task-group' },
          h('div', { class: 'group-title' }, label, h('small', null, items.length)),
          h('div', { class: 'tasklist' }, items.map(card)));
      });
    };

    return [
      h('div', { class: 'page-head' },
        h('div', { class: 'section-title' }, 'המשימות של הבית'),
        h('div', { class: 'head-actions' },
          editing && h('button', { class: 'btn small primary', type: 'button', onclick: () => openTaskEditor() }, icon('plus', 18), 'משימה חדשה'),
          editing && h('button', { class: 'btn small', type: 'button', onclick: () => openBonus() }, icon('star', 16), 'הוספת נקודות'),
          h('button', {
            class: 'btn small' + (editing ? ' on' : ''), type: 'button', 'aria-pressed': editing ? 'true' : 'false',
            title: editing ? 'חזרה לתצוגה רגילה' : 'מצב עריכה להורים', onclick: toggleEdit,
          }, icon(editing ? 'check' : 'pencil', 16), editing ? 'סיום עריכה' : 'עריכה'))),
      h('div', { class: 'chips' }, Object.entries(filters).map(([k, label]) =>
        h('button', { type: 'button', class: 'chip' + (ui.filter === k ? ' on' : ''), onclick: () => { ui.filter = k; render(); } }, label))),
      openOnes.length
        ? openList()
        : empty(S.state.tasks.length ? 'אין משימות פתוחות כאן. הכל נעשה.' : 'עוד אין משימות. הורים מוסיפים אותן במצב עריכה.'),
      doneOnes.length > 0 && h('label', { class: 'check', style: { margin: '16px 4px' } },
        h('input', { type: 'checkbox', checked: ui.showDone, onchange: (e) => { ui.showDone = e.target.checked; render(); } }),
        `הצג גם ${doneOnes.length} ${plural(doneOnes.length, 'משימה שהושלמה', 'משימות שהושלמו')}`),
      ui.showDone && doneOnes.length > 0 && h('div', { class: 'tasklist' }, doneOnes.map(card)),
    ];
  }

  /* ---------- עמוד אישי ---------- */
  // נקודות ידניות מההורים אין להן סמל משימה: מציגים כוכב
  const compIcon = (c) => (c.emoji ? c.emoji : h('span', { class: 'bonus-ico' }, icon('star', 22, true)));
  function histRow(c, extra) {
    return h('div', { class: 'hist' + (c.status === 'pending' ? ' pending' : '') },
      h('span', { class: 'e' }, compIcon(c)),
      h('div', { class: 't' }, c.title,
        h('small', null, `${when(c.ts)}${c.members.length > 1 ? ' · ביחד עם ' + (c.members.length - 1) : ''}`)),
      h('b', { dir: 'ltr' }, '+' + fmt(c.pointsEach)), extra);
  }

  function personalView(m) {
    const ranking = S.state.members.map((x) => S.pointsFor(x.id, 'week')).sort((a, b) => b - a);
    const rank = ranking.indexOf(S.pointsFor(m.id, 'week')) + 1;
    const mine = S.state.tasks.filter((t) => t.assignees.includes(m.id) && !S.taskStatus(t).done);
    const shared = S.state.tasks.filter((t) => !t.assignees.length && !S.taskStatus(t).done);
    const mineDone = S.state.tasks.filter((t) => t.assignees.includes(m.id) && S.taskStatus(t).done);
    const myComps = S.state.completions.filter((c) => c.members.includes(m.id)).sort((a, b) => b.ts - a.ts);
    const pending = myComps.filter((c) => c.status === 'pending');
    const approved = myComps.filter((c) => c.status === 'approved').slice(0, 8);
    const pre = [m.id];

    const side = h('div', { class: 'profile', style: { background: `linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 70%, #232a3b))` } },
      avatar(m, 84),
      h('h1', null, m.name),
      h('div', { class: 'sub' }, `${m.role === 'parent' ? 'הורה' : 'ילד/ה'} · מקום ${rank} מתוך ${S.state.members.length} השבוע`),
      h('div', { class: 'tiles' },
        h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'week'))), h('span', null, 'השבוע')),
        h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'month'))), h('span', null, 'החודש')),
        h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'all'))), h('span', null, 'סה״כ'))),
      // רק להורה שהזין את הקוד בביקור הזה
      ui.unlocked && h('button', { class: 'btn small bonus-btn', type: 'button', onclick: () => openBonus(m.id) }, icon('star', 16), 'הוספת נקודות'));

    const main = [
      h('div', { class: 'section-title' }, 'המשימות שלי', h('small', null, mine.length)),
      mine.length ? h('div', { class: 'tasklist' }, mine.map((t) => taskCard(t, pre)))
        : h('div', { class: 'empty' }, mineDone.length ? 'סיימת את כל המשימות שלך.' : 'אין משימות שהוקצו אליך. אפשר לבחור מהפתוחות לכולם.'),

      h('div', { class: 'section-title' }, 'פתוחות לכולם', h('small', null, shared.length)),
      shared.length ? h('div', { class: 'tasklist' }, shared.map((t) => taskCard(t, pre))) : h('div', { class: 'empty' }, 'הכל נעשה.'),

      pending.length > 0 && [
        h('div', { class: 'section-title' }, 'מחכה לאישור'),
        h('div', { class: 'history' }, pending.map((c) => histRow(c,
          h('button', { class: 'btn small', type: 'button', onclick: () => S.removeCompletion(c.id) }, 'ביטול')))),
      ],
      approved.length > 0 && [
        h('div', { class: 'section-title' }, 'פעילות אחרונה'),
        h('div', { class: 'history' }, approved.map((c) => histRow(c))),
      ],
    ];

    return [
      h('a', { class: 'back', href: '#/' }, '→ חזרה'),
      h('div', { class: 'pv-grid' }, h('div', { class: 'pv-side' }, side), h('div', { class: 'pv-main' }, main)),
    ];
  }

  /* ---------- עורכים ---------- */
  // טיוטת משימה חדשה נשמרת תוך כדי כתיבה, כדי שרענון או סגירה בטעות לא ימחקו את מה שהוקלד
  const DRAFT_KEY = 'familypoints.draft.task';
  const blankTask = () => ({ id: S.uid(), title: '', emoji: '🧹', points: 5, period: 'week', times: 1, assignees: [], team: false });
  function loadDraft() {
    try {
      const x = JSON.parse(ls.get(DRAFT_KEY) || 'null');
      if (x && x.d && Date.now() - x.ts < 2 * 3600 * 1000) return x.d;
    } catch (e) { /* אין טיוטה */ }
    return null;
  }
  const saveDraft = (d) => ls.set(DRAFT_KEY, JSON.stringify({ ts: Date.now(), d }));
  const clearDraft = () => ls.set(DRAFT_KEY, '');

  // הוספת נקודות ידנית לילד/ה (בונוס, מאושר מיד). קוראים לה רק אחרי requireParent / מתוך אזור ההורים
  function openBonus(preId) {
    const members = S.state.members;
    const sel = { id: S.member(preId) ? preId : null, pts: 5, reason: '' };
    const chips = h('div', { class: 'chips' });
    const note = h('div', { class: 'sheet-note' });
    const pointsInput = h('input', {
      type: 'number', min: '1', max: '500', step: '1', value: sel.pts, 'aria-label': 'כמה נקודות',
      oninput: (e) => { sel.pts = Number(e.target.value); paint(); },
    });
    const quick = h('div', { class: 'chips' });
    const ok = h('button', {
      class: 'btn primary', type: 'button',
      onclick: () => {
        const c = S.addBonus(sel.id, sel.pts, sel.reason);
        if (!c) return;
        sh.close();
        burst();
        toast(`נוספו ${fmt(c.pointsEach)} נקודות ל${S.member(sel.id).name}`, { label: 'ביטול', fn: () => S.removeCompletion(c.id) });
      },
    }, 'הוספה');

    function paint() {
      chips.replaceChildren(...members.map((m) => h('button', {
        type: 'button', class: 'chip avatar-chip' + (sel.id === m.id ? ' on' : ''),
        onclick: () => { sel.id = m.id; paint(); },
      }, avatar(m, 28), m.name)));
      quick.replaceChildren(...[1, 5, 10, 20].map((n) => h('button', {
        type: 'button', class: 'chip' + (sel.pts === n ? ' on' : ''),
        onclick: () => { sel.pts = n; pointsInput.value = n; paint(); },
      }, '+' + n)));
      const valid = !!sel.id && sel.pts > 0 && sel.pts <= 500;
      ok.disabled = !valid;
      note.textContent = !sel.id ? 'בחרו למי להוסיף' : !(sel.pts > 0) ? 'הכניסו מספר נקודות'
        : `${S.member(sel.id).name} יקבל/תקבל ${fmt(sel.pts)} נקודות מיד`;
    }

    const sh = sheet('הוספת נקודות', h('div', null,
      h('div', { class: 'field' }, h('label', null, 'למי?'), chips),
      h('div', { class: 'field' }, h('label', null, 'כמה נקודות?'),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'פחות', onclick: () => { sel.pts = Math.max(1, (Number(sel.pts) || 1) - 1); pointsInput.value = sel.pts; paint(); } }, '−'),
          pointsInput,
          h('button', { type: 'button', 'aria-label': 'יותר', onclick: () => { sel.pts = (Number(sel.pts) || 0) + 1; pointsInput.value = sel.pts; paint(); } }, '+')),
        quick),
      h('div', { class: 'field' }, h('label', null, 'על מה?'),
        h('input', { type: 'text', maxlength: '40', placeholder: 'לא חובה, למשל: עזרה מיוחדת', oninput: (e) => { sel.reason = e.target.value; } })),
      note,
      h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => sh.close() }, 'ביטול'), ok)));
    paint();
  }

  function openTaskEditor(existing) {
    const draft = existing ? null : loadDraft();
    const d = existing ? JSON.parse(JSON.stringify(existing)) : (draft || blankTask());
    const sameShape = (x) => JSON.stringify({ ...x, id: '' });
    const baseline = sameShape(existing || blankTask());
    const isDirty = () => sameShape(d) !== baseline;
    if (draft) toast('שחזרנו טיוטה שלא נשמרה');

    const emojiGrid = h('div', { class: 'emoji-grid' });
    const whoChips = h('div', { class: 'chips' });
    const timesField = h('div', { class: 'field' });
    const pointsInput = h('input', { type: 'number', min: '1', max: '500', step: '1', value: d.points,
      oninput: (e) => { d.points = Number(e.target.value); } });
    const timesInput = h('input', { type: 'number', min: '1', max: '20', step: '1', value: d.times,
      oninput: (e) => { d.times = Number(e.target.value); } });
    timesField.append(h('label', null, 'כמה פעמים בתקופה?'), timesInput,
      h('small', null, 'למשל קיפול כביסה 3 פעמים בשבוע'));

    function paint() {
      emojiGrid.replaceChildren(...TASK_EMOJIS.map((e) => h('button', {
        type: 'button', class: d.emoji === e ? 'on' : '', 'aria-label': e,
        onclick: () => { d.emoji = e; paint(); },
      }, e)));
      whoChips.replaceChildren(...S.state.members.map((m) => h('button', {
        type: 'button', class: 'chip avatar-chip' + (d.assignees.includes(m.id) ? ' on' : ''),
        onclick: () => {
          d.assignees = d.assignees.includes(m.id) ? d.assignees.filter((x) => x !== m.id) : [...d.assignees, m.id];
          paint();
        },
      }, avatar(m, 28), m.name)));
      timesField.style.display = d.period === 'once' || d.period === 'any' ? 'none' : '';
    }

    const body = h('div', null,
      h('div', { class: 'field' }, h('label', null, 'שם המשימה'),
        h('input', { type: 'text', maxlength: '40', value: d.title, placeholder: 'למשל: ניקוי המקרר', oninput: (e) => { d.title = e.target.value; } })),
      h('div', { class: 'field' }, h('label', null, 'סמל'), emojiGrid),
      h('div', { class: 'field' }, h('label', null, 'ניקוד'),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'פחות', onclick: () => { d.points = Math.max(1, (Number(d.points) || 1) - 1); pointsInput.value = d.points; } }, '−'),
          pointsInput,
          h('button', { type: 'button', 'aria-label': 'יותר', onclick: () => { d.points = (Number(d.points) || 0) + 1; pointsInput.value = d.points; } }, '+'))),
      h('div', { class: 'field' }, h('label', null, 'תדירות'),
        h('select', { onchange: (e) => { d.period = e.target.value; paint(); } },
          Object.entries(PERIODS).map(([k, v]) => h('option', { value: k, selected: d.period === k }, v)))),
      timesField,
      h('div', { class: 'field' }, h('label', null, 'למי המשימה?'), whoChips,
        h('small', null, 'בלי בחירה = פתוחה לכולם')),
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: d.team, onchange: (e) => { d.team = e.target.checked; } }),
        'אפשר לעשות ביחד (הניקוד מתחלק)'),
      h('div', { class: 'sheet-actions' },
        existing && h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (await askConfirm(`למחוק את "${existing.title}"? ההיסטוריה של הנקודות נשמרת.`)) { S.deleteTask(existing.id); sh.close(); }
          },
        }, 'מחיקה'),
        h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => {
            d.title = d.title.trim();
            d.points = Number(d.points);
            d.times = Math.max(1, Math.round(Number(d.times) || 1));
            if (!d.title) return toast('חסר שם למשימה');
            if (!(d.points > 0)) return toast('הניקוד צריך להיות גדול מ-0');
            S.upsertTask(d);
            clearDraft();
            sh.close();
          },
        }, 'שמירה')));
    const sh = sheet(existing ? 'עריכת משימה' : 'משימה חדשה', body, { dirty: isDirty, onDiscard: clearDraft });
    if (!existing) {
      // לא שומרים טיוטה אחרי שהחלונית נסגרה (הלחיצה על "שמירה" מגיעה גם למאזין הזה)
      const keep = () => { if (sh.root.isConnected && isDirty()) saveDraft(d); };
      body.addEventListener('input', keep);
      body.addEventListener('click', () => setTimeout(keep, 0));
    }
    paint();
  }

  function openMemberEditor(existing) {
    const idx = S.state.members.length;
    const d = existing ? { ...existing }
      : { id: S.uid(), name: '', role: 'kid', avatar: '', color: COLORS[idx % COLORS.length] };
    const memberBase = JSON.stringify(d);
    const avatarGrid = h('div', { class: 'emoji-grid' });
    const colorRow = h('div', { class: 'chips' });
    function paint() {
      avatarGrid.replaceChildren(
        h('button', { type: 'button', class: 'letter-opt' + (!d.avatar ? ' on' : ''), 'aria-label': 'אות ראשונה של השם', onclick: () => { d.avatar = ''; paint(); } }, letter(d.name)),
        ...AVATARS.map((a) => h('button', {
          type: 'button', class: d.avatar === a ? 'on' : '', onclick: () => { d.avatar = a; paint(); } }, a)));
      colorRow.replaceChildren(...COLORS.map((c) => h('button', {
        type: 'button', 'aria-label': 'צבע', class: 'avatar',
        style: { background: c, width: '38px', height: '38px', border: d.color === c ? '4px solid #232a3b' : '4px solid #fff', cursor: 'pointer' },
        onclick: () => { d.color = c; paint(); } })));
    }
    const sh = sheet(existing ? 'עריכת בן משפחה' : 'בן משפחה חדש', h('div', null,
      h('div', { class: 'field' }, h('label', null, 'שם'),
        h('input', { type: 'text', maxlength: '20', value: d.name, oninput: (e) => { d.name = e.target.value; } })),
      h('div', { class: 'field' }, h('label', null, 'תפקיד'),
        h('select', { onchange: (e) => { d.role = e.target.value; } },
          h('option', { value: 'kid', selected: d.role === 'kid' }, 'ילד/ה'),
          h('option', { value: 'parent', selected: d.role === 'parent' }, 'הורה'))),
      h('div', { class: 'field' }, h('label', null, 'סמל'), avatarGrid),
      h('div', { class: 'field' }, h('label', null, 'צבע'), colorRow),
      h('div', { class: 'sheet-actions' },
        existing && h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (await askConfirm(`להסיר את ${existing.name} מהמשפחה?`, 'כן, להסיר')) { S.deleteMember(existing.id); sh.close(); }
          },
        }, 'הסרה'),
        h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => {
            d.name = d.name.trim();
            if (!d.name) return toast('חסר שם');
            S.upsertMember(d);
            sh.close();
          },
        }, 'שמירה'))),
    { dirty: () => JSON.stringify(d) !== memberBase });
    paint();
  }

  /* ---------- ניהול (הורים) ---------- */
  function pinGate() {
    const input = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'current-password', placeholder: '••••', 'aria-label': 'קוד הורים' });
    return h('div', { class: 'gate' },
      h('div', { class: 'lock' }, icon('lock', 44)),
      h('h2', null, 'אזור להורים'),
      h('p', { style: { color: 'var(--muted)' } }, 'הכניסו את הקוד כדי להמשיך'),
      h('form', {
        onsubmit: (e) => {
          e.preventDefault();
          if (input.value === S.state.settings.pin) {
            unlock(); render();
          } else { toast('קוד שגוי'); input.value = ''; }
        },
      }, hiddenUser(), input, h('button', { class: 'btn primary', type: 'submit' }, 'כניסה')));
  }

  function approvalsTab() {
    const pend = S.pending().sort((a, b) => a.ts - b.ts);
    const names = (c) => c.members.map((id) => (S.member(id) || { name: '?' }).name).join(', ');
    const recent = S.state.completions.filter((c) => c.status === 'approved').sort((a, b) => b.ts - a.ts).slice(0, 12);
    return [
      h('div', { class: 'card' },
        h('h3', null, `מחכות לאישור (${pend.length})`),
        pend.length
          ? [pend.map((c) => h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '26px' } }, compIcon(c)),
            h('div', { class: 'grow' }, c.title, h('small', null, `${names(c)} · ${when(c.ts)} · ${fmt(c.pointsEach)} נק׳ לכל אחד`)),
            h('button', { class: 'btn good small', type: 'button', onclick: () => S.setCompletionStatus(c.id, 'approved') }, 'אשר'),
            h('button', { class: 'btn danger small', type: 'button', onclick: () => S.removeCompletion(c.id) }, 'דחה'))),
          pend.length > 1 && h('div', { class: 'actions', style: { marginTop: '10px' } },
            h('button', { class: 'btn good block', type: 'button', onclick: () => { pend.forEach((c) => S.setCompletionStatus(c.id, 'approved')); toast('הכל אושר'); } }, 'אשר הכל'))]
          : empty('אין מה לאשר')),
      h('div', { class: 'card' },
        h('h3', null, 'אושרו לאחרונה'),
        recent.length
          ? recent.map((c) => h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '24px' } }, compIcon(c)),
            h('div', { class: 'grow' }, c.title, h('small', null, `${names(c)} · ${when(c.ts)} · ${fmt(c.pointsEach)} נק׳`)),
            h('button', {
              class: 'btn danger small', type: 'button',
              onclick: async () => { if (await askConfirm('למחוק את הדיווח הזה? הנקודות יורדו.')) S.removeCompletion(c.id); },
            }, 'מחיקה')))
          : h('p', null, 'עוד לא אושר כלום.')),
    ];
  }

  function tasksTab() {
    return [
      h('div', { class: 'actions', style: { marginBottom: '12px' } },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openTaskEditor() }, icon('plus', 18), 'משימה חדשה'),
        h('button', { class: 'btn', type: 'button', onclick: () => { S.addSampleTasks(); toast('נוספו משימות לדוגמה'); } }, 'הוסף משימות לדוגמה')),
      h('div', { class: 'card' }, S.state.tasks.length
        ? S.state.tasks.map((t) => {
          const who = t.assignees.map(S.member).filter(Boolean).map((m) => m.name).join(', ') || 'כולם';
          return h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '26px' } }, t.emoji),
            h('div', { class: 'grow' }, t.title, h('small', null, `${fmt(t.points)} נק׳ · ${freqLabel(t)} · ${who}${t.team ? ' · ביחד' : ''}`)),
            h('button', { class: 'btn small', type: 'button', onclick: () => openTaskEditor(t) }, 'עריכה'));
        })
        : empty('עוד אין משימות')),
    ];
  }

  function familyTab() {
    return [
      h('div', { class: 'actions', style: { marginBottom: '12px' } },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openMemberEditor() }, icon('plus', 18), 'בן משפחה')),
      h('div', { class: 'card' }, S.state.members.map((m) =>
        h('div', { class: 'list-row' }, avatar(m, 42),
          h('div', { class: 'grow' }, m.name, h('small', null, `${m.role === 'parent' ? 'הורה' : 'ילד/ה'} · ${fmt(S.pointsFor(m.id, 'all'))} נק׳ סה״כ`)),
          h('button', { class: 'btn small', type: 'button', title: 'הוספת נקודות', 'aria-label': 'הוספת נקודות', onclick: () => openBonus(m.id) },
            icon('star', 16), h('span', { class: 'lbl' }, 'הוספת נקודות')),
          h('button', { class: 'btn small', type: 'button', onclick: () => openMemberEditor(m) }, 'עריכה')))),
    ];
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function settingsTab() {
    const st = S.state.settings;
    const pinInput = h('input', { type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: st.pin ? 'קוד חדש' : 'לפחות 4 ספרות', autocomplete: 'off' });
    const codeInput = h('input', { type: 'password', autocomplete: 'off', placeholder: 'קוד המשפחה', 'aria-label': 'קוד המשפחה' });
    const syncCard = !Sync.available
      ? h('div', { class: 'card' }, h('h3', null, 'סנכרון בין מכשירים'),
        h('p', null, 'הסנכרון לא זמין בכתובת הזו (השרת לא מוגדר). הנתונים נשמרים במכשיר הזה בלבד.'))
      : Sync.enabled
        ? h('div', { class: 'card' }, h('h3', null, 'סנכרון בין מכשירים'),
          h('p', null, SYNC_TEXT[Sync.status] || SYNC_TEXT.connecting),
          h('div', { class: 'actions' },
            h('button', { class: 'btn', type: 'button', onclick: () => Sync.syncNow() }, 'סנכרן עכשיו'),
            h('button', {
              class: 'btn danger', type: 'button',
              onclick: async () => {
                if (await askConfirm('לנתק את המכשיר הזה מהסנכרון? הנתונים יישארו כאן, אבל ייפסקו עדכונים.', 'כן, לנתק')) Sync.disconnect();
              },
            }, 'ניתוק')))
        : h('div', { class: 'card' }, h('h3', null, 'סנכרון בין מכשירים'),
          h('p', null, 'הכניסו את קוד המשפחה כדי שכל המכשירים יראו אותם נתונים.'),
          h('div', { class: 'field' }, codeInput),
          h('button', {
            class: 'btn primary', type: 'button',
            onclick: () => connectWith(codeInput.value),
          }, 'התחברות'));
    const fileInput = h('input', {
      type: 'file', accept: 'application/json,.json', style: { display: 'none' },
      onchange: (e) => {
        const f = e.target.files[0];
        if (!f) return;
        f.text().then((txt) => { S.importJSON(txt); toast('הגיבוי נטען'); })
          .catch((err) => toast('שגיאה: ' + err.message));
      },
    });
    return [
      h('div', { class: 'card' }, h('h3', null, 'אישור הורים'),
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: st.requireApproval, onchange: (e) => S.setSettings({ requireApproval: e.target.checked }) }),
          'דיווחים של ילדים מחכים לאישור'),
        h('p', null, 'כשזה כבוי הנקודות נכנסות מיד. דיווחים של הורים תמיד נכנסים מיד.')),
      h('div', { class: 'card' }, h('h3', null, 'קוד הורים'),
        h('p', null, 'קוד קטן שמגן על אזור ההורים מילדים סקרנים. זו לא אבטחה אמיתית.'),
        h('div', { class: 'field' }, pinInput),
        h('div', { class: 'actions' },
          h('button', {
            class: 'btn primary', type: 'button',
            onclick: () => {
              if (!/^\d{4,8}$/.test(pinInput.value)) return toast('הקוד צריך להיות 4 עד 8 ספרות');
              S.setSettings({ pin: pinInput.value });
              ui.unlocked = true; ss.set('familypoints.unlocked', '1'); toast('הקוד נשמר');
            },
          }, 'שמירת קוד'),
          st.pin && h('button', { class: 'btn', type: 'button', onclick: () => S.setSettings({ pin: '' }) }, 'הסרת קוד'))),
      syncCard,
      h('div', { class: 'card' }, h('h3', null, 'גיבוי'),
        h('p', null, Sync.enabled
          ? 'הנתונים מסונכרנים לשרת. גיבוי לקובץ הוא רשת ביטחון נוספת. טעינת גיבוי מחליפה את הנתונים אצל כל המשפחה.'
          : 'הנתונים נשמרים בדפדפן של המכשיר הזה בלבד. מומלץ לגבות מדי פעם.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => download(`family-points-${new Date().toISOString().slice(0, 10)}.json`, S.exportJSON()) }, 'הורדת גיבוי'),
          h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'טעינת גיבוי'), fileInput)),
      h('div', { class: 'card' }, h('h3', null, 'איפוס'),
        h('p', null, Sync.enabled
          ? 'מוחק את כל המשפחה, המשימות והניקוד, בכל המכשירים!'
          : 'מוחק את כל המשפחה, המשימות והניקוד.'),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (await askConfirm(Sync.enabled ? 'למחוק הכל אצל כל המשפחה ולהתחיל מחדש?' : 'למחוק הכל ולהתחיל מחדש?', 'כן, למחוק הכל') &&
                await askConfirm('באמת באמת? אי אפשר לבטל.', 'מחק')) {
              S.reset(); setMe(null); ui.unlocked = false; ss.set('familypoints.unlocked', '');
              location.hash = '#/';
            }
          },
        }, 'איפוס מלא')),
    ];
  }

  function adminView() {
    if (S.state.settings.pin && !ui.unlocked) return pinGate();
    const pend = S.pending().length;
    const tabs = [['approvals', 'אישורים'], ['tasks', 'משימות'], ['family', 'משפחה'], ['settings', 'הגדרות']];
    const content = { approvals: approvalsTab, tasks: tasksTab, family: familyTab, settings: settingsTab }[ui.adminTab]();
    return [
      h('div', { class: 'section-title' }, 'אזור ההורים'),
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label]) =>
        h('button', { type: 'button', class: ui.adminTab === k ? 'on' : '', onclick: () => { ui.adminTab = k; render(); } },
          label, k === 'approvals' && pend > 0 && h('i', { class: 'badge' }, pend)))),
      h('div', { class: 'admin-grid' }, content),
    ];
  }

  /* ---------- היכרות ---------- */
  function onboarding() {
    const rows = [
      { name: 'אבא', role: 'parent', avatar: '' },
      { name: 'אמא', role: 'parent', avatar: '' },
      ...Array.from({ length: 8 }, () => ({ name: '', role: 'kid', avatar: '' })),
    ];
    let samples = true;
    const list = h('div', { class: 'ob-list' });
    function paint() {
      list.replaceChildren(...rows.map((r, i) => {
        const btn = h('button', {
          type: 'button', class: 'avatar-btn' + (r.avatar ? ' emoji' : ''), style: { background: COLORS[i % COLORS.length] }, 'aria-label': 'החלפת סמל',
          onclick: () => pickAvatar((a) => { r.avatar = a; paint(); }, r.name),
        }, r.avatar || letter(r.name));
        return h('div', { class: 'ob-row' }, btn,
          h('input', {
            type: 'text', maxlength: '20', value: r.name, 'aria-label': r.role === 'parent' ? 'שם הורה' : `שם ילד/ה ${i - 1}`,
            placeholder: r.role === 'parent' ? 'שם ההורה' : `שם ילד/ה ${i - 1}`,
            oninput: (e) => { r.name = e.target.value; if (!r.avatar) btn.textContent = letter(r.name); },
          }),
          h('span', { class: 'role-tag' }, r.role === 'parent' ? 'הורה' : 'ילד/ה'));
      }));
    }
    paint();
    return h('div', { class: 'ob' },
      h('div', { class: 'hero', html: Art.hero() }),
      h('h1', null, 'ברוכים הבאים'),
      h('p', { class: 'lead' }, 'מי גר בבית? מלאו שמות (שורות ריקות של ילדים ידולגו). אפשר להחליף סמל בלחיצה.'),
      list,
      h('label', { class: 'check', style: { marginBottom: '16px' } },
        h('input', { type: 'checkbox', checked: true, onchange: (e) => { samples = e.target.checked; } }),
        'התחילו עם משימות לדוגמה (אפשר לשנות הכל אחר כך)'),
      h('button', {
        class: 'btn primary block', type: 'button',
        onclick: () => {
          const members = rows.filter((r) => r.name.trim()).map((r, i) => ({
            id: S.uid(), name: r.name.trim(), role: r.role, avatar: r.avatar, color: COLORS[i % COLORS.length],
          }));
          if (!members.length) return toast('כתבו לפחות שם אחד');
          S.finishOnboarding(members);
          if (samples) S.addSampleTasks();
          location.hash = '#/';
        },
      }, 'מתחילים'));
  }

  /* ---------- חיבור לסנכרון ---------- */
  async function connectWith(code, errorBox) {
    if (!code.trim()) return toast('הכניסו את קוד המשפחה');
    try {
      const result = await Sync.connect(code, () => askConfirm(
        'במכשיר הזה כבר יש נתונים, ובשרת יש נתונים של המשפחה. להחליף את מה שכאן בנתוני המשפחה?',
        'כן, להחליף'));
      if (result === 'joined') toast('התחברתם למשפחה');
      else if (result === 'uploaded') toast('הנתונים מהמכשיר הזה הועלו לשרת');
      else if (result === 'empty') toast('מחוברים. מכאן מגדירים את המשפחה');
    } catch (e) {
      const msg = e.message === 'bad_key' ? 'הקוד שגוי' : 'אין חיבור לשרת, נסו שוב';
      if (errorBox) errorBox.textContent = msg;
      toast(msg);
    }
  }

  function connectScreen() {
    const input = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'קוד המשפחה', 'aria-label': 'קוד המשפחה' });
    const err = h('div', { class: 'sheet-note', style: { color: '#c4352f' } });
    return h('div', { class: 'ob' },
      h('div', { class: 'hero', html: Art.hero() }),
      h('h1', null, 'ברוכים הבאים'),
      h('p', { class: 'lead' }, 'כדי שכל המשפחה תראה אותם נתונים בכל הטלפונים, הכניסו את קוד המשפחה. את הקוד מקבלים מההורים.'),
      h('form', {
        class: 'field',
        onsubmit: (e) => { e.preventDefault(); err.textContent = ''; connectWith(input.value, err); },
      }, hiddenUser(), input, err, h('button', { class: 'btn primary block', type: 'submit' }, 'התחברות')),
      h('button', {
        class: 'btn block', type: 'button', style: { marginTop: '12px' },
        onclick: () => { try { sessionStorage.setItem('familypoints.localonly', '1'); } catch (e) { /* ignore */ } render(); },
      }, 'בלי סנכרון, רק במכשיר הזה'));
  }

  function retryScreen() {
    return h('div', { class: 'ob' },
      h('div', { class: 'hero', html: Art.hero() }),
      h('h1', null, 'אין חיבור לשרת'),
      h('p', { class: 'lead' }, 'לא הצלחנו להגיע לשרת המשפחה. בדקו את החיבור ונסו שוב. אם תמשיכו בלי סנכרון, תיווצר משפחה נפרדת במכשיר הזה בלבד.'),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { Sync.init().then(render); } }, 'נסו שוב'),
      h('button', {
        class: 'btn block', type: 'button', style: { marginTop: '12px' },
        onclick: () => { try { sessionStorage.setItem('familypoints.localonly', '1'); } catch (e) { /* ignore */ } render(); },
      }, 'בלי סנכרון, רק במכשיר הזה'));
  }

  function splash() {
    return h('div', { class: 'ob' }, h('div', { class: 'hero', html: Art.hero() }), h('p', { class: 'lead' }, 'רגע, טוענים…'));
  }

  /* ---------- ניתוב ורינדור ---------- */
  let lastRoute = null;
  function render() {
    if (!S.state.onboarded || !S.state.members.length) {
      if (!Sync.ready) $app.replaceChildren(splash());
      else if (Sync.unreachable && ss.get('familypoints.localonly') !== '1') $app.replaceChildren(retryScreen());
      else if (Sync.available && !Sync.enabled && ss.get('familypoints.localonly') !== '1') $app.replaceChildren(connectScreen());
      else $app.replaceChildren(onboarding());
      return;
    }
    if (ui.me && !S.member(ui.me)) ui.me = null;
    if (ui.edit && !canAdmin()) ui.edit = false;
    const route = location.hash.replace(/^#\/?/, '');
    const parts = route.split('/').filter(Boolean);
    let view; let tab;
    if (parts[0] === 'tasks') { view = tasksView(); tab = 'tasks'; }
    else if (parts[0] === 'brush') { view = Brush.view(); tab = 'brush'; }
    else if (parts[0] === 'm' && S.member(parts[1])) { view = personalView(S.member(parts[1])); tab = 'home'; }
    else if (parts[0] === 'admin') { view = adminView(); tab = 'admin'; }
    else { view = homeView(); tab = 'home'; }
    const y = window.scrollY;
    $app.replaceChildren(shell(view, tab));
    window.scrollTo(0, route === lastRoute ? y : 0);
    lastRoute = route;
  }

  S.onChange(render);
  Sync.onStatus(render);
  window.addEventListener('hashchange', render);
  render();
  Sync.init().then(render);

  // מבקשים מהדפדפן לא לפנות את הנתונים המקומיים כשחסר מקום (חשוב לעבודה בלי רשת)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* האפליקציה עובדת גם בלי */ });
  }
})();
