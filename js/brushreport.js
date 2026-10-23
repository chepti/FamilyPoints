/* תצוגת הורים: נתוני צחצוח שיניים לפי החודש העברי, ופרס על כל 5 צחצוחים.
 * הנתונים עצמם נרשמים במסך הצחצוח (brush.js) ונשמרים ב-Store. כאן רק קוראים ומציגים,
 * חוץ מסימון "פרס נמסר" ובחירה מי נמצא בתוכנית. */
const BrushReport = (() => {
  const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const PRIZE_LABEL = 'פרס מ״הכל בשקל״';

  /* ---------- תאריך עברי ---------- */
  // אם הדפדפן לא תומך בלוח העברי, נופלים ללוח הרגיל (חודש גרגוריאני) במקום להישבר
  const HEB = (() => {
    try {
      const f = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
      return f.resolvedOptions().calendar === 'hebrew' ? f : null;
    } catch (e) { return null; }
  })();
  const GREG = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

  function parts(d) {
    const o = {};
    for (const p of (HEB || GREG).formatToParts(d)) if (p.type !== 'literal') o[p.type] = p.value;
    return { day: Number(o.day), month: o.month, year: Number(o.year) };
  }
  const monthKeyOf = (d) => { const p = parts(d); return p.year + '|' + p.month; };

  // גימטריה: 1→א׳, 15→ט״ו, 22→כ״ב, 30→ל׳. שנה (5787) בלי האלפים: תשפ״ז
  function gematria(n) {
    const H = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
    const T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const O = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    let r = H[Math.floor(n / 100) % 10];
    const rest = n % 100;
    if (rest === 15) r += 'טו';
    else if (rest === 16) r += 'טז';
    else r += T[Math.floor(rest / 10)] + O[rest % 10];
    return r.length > 1 ? r.slice(0, -1) + '״' + r.slice(-1) : r + '׳';
  }
  const dayLabel = (p) => (HEB ? gematria(p.day) : String(p.day));
  const yearLabel = (p) => (HEB ? gematria(p.year % 1000) : String(p.year));
  // "כ״ג בחשוון"
  const hebrewDate = (ts) => { const p = parts(new Date(ts)); return `${dayLabel(p)} ב${p.month}`; };

  // כל ימי החודש (העברי) שמכיל את התאריך, מהראשון עד האחרון, גם ימים עתידיים
  function monthWindow(date) {
    const at = (d, k) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, 12);
    const day = at(date, 0);
    const key = monthKeyOf(day);
    let start = day;
    for (let i = 0; i < 32 && monthKeyOf(at(start, -1)) === key; i++) start = at(start, -1);
    const days = [];
    for (let d = start; monthKeyOf(d) === key && days.length < 32; d = at(d, 1)) days.push(d);
    return { days, start, end: days[days.length - 1], prevDate: at(start, -1), nextDate: at(days[days.length - 1], 1) };
  }

  /* חישוב נקי, בלי DOM: לכל בן משפחה בתוכנית מחזיר את ימי החודש, ספירות ופרסים.
   * offset = 0 החודש הנוכחי, -1 הקודם וכן הלאה */
  function compute(S, now = Date.now(), offset = 0) {
    const SL = BrushScreen.SLOTS;
    const t = new Date(now);
    let win = monthWindow(t);
    for (let i = 0; i < -Math.min(0, offset) && i < 120; i++) win = monthWindow(win.prevDate);

    const todayKey = S.periodKey('day', t.getTime());
    const days = win.days.map((d) => {
      const p = parts(d);
      const key = S.periodKey('day', d.getTime());
      return { key, dow: d.getDay(), label: dayLabel(p), greg: d.getDate(), today: key === todayKey, future: key > todayKey };
    });
    const first0 = parts(win.start);
    const head = { name: first0.month, year: yearLabel(first0), title: `${first0.month} ${yearLabel(first0)}` };

    // לפני היום הראשון שבו מישהו סימן צחצוח אין מה למדוד (האפליקציה עוד לא הייתה בשימוש)
    let first = null;
    for (const b of S.state.brushes) if (!first || b.day < first) first = b.day;

    // כמה סימונים אפשר היה לעשות עד עכשיו: 2 ליום. היום רק בוקר, ורק אחרי שחלון הבוקר נסגר. עתיד: 0
    let possible = 0;
    for (const d of days) {
      if (!first || d.key < first || d.future) continue;
      possible += d.today ? (t.getHours() >= SL.m.to ? 1 : 0) : 2;
    }

    const rows = S.state.members.filter(S.brushTracked).map((m) => {
      const mine = new Set();
      for (const b of S.state.brushes) if (b.memberId === m.id) mine.add(b.day + '_' + b.slot);
      const cells = days.map((d) => ({ ...d, m: mine.has(d.key + '_m'), e: mine.has(d.key + '_e') }));
      const monthCount = cells.reduce((n, c) => n + (c.m ? 1 : 0) + (c.e ? 1 : 0), 0);
      const st = S.prizeStatus(m.id);
      return {
        member: m, days: cells, monthCount, possible,
        pct: possible ? Math.min(100, Math.round((100 * monthCount) / possible)) : null,
        ...st, toNext: S.PRIZE_EVERY - st.cycle,
      };
    });
    return {
      rows, possible, first, hasData: first !== null, head, offset: Math.min(0, offset), length: days.length,
      canPrev: first !== null && first < days[0].key, canNext: offset < 0,
    };
  }

  function create(ctx) {
    const { h, S, avatar, icon, toast, askConfirm, render } = ctx;
    let offset = 0; // 0 = החודש העברי הנוכחי

    function calendar(r) {
      const lead = r.days[0].dow;
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push(h('div', { class: 'bp-day blank', 'aria-hidden': 'true' }));
      for (const d of r.days) {
        const label = `${d.label} (${d.greg}): ${d.future ? 'עוד לא הגיע' : `בוקר ${d.m ? 'צחצח' : 'לא סומן'}, ערב ${d.e ? 'צחצח' : 'לא סומן'}`}`;
        cells.push(h('div', { class: 'bp-day' + (d.today ? ' today' : '') + (d.future ? ' future' : ''), role: 'img', 'aria-label': label, title: label },
          h('span', { class: 'n' }, d.label),
          h('span', { class: 'pips' },
            h('i', { class: 'pip m' + (d.m ? ' on' : '') }),
            h('i', { class: 'pip e' + (d.e ? ' on' : '') }))));
      }
      return h('div', { class: 'bp-cal' },
        WEEKDAYS.map((w) => h('div', { class: 'bp-dow', 'aria-hidden': 'true' }, w)), cells);
    }

    function pips(r) {
      const out = [];
      for (let i = 0; i < S.PRIZE_EVERY; i++) out.push(h('i', { class: i < r.cycle ? 'on' : '' }));
      return h('span', { class: 'bp-pips', 'aria-hidden': 'true' }, out);
    }

    async function giveOne(r) {
      const ok = await askConfirm(`לסמן שנמסר ${PRIZE_LABEL} ל${r.member.name}?`, 'כן, נמסר');
      if (!ok) return;
      if (S.addPrize(r.member.id)) toast(`נרשם: ${PRIZE_LABEL} ל${r.member.name}`);
      else toast('אין פרס שמחכה (אולי כבר נרשם ממכשיר אחר)');
    }

    async function undoLast(r) {
      const last = r.given[0];
      if (!last) return;
      if (await askConfirm(`לבטל את הפרס האחרון שנרשם ל${r.member.name} (${hebrewDate(last.ts)})?`, 'כן, לבטל')) S.removePrize(last.id);
    }

    function kidCard(r, rep) {
      const m = r.member;
      const prize = r.available > 0
        ? h('div', { class: 'bp-prize ready' },
          icon('gift', 22),
          h('div', { class: 'grow' }, r.available === 1 ? `מגיע ${PRIZE_LABEL}` : `מגיעים ${r.available} פרסים`,
            h('small', null, r.cycle > 0 ? `ועוד ${r.toNext === 1 ? 'צחצוח אחד' : r.toNext + ' צחצוחים'} לפרס הבא` : 'מתחילים סבב חדש')),
          h('button', { class: 'btn good small', type: 'button', onclick: () => giveOne(r) }, 'נמסר'))
        : h('div', { class: 'bp-prize' },
          pips(r), h('div', { class: 'grow' }, `עוד ${r.toNext === 1 ? 'צחצוח אחד' : r.toNext + ' צחצוחים'} לפרס`));
      return h('section', { class: 'card bp-card' },
        h('div', { class: 'bp-head' }, avatar(m, 44),
          h('div', { class: 'grow' }, h('b', null, m.name),
            h('small', null, r.possible
              ? `${r.monthCount} מתוך ${r.possible} צחצוחים ב${rep.head.name}${r.pct !== null ? ` (${r.pct}%)` : ''}`
              : 'עוד אין נתונים לחודש הזה')),
          h('div', { class: 'bp-big', 'aria-hidden': 'true' }, r.monthCount)),
        prize,
        calendar(r),
        h('div', { class: 'bp-foot' },
          h('span', null, `סה״כ ${r.total} צחצוחים · ${r.earned} פרסים הורווחו · ${r.redeemed} נמסרו`),
          r.given.length > 0 && h('span', { class: 'bp-given' },
            `נמסר: ${r.given.slice(0, 3).map((p) => hebrewDate(p.ts)).join(', ')}`,
            h('button', { class: 'btn small', type: 'button', onclick: () => undoLast(r) }, 'ביטול אחרון'))));
    }

    function who() {
      // קטנים קודם (הפוך מסדר ההגדרה), כמו במסך הצחצוח
      return S.state.members.slice().reverse().map((m) => {
        const on = S.brushTracked(m);
        return h('button', {
          type: 'button', class: 'chip avatar-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false',
          title: on ? 'נמצא בתוכנית. לחיצה תסיר' : 'לא בתוכנית. לחיצה תוסיף',
          onclick: () => S.upsertMember({ ...m, brushPrize: !on }),
        }, avatar(m, 28), m.name);
      });
    }

    /* מספר הפרסים שמחכים (לתגית בלשונית) */
    function waiting() {
      return S.state.members.filter(S.brushTracked).reduce((n, m) => n + S.prizeStatus(m.id).available, 0);
    }

    function view() {
      const rep = compute(S, Date.now(), offset);
      const month = rep.rows.reduce((n, r) => n + r.monthCount, 0);
      const ready = rep.rows.reduce((n, r) => n + r.available, 0);
      const littleFirst = rep.rows.slice().reverse();
      const go = (d) => { offset = Math.min(0, offset + d); render(); };
      return [
        h('section', { class: 'card bp-sum' },
          h('h3', null, 'צחצוח שיניים לפי חודש עברי'),
          h('div', { class: 'bp-nav' },
            h('button', { class: 'btn small', type: 'button', disabled: !rep.canPrev, 'aria-label': 'החודש הקודם', onclick: () => go(-1) }, icon('chevR', 18), 'קודם'),
            h('div', { class: 'bp-month', 'aria-live': 'polite' }, rep.head.title,
              h('small', null, offset === 0 ? 'החודש הנוכחי' : (offset === -1 ? 'החודש שעבר' : `לפני ${-offset} חודשים`))),
            h('button', { class: 'btn small', type: 'button', disabled: !rep.canNext, 'aria-label': 'החודש הבא', onclick: () => go(1) }, 'הבא', icon('chevL', 18))),
          h('div', { class: 'bp-stats' },
            h('div', null, h('b', null, month), h('span', null, `צחצוחים ב${rep.head.name}`)),
            h('div', null, h('b', null, ready), h('span', null, ready === 1 ? 'פרס מחכה' : 'פרסים מחכים'))),
          h('p', null, `כל ${S.PRIZE_EVERY} צחצוחים (בוקר או ערב) שווים ${PRIZE_LABEL}. הפרסים נספרים על כל הצחצוחים ולא רק על החודש שמוצג, ולכן פרס שהורווח לא נעלם עד שמסמנים "נמסר".`),
          h('div', { class: 'bp-legend', 'aria-hidden': 'true' },
            h('span', null, h('i', { class: 'pip m on' }), 'בוקר'),
            h('span', null, h('i', { class: 'pip e on' }), 'ערב'),
            h('span', null, h('i', { class: 'pip' }), 'לא סומן')),
          h('div', { class: 'label', style: { margin: '10px 0 6px' } }, 'מי בתוכנית'),
          h('div', { class: 'chips', style: { marginBottom: 0 } }, who())),
        !rep.hasData && h('div', { class: 'card empty', style: { gridColumn: '1 / -1' } },
          'עוד לא סומן אף צחצוח. הסימון נעשה במסך "צחצוח", ובדרך כלל על ידי הילדים עצמם.'),
        littleFirst.length === 0 && h('div', { class: 'card empty', style: { gridColumn: '1 / -1' } },
          'אף אחד לא בתוכנית כרגע. בחרו למעלה מי משתתף.'),
        littleFirst.map((r) => kidCard(r, rep)),
      ];
    }

    return { view, waiting };
  }

  return { create, compute, gematria, hebrewDate, monthWindow, hasHebrewCalendar: !!HEB };
})();
