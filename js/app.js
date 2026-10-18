(() => {
  'use strict';
  const S = Store;
  const $app = document.getElementById('app');

  const AVATARS = ['🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐵', '🦊', '🐰', '🐱', '🐶', '🦄', '🐙', '🦋', '🐧', '🦉', '🐢', '🐳', '🦒', '🐘'];
  const COLORS = ['#ff8fab', '#ffb703', '#6fc3f0', '#7ccf6b', '#b392f5', '#ff9f68', '#3fd0c0', '#f77fb0', '#7aa2f7', '#e9c46a'];
  const TASK_EMOJIS = ['🧹', '🧽', '🧺', '🧼', '🚿', '🛁', '🚽', '🗑️', '🍽️', '🍴', '🥣', '🛒', '👕', '🧦', '🛏️', '🪴', '🌿', '🐶', '🐱', '🐟', '🪟', '🚗', '📚', '🎒', '🧊', '🍳', '🥕', '📦', '🔧', '🪣', '🧴', '♻️', '🌀', '👟', '☀️', '🎈'];
  const PERIODS = { day: 'יומי', week: 'שבועי', month: 'חודשי', once: 'חד־פעמי' };
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
  };

  const fmt = (n) => String(S.roundPts(n));
  const plural = (n, one, many) => (n === 1 ? one : many);

  function avatar(m, size = 40) {
    return h('span', {
      class: 'avatar',
      style: { background: m.color, width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.58) + 'px' },
      'aria-hidden': 'true',
    }, m.avatar);
  }

  function freqLabel(t) {
    if (t.period === 'once') return 'חד־פעמי';
    const unit = { day: 'ביום', week: 'בשבוע', month: 'בחודש' }[t.period];
    return t.times === 1 ? `פעם ${unit}` : `${t.times} פעמים ${unit}`;
  }
  function resetLabel(t) {
    return { day: 'מתאפס מחר', week: 'מתאפס ביום ראשון', month: 'מתאפס ב-1 לחודש', once: '' }[t.period];
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

  function toast(msg) {
    const el = h('div', { class: 'toast' }, msg);
    document.getElementById('toasts').append(el);
    setTimeout(() => el.remove(), 3100);
  }

  function burst() {
    const bits = ['⭐', '✨', '🎉', '💛', '🌟', '🎈', '💖'];
    const wrap = h('div', { class: 'confetti' });
    for (let i = 0; i < 30; i++) {
      wrap.append(h('span', {
        style: {
          left: Math.random() * 100 + '%',
          animationDelay: Math.random() * 0.5 + 's',
          animationDuration: 1.6 + Math.random() * 1.2 + 's',
          fontSize: 18 + Math.random() * 20 + 'px',
        },
      }, bits[i % bits.length]));
    }
    document.body.append(wrap);
    setTimeout(() => wrap.remove(), 3200);
  }

  function sheet(title, content) {
    const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(); } });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    overlay.append(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' },
        h('h2', null, title),
        h('button', { class: 'x', type: 'button', 'aria-label': 'סגירה', onclick: close }, '✕')),
      content));
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    return { close };
  }

  function askConfirm(message, okLabel = 'כן, למחוק') {
    return new Promise((resolve) => {
      let sh;
      const done = (v) => { sh.close(); resolve(v); };
      sh = sheet('בטוחים?', h('div', null,
        h('p', { style: { margin: '4px 0 0', fontSize: '17px' } }, message),
        h('div', { class: 'sheet-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => done(false) }, 'ביטול'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => done(true) }, okLabel))));
    });
  }

  function pickAvatar(cb) {
    const sh = sheet('בחרו דמות', h('div', { class: 'emoji-grid' },
      AVATARS.map((a) => h('button', { type: 'button', onclick: () => { sh.close(); cb(a); } }, a))));
  }

  function empty(text) {
    return h('div', { class: 'empty' }, h('div', { html: Art.empty() }), text);
  }

  /* ---------- מסגרת ---------- */
  function pickMe() {
    const sh = sheet('מי אתם?', h('div', null,
      h('div', { class: 'pick-grid' }, S.state.members.map((m) =>
        h('button', {
          type: 'button', class: 'pick' + (ui.me === m.id ? ' on' : ''),
          onclick: () => { ui.me = m.id; ls.set('familypoints.me', m.id); sh.close(); render(); },
        }, avatar(m, 44), h('span', null, m.name)))),
      ui.me && h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { ui.me = null; ls.set('familypoints.me', ''); sh.close(); render(); } }, 'ניקוי בחירה'))));
  }

  const SYNC_LABEL = {
    ok: ['🟢', 'מסונכרן'],
    connecting: ['🟡', 'מתחבר…'],
    offline: ['🟠', 'אין חיבור'],
    auth: ['🔴', 'קוד שגוי'],
  };
  function syncChip() {
    if (!Sync.enabled) return null;
    const [dot, label] = SYNC_LABEL[Sync.status] || SYNC_LABEL.connecting;
    return h('button', {
      class: 'sync-chip', type: 'button', title: 'מצב סנכרון בין המכשירים',
      onclick: () => { Sync.syncNow(); },
    }, dot, ' ', label);
  }

  function tabLink(href, ico, label, key, active, badge) {
    return h('a', { href, class: 'tab' + (active === key ? ' on' : ''), 'aria-current': active === key ? 'page' : null },
      h('span', { class: 'tab-ico', 'aria-hidden': 'true' }, ico), h('span', null, label),
      badge > 0 && h('i', { class: 'badge' }, badge));
  }

  function shell(view, active) {
    const me = S.member(ui.me);
    return h('div', { class: 'shell' },
      h('header', { class: 'top' },
        h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-star' }, '⭐'), 'נקודות משפחה'),
        h('div', { class: 'top-left' },
          syncChip(),
          h('button', { class: 'me-btn', type: 'button', onclick: pickMe },
            me ? [avatar(me, 30), me.name] : '👋 מי אני?'))),
      !S.persistent && h('div', { class: 'warn' }, '⚠️ הדפדפן חוסם שמירה של נתונים (גלישה בסתר?). שינויים יימחקו ברענון.'),
      Sync.status === 'auth' && h('div', { class: 'warn' },
        '🔑 קוד המשפחה לא תקין (אולי הוחלף). היכנסו להורים ← הגדרות ← סנכרון והתחברו מחדש.'),
      h('main', { class: 'view' }, view),
      h('nav', { class: 'tabbar', 'aria-label': 'ניווט ראשי' },
        tabLink('#/', '🏠', 'בית', 'home', active),
        tabLink('#/tasks', '✅', 'משימות', 'tasks', active),
        tabLink('#/admin', '⚙️', 'הורים', 'admin', active, S.pending().length)));
  }

  /* ---------- סימון משימה כבוצעה ---------- */
  function openComplete(t, preselect) {
    const members = S.state.members;
    const initial = (preselect && preselect.length ? preselect : [ui.me]).filter((id) => S.member(id));
    const sel = new Set(t.team ? initial : initial.slice(0, 1));
    const info = h('div', { class: 'sheet-note' });
    const grid = h('div', { class: 'pick-grid' });
    const ok = h('button', {
      class: 'btn good', type: 'button',
      onclick: () => {
        const c = S.addCompletion(t.id, [...sel]);
        sh.close();
        if (!c) return;
        burst();
        toast(c.status === 'pending' ? '🎉 כל הכבוד! נשלח לאישור ההורים' : `🎉 +${fmt(c.pointsEach)} נקודות!`);
      },
    }, 'סיימתי! 🎉');

    function paint() {
      grid.replaceChildren(...members.map((m) => h('button', {
        type: 'button', class: 'pick' + (sel.has(m.id) ? ' on' : ''),
        onclick: () => {
          if (t.team) { sel.has(m.id) ? sel.delete(m.id) : sel.add(m.id); }
          else { sel.clear(); sel.add(m.id); }
          paint();
        },
      }, avatar(m, 44), h('span', null, m.name))));
      ok.disabled = sel.size === 0;
      info.textContent = sel.size === 0
        ? (t.team ? 'בחרו מי עשה את המשימה (אפשר כמה)' : 'בחרו מי עשה את המשימה')
        : sel.size === 1 ? `יתווספו ${fmt(t.points)} נקודות`
          : `${sel.size} עובדים יחד, ${fmt(S.roundPts(t.points / sel.size))} נקודות לכל אחד`;
    }

    const sh = sheet(`${t.emoji} ${t.title}`, h('div', null,
      h('div', { class: 'label', style: { textAlign: 'center' } }, 'מי עשה את זה?'),
      info, grid,
      h('div', { class: 'sheet-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => sh.close() }, 'ביטול'), ok)));
    paint();
  }

  /* ---------- כרטיס משימה ---------- */
  function taskCard(t, preselect) {
    const st = S.taskStatus(t);
    const who = t.assignees.map(S.member).filter(Boolean);
    return h('div', { class: 'task' + (st.done ? ' done' : '') },
      h('div', { class: 'task-emoji', 'aria-hidden': 'true' }, t.emoji),
      h('div', { class: 'task-main' },
        h('div', { class: 'task-title' }, t.title),
        h('div', { class: 'task-meta' },
          h('span', { class: 'pill' }, freqLabel(t)),
          t.team && h('span', { class: 'pill team' }, '👫 אפשר ביחד'),
          t.period !== 'once' && st.times > 1 && h('span', { class: 'pill' }, `${st.count}/${st.times}`)),
        h('div', { class: 'task-who' }, who.length ? ['מיועד ל:', who.map((m) => avatar(m, 22))] : 'פתוח לכולם')),
      h('div', { class: 'task-side' },
        h('div', { class: 'pts' }, '⭐ ' + fmt(t.points)),
        st.done
          ? h('div', { class: 'done-note' }, st.pending ? '⏳ ממתין לאישור' : '✅ בוצע', h('br'), resetLabel(t))
          : h('button', { class: 'btn go', type: 'button', onclick: () => openComplete(t, preselect) }, 'בוצע!')));
  }

  /* ---------- בית ---------- */
  function homeView() {
    const rows = S.state.members
      .map((m) => ({ m, pts: S.pointsFor(m.id, ui.board) }))
      .sort((a, b) => b.pts - a.pts);
    const max = Math.max(1, ...rows.map((r) => r.pts));
    const total = S.roundPts(rows.reduce((s, r) => s + r.pts, 0));
    const open = S.state.tasks.filter((t) => !S.taskStatus(t).done).length;
    const pend = S.pending().length;
    const medal = ['🥇', '🥈', '🥉'];

    return [
      h('div', { class: 'hero', html: Art.hero() }),
      h('div', { class: 'summary' },
        h('div', { class: 'stat' }, h('span', { class: 'ico' }, '⭐'), h('b', null, fmt(total)), h('span', null, 'נקודות למשפחה ' + BOARDS[ui.board])),
        h('div', { class: 'stat' }, h('span', { class: 'ico' }, '📋'), h('b', null, open), h('span', null, plural(open, 'משימה פתוחה', 'משימות פתוחות'))),
        h('div', { class: 'stat' }, h('span', { class: 'ico' }, '⏳'), h('b', null, pend), h('span', null, 'מחכות לאישור'))),
      h('div', { class: 'section-title' }, '🏆 מי מוביל?'),
      h('div', { class: 'seg', role: 'tablist' }, Object.entries(BOARDS).map(([k, label]) =>
        h('button', { type: 'button', class: ui.board === k ? 'on' : '', onclick: () => { ui.board = k; render(); } }, label))),
      rows.length
        ? h('ol', { class: 'board' }, rows.map((r, i) => {
          const rank = rows.findIndex((x) => x.pts === r.pts);
          return h('li', null, h('a', { class: 'row', href: '#/m/' + r.m.id },
            h('span', { class: 'rank' }, r.pts > 0 && rank < 3 ? medal[rank] : rank + 1),
            avatar(r.m, 46),
            h('div', { class: 'info' }, h('div', { class: 'name' }, r.m.name),
              h('div', { class: 'bar' }, h('i', { style: { width: (r.pts / max) * 100 + '%', background: r.m.color } }))),
            h('div', { class: 'score' }, fmt(r.pts), h('small', null, 'נקודות'))));
        }))
        : empty('עוד אין בני משפחה. מוסיפים אותם במסך ההורים.'),
    ];
  }

  /* ---------- משימות ---------- */
  function tasksView() {
    const filters = { all: 'הכל', ...PERIODS };
    let list = S.state.tasks.filter((t) => ui.filter === 'all' || t.period === ui.filter);
    const withStatus = list.map((t) => ({ t, st: S.taskStatus(t) }));
    const openOnes = withStatus.filter((x) => !x.st.done).sort((a, b) => b.t.points - a.t.points);
    const doneOnes = withStatus.filter((x) => x.st.done);

    return [
      h('div', { class: 'section-title' }, '✅ המשימות של הבית'),
      h('div', { class: 'chips' }, Object.entries(filters).map(([k, label]) =>
        h('button', { type: 'button', class: 'chip' + (ui.filter === k ? ' on' : ''), onclick: () => { ui.filter = k; render(); } }, label))),
      openOnes.length
        ? h('div', { class: 'tasklist' }, openOnes.map((x) => taskCard(x.t)))
        : empty(S.state.tasks.length ? 'אין משימות פתוחות כאן. איזו משפחה מושלמת! 🌟' : 'עוד אין משימות. ההורים מוסיפים אותן במסך ההורים.'),
      doneOnes.length > 0 && h('label', { class: 'check', style: { margin: '16px 4px' } },
        h('input', { type: 'checkbox', checked: ui.showDone, onchange: (e) => { ui.showDone = e.target.checked; render(); } }),
        `הצג גם ${doneOnes.length} ${plural(doneOnes.length, 'משימה שהושלמה', 'משימות שהושלמו')}`),
      ui.showDone && doneOnes.length > 0 && h('div', { class: 'tasklist' }, doneOnes.map((x) => taskCard(x.t))),
    ];
  }

  /* ---------- עמוד אישי ---------- */
  function histRow(c, extra) {
    return h('div', { class: 'hist' + (c.status === 'pending' ? ' pending' : '') },
      h('span', { class: 'e' }, c.emoji),
      h('div', { class: 't' }, c.title,
        h('small', null, `${when(c.ts)}${c.members.length > 1 ? ' · ביחד עם ' + (c.members.length - 1) : ''}`)),
      h('b', null, '+' + fmt(c.pointsEach)), extra);
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

    return [
      h('a', { class: 'back', href: '#/' }, '→ חזרה'),
      h('div', { class: 'profile', style: { background: `linear-gradient(135deg, ${m.color}, #7c5cff)` } },
        avatar(m, 84),
        h('h1', null, m.name),
        h('div', { class: 'sub' }, `${m.role === 'parent' ? 'הורה' : 'ילד/ה'} · מקום ${rank} מתוך ${S.state.members.length} השבוע`),
        h('div', { class: 'tiles' },
          h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'week'))), h('span', null, 'השבוע')),
          h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'month'))), h('span', null, 'החודש')),
          h('div', { class: 'tile' }, h('b', null, fmt(S.pointsFor(m.id, 'all'))), h('span', null, 'סה״כ')))),

      h('div', { class: 'section-title' }, '🎯 המשימות שלי', h('small', null, mine.length)),
      mine.length ? h('div', { class: 'tasklist' }, mine.map((t) => taskCard(t, pre)))
        : h('div', { class: 'empty' }, mineDone.length ? 'סיימת את כל המשימות שלך! 🌟' : 'אין משימות שהוקצו אליך. תבחר מהמשימות הפתוחות 🎈'),

      h('div', { class: 'section-title' }, '🙌 פתוח לכולם', h('small', null, shared.length)),
      shared.length ? h('div', { class: 'tasklist' }, shared.map((t) => taskCard(t, pre))) : h('div', { class: 'empty' }, 'הכל נעשה!'),

      pending.length > 0 && [
        h('div', { class: 'section-title' }, '⏳ מחכה לאישור'),
        h('div', { class: 'history' }, pending.map((c) => histRow(c,
          h('button', { class: 'btn small', type: 'button', onclick: () => S.removeCompletion(c.id) }, 'ביטול')))),
      ],
      approved.length > 0 && [
        h('div', { class: 'section-title' }, '📜 מה עשיתי לאחרונה'),
        h('div', { class: 'history' }, approved.map((c) => histRow(c))),
      ],
    ];
  }

  /* ---------- עורכים ---------- */
  function openTaskEditor(existing) {
    const d = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: S.uid(), title: '', emoji: '🧹', points: 5, period: 'week', times: 1, assignees: [], team: false };

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
      timesField.style.display = d.period === 'once' ? 'none' : '';
    }

    const body = h('div', null,
      h('div', { class: 'field' }, h('label', null, 'שם המשימה'),
        h('input', { type: 'text', maxlength: '40', value: d.title, placeholder: 'למשל: ניקוי המקרר', oninput: (e) => { d.title = e.target.value; } })),
      h('div', { class: 'field' }, h('label', null, 'איור'), emojiGrid),
      h('div', { class: 'field' }, h('label', null, 'ניקוד ⭐'),
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
        '👫 אפשר לעשות ביחד (הניקוד מתחלק)'),
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
            sh.close();
          },
        }, 'שמירה')));
    const sh = sheet(existing ? 'עריכת משימה' : 'משימה חדשה', body);
    paint();
  }

  function openMemberEditor(existing) {
    const idx = S.state.members.length;
    const d = existing ? { ...existing }
      : { id: S.uid(), name: '', role: 'kid', avatar: AVATARS[idx % AVATARS.length], color: COLORS[idx % COLORS.length] };
    const avatarGrid = h('div', { class: 'emoji-grid' });
    const colorRow = h('div', { class: 'chips' });
    function paint() {
      avatarGrid.replaceChildren(...AVATARS.map((a) => h('button', {
        type: 'button', class: d.avatar === a ? 'on' : '', onclick: () => { d.avatar = a; paint(); } }, a)));
      colorRow.replaceChildren(...COLORS.map((c) => h('button', {
        type: 'button', 'aria-label': 'צבע', class: 'avatar',
        style: { background: c, width: '38px', height: '38px', border: d.color === c ? '4px solid #3b2f4a' : '4px solid #fff', cursor: 'pointer' },
        onclick: () => { d.color = c; paint(); } })));
    }
    const sh = sheet(existing ? 'עריכת בן משפחה' : 'בן משפחה חדש', h('div', null,
      h('div', { class: 'field' }, h('label', null, 'שם'),
        h('input', { type: 'text', maxlength: '20', value: d.name, oninput: (e) => { d.name = e.target.value; } })),
      h('div', { class: 'field' }, h('label', null, 'תפקיד'),
        h('select', { onchange: (e) => { d.role = e.target.value; } },
          h('option', { value: 'kid', selected: d.role === 'kid' }, 'ילד/ה'),
          h('option', { value: 'parent', selected: d.role === 'parent' }, 'הורה'))),
      h('div', { class: 'field' }, h('label', null, 'דמות'), avatarGrid),
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
        }, 'שמירה'))));
    paint();
  }

  /* ---------- ניהול (הורים) ---------- */
  function pinGate() {
    const input = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', placeholder: '••••', 'aria-label': 'קוד הורים' });
    return h('div', { class: 'gate' },
      h('div', { class: 'lock' }, '🔐'),
      h('h2', null, 'אזור להורים'),
      h('p', { style: { color: 'var(--muted)' } }, 'הכניסו את הקוד כדי להמשיך'),
      h('form', {
        onsubmit: (e) => {
          e.preventDefault();
          if (input.value === S.state.settings.pin) {
            ui.unlocked = true; ss.set('familypoints.unlocked', '1'); render();
          } else { toast('קוד שגוי 🙈'); input.value = ''; }
        },
      }, input, h('button', { class: 'btn primary', type: 'submit' }, 'כניסה')));
  }

  function approvalsTab() {
    const pend = S.pending().sort((a, b) => a.ts - b.ts);
    const names = (c) => c.members.map((id) => (S.member(id) || { name: '?' }).name).join(', ');
    const recent = S.state.completions.filter((c) => c.status === 'approved').sort((a, b) => b.ts - a.ts).slice(0, 12);
    return [
      h('div', { class: 'card' },
        h('h3', null, `⏳ מחכות לאישור (${pend.length})`),
        pend.length
          ? [pend.map((c) => h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '28px' } }, c.emoji),
            h('div', { class: 'grow' }, c.title, h('small', null, `${names(c)} · ${when(c.ts)} · ${fmt(c.pointsEach)} נק׳ לכל אחד`)),
            h('button', { class: 'btn good small', type: 'button', onclick: () => S.setCompletionStatus(c.id, 'approved') }, '✔ אשר'),
            h('button', { class: 'btn danger small', type: 'button', onclick: () => S.removeCompletion(c.id) }, '✖'))),
          pend.length > 1 && h('div', { class: 'actions', style: { marginTop: '10px' } },
            h('button', { class: 'btn good block', type: 'button', onclick: () => { pend.forEach((c) => S.setCompletionStatus(c.id, 'approved')); toast('הכל אושר ✔'); } }, 'אשר הכל'))]
          : empty('אין מה לאשר 🎉')),
      h('div', { class: 'card' },
        h('h3', null, '📜 אושרו לאחרונה'),
        recent.length
          ? recent.map((c) => h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '24px' } }, c.emoji),
            h('div', { class: 'grow' }, c.title, h('small', null, `${names(c)} · ${when(c.ts)} · ${fmt(c.pointsEach)} נק׳`)),
            h('button', {
              class: 'btn danger small', type: 'button', 'aria-label': 'מחיקה',
              onclick: async () => { if (await askConfirm('למחוק את הדיווח הזה? הנקודות יורדו.')) S.removeCompletion(c.id); },
            }, '🗑')))
          : h('p', null, 'עוד לא אושר כלום.')),
    ];
  }

  function tasksTab() {
    return [
      h('div', { class: 'actions', style: { marginBottom: '12px' } },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openTaskEditor() }, '➕ משימה חדשה'),
        h('button', { class: 'btn', type: 'button', onclick: () => { S.addSampleTasks(); toast('נוספו משימות לדוגמה'); } }, '✨ הוסף משימות לדוגמה')),
      h('div', { class: 'card' }, S.state.tasks.length
        ? S.state.tasks.map((t) => {
          const who = t.assignees.map(S.member).filter(Boolean).map((m) => m.name).join(', ') || 'כולם';
          return h('div', { class: 'list-row' },
            h('span', { style: { fontSize: '28px' } }, t.emoji),
            h('div', { class: 'grow' }, t.title, h('small', null, `⭐ ${fmt(t.points)} · ${freqLabel(t)} · ${who}${t.team ? ' · ביחד' : ''}`)),
            h('button', { class: 'btn small', type: 'button', onclick: () => openTaskEditor(t) }, 'עריכה'));
        })
        : empty('עוד אין משימות')),
    ];
  }

  function familyTab() {
    return [
      h('div', { class: 'actions', style: { marginBottom: '12px' } },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openMemberEditor() }, '➕ בן משפחה')),
      h('div', { class: 'card' }, S.state.members.map((m) =>
        h('div', { class: 'list-row' }, avatar(m, 42),
          h('div', { class: 'grow' }, m.name, h('small', null, `${m.role === 'parent' ? 'הורה' : 'ילד/ה'} · ${fmt(S.pointsFor(m.id, 'all'))} נק׳ סה״כ`)),
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
      ? h('div', { class: 'card' }, h('h3', null, '🔄 סנכרון בין מכשירים'),
        h('p', null, 'הסנכרון לא זמין בכתובת הזו (השרת לא מוגדר). הנתונים נשמרים במכשיר הזה בלבד.'))
      : Sync.enabled
        ? h('div', { class: 'card' }, h('h3', null, '🔄 סנכרון בין מכשירים'),
          h('p', null, `${SYNC_LABEL[Sync.status][0]} ${{ ok: 'מחוברים. שינויים מופיעים בכל המכשירים תוך כמה שניות.', connecting: 'מתחבר…', offline: 'אין חיבור לשרת כרגע. שינויים יישלחו כשהחיבור יחזור.', auth: 'הקוד שגוי או הוחלף. נתקו והתחברו מחדש.' }[Sync.status]}`),
          h('div', { class: 'actions' },
            h('button', { class: 'btn', type: 'button', onclick: () => Sync.syncNow() }, 'סנכרן עכשיו'),
            h('button', {
              class: 'btn danger', type: 'button',
              onclick: async () => {
                if (await askConfirm('לנתק את המכשיר הזה מהסנכרון? הנתונים יישארו כאן, אבל ייפסקו עדכונים.', 'כן, לנתק')) Sync.disconnect();
              },
            }, 'ניתוק')))
        : h('div', { class: 'card' }, h('h3', null, '🔄 סנכרון בין מכשירים'),
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
        f.text().then((txt) => { S.importJSON(txt); toast('הגיבוי נטען ✔'); })
          .catch((err) => toast('שגיאה: ' + err.message));
      },
    });
    return [
      h('div', { class: 'card' }, h('h3', null, '✔ אישור הורים'),
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: st.requireApproval, onchange: (e) => S.setSettings({ requireApproval: e.target.checked }) }),
          'דיווחים של ילדים מחכים לאישור'),
        h('p', null, 'כשזה כבוי הנקודות נכנסות מיד. דיווחים של הורים תמיד נכנסים מיד.')),
      h('div', { class: 'card' }, h('h3', null, '🔐 קוד הורים'),
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
      h('div', { class: 'card' }, h('h3', null, '💾 גיבוי'),
        h('p', null, Sync.enabled
          ? 'הנתונים מסונכרנים לשרת. גיבוי לקובץ הוא רשת ביטחון נוספת. טעינת גיבוי מחליפה את הנתונים אצל כל המשפחה.'
          : 'הנתונים נשמרים בדפדפן של המכשיר הזה בלבד. מומלץ לגבות מדי פעם.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => download(`family-points-${new Date().toISOString().slice(0, 10)}.json`, S.exportJSON()) }, '⬇ הורדת גיבוי'),
          h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, '⬆ טעינת גיבוי'), fileInput)),
      h('div', { class: 'card' }, h('h3', null, '🧨 איפוס'),
        h('p', null, Sync.enabled
          ? 'מוחק את כל המשפחה, המשימות והניקוד, בכל המכשירים!'
          : 'מוחק את כל המשפחה, המשימות והניקוד.'),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (await askConfirm(Sync.enabled ? 'למחוק הכל אצל כל המשפחה ולהתחיל מחדש?' : 'למחוק הכל ולהתחיל מחדש?', 'כן, למחוק הכל') &&
                await askConfirm('באמת באמת? אי אפשר לבטל.', 'מחק')) {
              S.reset(); ui.me = null; ls.set('familypoints.me', ''); ui.unlocked = false; ss.set('familypoints.unlocked', '');
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
      h('div', { class: 'section-title' }, '⚙️ אזור ההורים'),
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label]) =>
        h('button', { type: 'button', class: ui.adminTab === k ? 'on' : '', onclick: () => { ui.adminTab = k; render(); } },
          label, k === 'approvals' && pend > 0 && h('i', { class: 'badge' }, pend)))),
      content,
    ];
  }

  /* ---------- היכרות ---------- */
  function onboarding() {
    const rows = [
      { name: 'אבא', role: 'parent', avatar: AVATARS[0] },
      { name: 'אמא', role: 'parent', avatar: AVATARS[1] },
      ...Array.from({ length: 8 }, (_, i) => ({ name: '', role: 'kid', avatar: AVATARS[2 + i] })),
    ];
    let samples = true;
    const list = h('div', { class: 'ob-list' });
    function paint() {
      list.replaceChildren(...rows.map((r, i) => h('div', { class: 'ob-row' },
        h('button', {
          type: 'button', class: 'avatar-btn', style: { background: COLORS[i % COLORS.length] }, 'aria-label': 'החלפת דמות',
          onclick: () => pickAvatar((a) => { r.avatar = a; paint(); }),
        }, r.avatar),
        h('input', {
          type: 'text', maxlength: '20', value: r.name, 'aria-label': r.role === 'parent' ? 'שם הורה' : `שם ילד/ה ${i - 1}`,
          placeholder: r.role === 'parent' ? 'שם ההורה' : `שם ילד/ה ${i - 1}`,
          oninput: (e) => { r.name = e.target.value; },
        }),
        h('span', { class: 'role-tag' }, r.role === 'parent' ? 'הורה' : 'ילד/ה'))));
    }
    paint();
    return h('div', { class: 'ob' },
      h('div', { class: 'hero', html: Art.hero() }),
      h('h1', null, 'ברוכים הבאים! 🎉'),
      h('p', { class: 'lead' }, 'מי גר בבית? מלאו שמות (שורות ריקות של ילדים ידולגו), ואפשר להחליף דמות בלחיצה.'),
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
      }, 'יאללה מתחילים! 🚀'));
  }

  /* ---------- חיבור לסנכרון ---------- */
  async function connectWith(code, errorBox) {
    if (!code.trim()) return toast('הכניסו את קוד המשפחה');
    try {
      const result = await Sync.connect(code, () => askConfirm(
        'במכשיר הזה כבר יש נתונים, ובשרת יש נתונים של המשפחה. להחליף את מה שכאן בנתוני המשפחה?',
        'כן, להחליף'));
      if (result === 'joined') toast('🎉 התחברתם למשפחה!');
      else if (result === 'uploaded') toast('הנתונים מהמכשיר הזה הועלו לשרת ✔');
      else if (result === 'empty') toast('מחוברים! מכאן מגדירים את המשפחה');
    } catch (e) {
      const msg = e.message === 'bad_key' ? 'הקוד שגוי' : 'אין חיבור לשרת, נסו שוב';
      if (errorBox) errorBox.textContent = msg;
      toast(msg);
    }
  }

  function connectScreen() {
    const input = h('input', { type: 'password', autocomplete: 'off', placeholder: 'קוד המשפחה', 'aria-label': 'קוד המשפחה' });
    const err = h('div', { class: 'sheet-note', style: { color: '#d63b4d' } });
    return h('div', { class: 'ob' },
      h('div', { class: 'hero', html: Art.hero() }),
      h('h1', null, 'ברוכים הבאים! 🎉'),
      h('p', { class: 'lead' }, 'כדי שכל המשפחה תראה אותם נתונים בכל הטלפונים, הכניסו את קוד המשפחה. את הקוד מקבלים מההורים.'),
      h('form', {
        class: 'field',
        onsubmit: (e) => { e.preventDefault(); err.textContent = ''; connectWith(input.value, err); },
      }, input, err, h('button', { class: 'btn primary block', type: 'submit' }, 'התחברות')),
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
      else if (Sync.available && !Sync.enabled && ss.get('familypoints.localonly') !== '1') $app.replaceChildren(connectScreen());
      else $app.replaceChildren(onboarding());
      return;
    }
    if (ui.me && !S.member(ui.me)) ui.me = null;
    const route = location.hash.replace(/^#\/?/, '');
    const parts = route.split('/').filter(Boolean);
    let view; let tab;
    if (parts[0] === 'tasks') { view = tasksView(); tab = 'tasks'; }
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

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* האפליקציה עובדת גם בלי */ });
  }
})();
