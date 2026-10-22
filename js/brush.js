/* מסך צחצוח שיניים: בני המשפחה בגלילה, סימון בוקר/ערב בשעות קבועות, וטיימר של 3 דקות.
 * הסימונים נשמרים ב-Store (brushes) ומסתנכרנים כמו כל רשומה אחרת. הטיימר חי רק במכשיר. */
const BrushScreen = (() => {
  const SLOTS = {
    m: { label: 'בוקר', from: 6, to: 10, range: '6:00–10:00', icon: 'sun' },
    e: { label: 'ערב', from: 18, to: 24, range: '18:00–24:00', icon: 'moon' },
  };
  const TOTAL_MS = 180000;
  const ZONE_MS = 45000;
  const RADIUS = 88;
  const CIRC = 2 * Math.PI * RADIUS;
  // ארבעה רבעים בפה: כל אחד 45 שניות. הקשתות מצוירות מול המסך (ימין = צד ימין של המסך)
  const ZONES = [
    { label: 'למעלה בצד ימין', d: 'M60 14 C86 14 103 24 106 40' },
    { label: 'למעלה בצד שמאל', d: 'M14 40 C17 24 34 14 60 14' },
    { label: 'למטה בצד ימין', d: 'M106 48 C103 64 86 74 60 74' },
    { label: 'למטה בצד שמאל', d: 'M60 74 C34 74 17 64 14 48' },
  ];

  const slotAt = (d = new Date()) => {
    const hr = d.getHours();
    if (hr >= SLOTS.m.from && hr < SLOTS.m.to) return 'm';
    if (hr >= SLOTS.e.from && hr < SLOTS.e.to) return 'e';
    return null;
  };
  const zoneOf = (leftMs) => Math.min(3, Math.floor((TOTAL_MS - leftMs) / ZONE_MS));
  const fmtTime = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  /* ---------- איורים ---------- */
  const brushArt = () => `
<svg viewBox="0 0 120 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="br-art-brush">
    <g transform="rotate(-14 60 34)">
      <rect x="4" y="27" width="74" height="13" rx="6.5" fill="#5a8dee" stroke="#34569e" stroke-width="2"/>
      <rect x="14" y="30.5" width="40" height="3" rx="1.5" fill="#fff" opacity=".45"/>
      <path d="M76 29 H86 V38 H76Z" fill="#7aa5f3" stroke="#34569e" stroke-width="2" stroke-linejoin="round"/>
      <rect x="84" y="23" width="30" height="21" rx="8" fill="#fff" stroke="#34569e" stroke-width="2"/>
      <g fill="#1f9d8f" stroke="#17806f" stroke-width="1.2">
        <rect x="89" y="12" width="4" height="12" rx="2"/><rect x="96" y="10" width="4" height="14" rx="2"/>
        <rect x="103" y="12" width="4" height="12" rx="2"/>
      </g>
    </g>
  </g>
  <g fill="#fff" stroke="#9ed8cf" stroke-width="1.6">
    <circle cx="102" cy="7" r="4.5"/><circle cx="113" cy="14" r="3"/><circle cx="92" cy="4" r="2.6"/>
  </g>
</svg>`;

  function mouthArt(zone, state) {
    const segs = ZONES.map((z, i) => {
      const cls = state === 'done' || i < zone ? 'done' : (i === zone && state !== 'idle' ? 'active' : '');
      return `<path d="${z.d}" class="br-seg-bg"/><path d="${z.d}" class="br-seg ${cls}"/>`;
    }).join('');
    return `<svg viewBox="0 0 120 88" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="רבעי הפה">${segs}</svg>`;
  }

  const ringArt = () => `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="brGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1f9d8f"/><stop offset="1" stop-color="#62cdbd"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="96" fill="#fff"/>
  <circle cx="100" cy="100" r="${RADIUS}" fill="none" stroke="#e3f1ee" stroke-width="14"/>
  <circle class="br-arc" cx="100" cy="100" r="${RADIUS}" fill="none" stroke="url(#brGrad)" stroke-width="14"
    stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
</svg>`;

  function create(ctx) {
    const { h, S, avatar, icon, toast, burst } = ctx;
    let selId = null;
    let els = {};
    const timer = { state: 'idle', left: TOTAL_MS, endsAt: 0, zone: 0, iv: null, lock: null, audio: null };

    const todayKey = () => S.periodKey('day', Date.now());

    /* ---------- צליל, רטט ומסך ער ---------- */
    const muted = () => { try { return localStorage.getItem('familypoints.mute') === '1'; } catch (e) { return false; } };
    function tone(freq, dur, when = 0) {
      if (muted()) return;
      try {
        const a = timer.audio || (timer.audio = new (window.AudioContext || window.webkitAudioContext)());
        if (a.state === 'suspended') a.resume();
        const o = a.createOscillator();
        const g = a.createGain();
        const t0 = a.currentTime + when;
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
      } catch (e) { /* בלי צליל */ }
    }
    const buzz = (pattern) => { try { if (!muted() && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ } };
    async function wake(on) {
      try {
        if (on && 'wakeLock' in navigator) timer.lock = await navigator.wakeLock.request('screen');
        else if (!on && timer.lock) { await timer.lock.release(); timer.lock = null; }
      } catch (e) { /* לא קריטי */ }
    }

    /* ---------- טיימר ---------- */
    function paintClock() {
      if (!els.time) return;
      const zone = timer.state === 'done' ? 4 : zoneOf(timer.left);
      els.time.textContent = fmtTime(timer.left);
      els.arc.style.strokeDashoffset = (CIRC * (1 - timer.left / TOTAL_MS)).toFixed(2);
      els.zoneName.textContent = zoneText();
      els.segs.forEach((seg, i) => {
        const on = timer.state === 'done' || i < zone ? 'done' : (i === zone && timer.state !== 'idle' ? 'active' : '');
        seg.setAttribute('class', 'br-seg ' + on);
      });
    }
    function zoneText() {
      if (timer.state === 'idle') return 'שלוש דקות, 45 שניות לכל רבע';
      if (timer.state === 'done') return 'כל הפה נוקה';
      const z = ZONES[zoneOf(timer.left)].label;
      return (timer.state === 'paused' ? 'בהפסקה · ' : 'עכשיו: ') + z;
    }

    function update() {
      if (timer.state === 'running') {
        timer.left = Math.max(0, timer.endsAt - Date.now());
        const zone = zoneOf(timer.left);
        if (timer.left === 0) { finish(); return; }
        if (zone !== timer.zone) { timer.zone = zone; tone(660, 0.22); buzz(120); }
      }
      paintClock();
    }

    function start() {
      if (timer.state === 'running') return;
      if (timer.state === 'done') { timer.left = TOTAL_MS; }
      timer.state = 'running';
      timer.endsAt = Date.now() + timer.left;
      timer.zone = zoneOf(timer.left);
      clearInterval(timer.iv);
      timer.iv = setInterval(update, 250);
      tone(523, 0.16);
      wake(true);
      paintTimer();
    }
    function pause() {
      if (timer.state !== 'running') return;
      update();
      if (timer.state !== 'running') return;
      timer.state = 'paused';
      clearInterval(timer.iv);
      wake(false);
      paintTimer();
    }
    function reset() {
      clearInterval(timer.iv);
      timer.state = 'idle'; timer.left = TOTAL_MS; timer.zone = 0;
      wake(false);
      paintTimer();
      paintAction();
    }
    function finish() {
      clearInterval(timer.iv);
      timer.state = 'done'; timer.left = 0;
      wake(false);
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, i * 0.16));
      buzz([200, 100, 200, 100, 400]);
      burst();
      paintTimer();
      paintAction();
    }

    function paintTimer() {
      const box = els.timer;
      if (!box) return;
      const running = timer.state === 'running';
      const main = running
        ? h('button', { class: 'btn good br-big', type: 'button', onclick: pause }, icon('pause', 22, true), 'הפסקה')
        : h('button', { class: 'btn good br-big', type: 'button', onclick: start },
          icon('play', 22, true), timer.state === 'paused' ? 'המשך' : timer.state === 'done' ? 'עוד פעם' : 'מתחילים');
      const me = S.member(selId);
      box.classList.toggle('running', running);
      box.replaceChildren(
        h('div', { class: 'br-t-top' },
          h('div', { class: 'br-art', html: brushArt() }),
          h('div', { class: 'br-t-title' }, h('h2', null, 'טיימר צחצוח'), h('span', null, '3 דקות · 4 רבעים')),
          h('button', {
            class: 'icon-btn', type: 'button', title: muted() ? 'להפעיל צלילים' : 'להשתיק צלילים',
            'aria-label': muted() ? 'להפעיל צלילים' : 'להשתיק צלילים',
            onclick: () => { try { localStorage.setItem('familypoints.mute', muted() ? '0' : '1'); } catch (e) { /* ignore */ } paintTimer(); },
          }, icon(muted() ? 'mute' : 'volume', 20))),
        h('div', { class: 'br-ring' + (running ? ' running' : '') + (timer.state === 'done' ? ' done' : '') },
          h('div', { class: 'br-ring-art', html: ringArt() }),
          h('div', { class: 'br-ring-mid' },
            h('div', { class: 'br-time', dir: 'ltr' }, fmtTime(timer.left)),
            timer.state === 'done' && h('div', { class: 'br-bravo' }, me ? `כל הכבוד ${me.name}!` : 'כל הכבוד!'))),
        h('div', { class: 'br-zone-name' }, zoneText()),
        h('div', { class: 'br-mouth', html: mouthArt(zoneOf(timer.left), timer.state) }),
        h('div', { class: 'br-controls' },
          main,
          timer.state !== 'idle' && h('button', { class: 'btn ghost', type: 'button', onclick: reset }, icon('reset', 18), 'מההתחלה')));
      els.time = box.querySelector('.br-time');
      els.arc = box.querySelector('.br-arc');
      els.zoneName = box.querySelector('.br-zone-name');
      els.segs = [...box.querySelectorAll('.br-seg')];
      paintClock();
    }

    /* ---------- בחירה וסימון ---------- */
    function centerOn(card, smooth) {
      const track = els.track;
      if (!track || !card) return;
      const t = track.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const delta = (c.left + c.width / 2) - (t.left + t.width / 2);
      if (Math.abs(delta) < 1) return;
      track.scrollTo({ left: track.scrollLeft + delta, behavior: smooth ? 'smooth' : 'auto' });
    }

    function select(id) {
      if (id === selId) return;
      selId = id;
      (els.cards || []).forEach((c) => {
        const on = c.dataset.id === id;
        c.classList.toggle('on', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) centerOn(c, true);
      });
      paintAction();
      if (timer.state === 'done') paintTimer();
    }

    function step(dir) {
      const ids = S.state.members.map((m) => m.id);
      const i = ids.indexOf(selId);
      const next = ids[(i + dir + ids.length) % ids.length];
      if (next) select(next);
    }

    function mark(m, day, slot) {
      burst();
      toast(`סומן צחצוח ${SLOTS[slot].label} ל${m.name}`,
        { label: 'ביטול', fn: () => S.setBrush(m.id, day, slot, false) });
      S.setBrush(m.id, day, slot, true);
    }

    function closedHint() {
      return `אפשר לסמן בבוקר בין ${SLOTS.m.range} ובערב בין ${SLOTS.e.range}.`;
    }

    function slotPill(memberId, day, s, current) {
      const done = S.isBrushed(memberId, day, s);
      return h('span', {
        class: 'br-pill' + (done ? ' done' : '') + (s === current ? ' now' : ''),
        title: `${SLOTS[s].label} ${SLOTS[s].range}`,
      }, icon(SLOTS[s].icon, 18), SLOTS[s].label, done && icon('check', 16));
    }

    function paintAction() {
      const box = els.action;
      const m = S.member(selId);
      if (!box || !m) return;
      const now = new Date();
      const day = S.periodKey('day', now.getTime());
      const slot = slotAt(now);
      const kids = [];
      if (slot) {
        const done = S.isBrushed(m.id, day, slot);
        if (done) {
          kids.push(
            h('div', { class: 'br-done' }, icon('check', 24), `סומן צחצוח ${SLOTS[slot].label} ל${m.name}`),
            h('button', {
              class: 'btn small ghost', type: 'button',
              onclick: () => { S.setBrush(m.id, day, slot, false); toast('הסימון בוטל'); },
            }, 'ביטול סימון'));
        } else {
          kids.push(h('button', {
            class: 'btn primary br-big' + (timer.state === 'done' ? ' pulse' : ''), type: 'button',
            onclick: () => mark(m, day, slot),
          }, icon(SLOTS[slot].icon, 24), `צחצחתי! (${SLOTS[slot].label})`));
        }
      } else {
        kids.push(
          h('button', { class: 'btn br-big', type: 'button', disabled: true }, icon('tooth', 24), 'לא בשעות הצחצוח'),
          h('p', { class: 'br-sub' }, closedHint()));
      }
      kids.push(h('div', { class: 'br-today' }, slotPill(m.id, day, 'm', slot), slotPill(m.id, day, 'e', slot)));
      box.replaceChildren(...kids);
    }

    function paintHead() {
      if (!els.chip) return;
      const slot = slotAt();
      els.chip.className = 'br-chip' + (slot ? ' on' : '');
      els.chip.replaceChildren(
        icon(slot ? SLOTS[slot].icon : 'tooth', 18),
        slot ? `עכשיו: צחצוח ${SLOTS[slot].label}` : 'מחוץ לשעות הצחצוח');
    }

    // השעון זז בזמן שהמסך פתוח: מעדכן את הכפתור כשנפתח או נסגר חלון
    setInterval(() => { if (els.action && els.action.isConnected) { paintHead(); paintAction(); } }, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (timer.state === 'running') { wake(true); update(); }
      if (els.action && els.action.isConnected) { paintHead(); paintAction(); }
    });

    /* ---------- המסך ---------- */
    function view() {
      const members = S.state.members;
      if (!members.some((m) => m.id === selId)) {
        selId = members.some((m) => m.id === ctx.me()) ? ctx.me() : (members[0] ? members[0].id : null);
      }
      const now = new Date();
      const day = todayKey();
      const slot = slotAt(now);
      let dateText = '';
      try { dateText = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { /* ignore */ }

      els = {};
      els.chip = h('div', { class: 'br-chip' + (slot ? ' on' : '') });
      els.track = h('div', { class: 'br-track', role: 'listbox', 'aria-label': 'בני המשפחה' });
      els.cards = members.map((m) => h('button', {
        type: 'button', class: 'br-card' + (m.id === selId ? ' on' : ''), role: 'option',
        'aria-selected': m.id === selId ? 'true' : 'false', 'data-id': m.id,
        onclick: () => select(m.id),
      },
      avatar(m, 84),
      h('span', { class: 'br-name' }, m.name),
      h('span', { class: 'br-marks' },
        ['m', 'e'].map((s) => h('i', {
          class: 'br-mark' + (S.isBrushed(m.id, day, s) ? ' done' : ''),
          title: `${SLOTS[s].label}: ${S.isBrushed(m.id, day, s) ? 'צוחצח' : 'עוד לא'}`,
        }, icon(SLOTS[s].icon, 15))))));
      els.track.append(...els.cards);
      els.action = h('div', { class: 'br-action' });
      els.timer = h('section', { class: 'br-timer', 'aria-label': 'טיימר צחצוח' });

      if (!members.length) {
        return [h('div', { class: 'empty' }, 'עוד אין בני משפחה. מוסיפים אותם במסך ההורים.')];
      }

      paintHead();
      paintAction();
      paintTimer();
      setTimeout(() => centerOn(els.cards.find((c) => c.dataset.id === selId), false), 0);

      return [
        h('div', { class: 'br-grid' },
          h('section', { class: 'br-people' },
            h('div', { class: 'br-head' },
              h('div', null, h('h1', null, 'צחצוח שיניים'), h('p', null, dateText)),
              els.chip),
            h('div', { class: 'br-carousel' },
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'הקודם', title: 'הקודם', onclick: () => step(-1) }, icon('chevR', 22)),
              els.track,
              h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'הבא', title: 'הבא', onclick: () => step(1) }, icon('chevL', 22))),
            h('p', { class: 'br-hint' }, 'גוללים, לוחצים על עצמכם, ומסמנים אחרי הצחצוח'),
            els.action),
          els.timer),
      ];
    }

    return { view };
  }

  return { create, slotAt };
})();
