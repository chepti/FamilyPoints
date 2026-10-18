/* איורים (SVG מוטבע): סגנון שטוח ורגוע, בלי פרצופים */
const Art = (() => {
  const SKIN = ['#f1c9a5', '#d9a47c', '#b57a52', '#f5d3b8'];
  const HAIR = ['#3b2a20', '#6b4a3a', '#c9a063', '#2b2b33'];

  const person = (x, s, body, i) => `
    <g transform="translate(${x} 195) scale(${s})">
      <rect x="-8" y="-27" width="16" height="27" rx="7" fill="${body}"/>
      <circle cx="0" cy="-35" r="7.5" fill="${SKIN[i % 4]}"/>
      <path d="M-7.6 -36 Q0 -46 7.6 -36 Q3 -39.5 -7.6 -36Z" fill="${HAIR[i % 4]}"/>
    </g>`;

  const flower = (x, y, c) => `
    <g transform="translate(${x} ${y})">
      <path d="M0 0 V14" stroke="#5a9866" stroke-width="2" stroke-linecap="round"/>
      <circle cx="-3.5" cy="-1.5" r="3.2" fill="${c}"/><circle cx="3.5" cy="-1.5" r="3.2" fill="${c}"/>
      <circle cx="0" cy="-5" r="3.2" fill="${c}"/><circle cx="0" cy="2" r="3.2" fill="${c}"/>
      <circle cx="0" cy="-1.5" r="2.2" fill="#f2b134"/>
    </g>`;

  // דגלונים תלויים בין הבית לעץ (נקודות על עקומה ריבועית)
  function bunting() {
    const P0 = [392, 112]; const P1 = [446, 152]; const P2 = [498, 124];
    const colors = ['#e0664a', '#f2b134', '#1f9d8f', '#5a8dee'];
    const pt = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
    let flags = '';
    [0.14, 0.28, 0.42, 0.56, 0.7, 0.84].forEach((t, i) => {
      const [x, y] = pt(t);
      flags += `<path d="M${(x - 6).toFixed(1)} ${y.toFixed(1)} L${(x + 6).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y + 12).toFixed(1)}Z" fill="${colors[i % 4]}"/>`;
    });
    return `<path d="M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" stroke="#7a6a5a" stroke-width="1.6" fill="none"/>${flags}`;
  }

  function hero() {
    return `
<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="בית עם משפחה">
  <defs>
    <linearGradient id="fpSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7e8d2"/><stop offset="1" stop-color="#fdf7ec"/>
    </linearGradient>
    <clipPath id="fpClip"><rect width="640" height="220" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#fpClip)">
    <rect width="640" height="220" fill="url(#fpSky)"/>
    <circle cx="86" cy="62" r="42" fill="#f2b134" opacity=".16"/>
    <circle cx="86" cy="62" r="24" fill="#f2b134"/>
    <g fill="#fff" opacity=".92">
      <ellipse cx="206" cy="58" rx="40" ry="11"/><circle cx="188" cy="51" r="14"/><circle cx="210" cy="45" r="18"/>
      <ellipse cx="528" cy="42" rx="34" ry="9"/><circle cx="514" cy="37" r="11"/><circle cx="534" cy="33" r="14"/>
    </g>
    <path d="M0 168 Q130 118 280 158 T540 148 T640 162 V220 H0Z" fill="#d7e6cb"/>
    <path d="M0 188 Q170 156 330 184 T640 176 V220 H0Z" fill="#b5d3a8"/>
    <path d="M0 204 Q200 184 400 200 T640 196 V220 H0Z" fill="#8fbf8a"/>

    <path d="M306 190 H334 L352 220 H288Z" fill="#efdcc0"/>

    <rect x="350" y="62" width="16" height="32" fill="#b8553f"/>
    <rect x="262" y="106" width="116" height="84" rx="6" fill="#fff8ec" stroke="#ead9bf" stroke-width="2"/>
    <path d="M248 114 L320 52 L392 114Z" fill="#e0664a" stroke="#e0664a" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="320" cy="92" r="9" fill="#d5eaf0" stroke="#fff8ec" stroke-width="3"/>
    <path d="M302 190 V152 a18 18 0 0 1 36 0 V190Z" fill="#1f9d8f"/>
    <circle cx="331" cy="173" r="2.4" fill="#f2b134"/>
    <rect x="274" y="126" width="20" height="20" rx="3" fill="#ffd98c" stroke="#fff8ec" stroke-width="3"/>
    <rect x="346" y="126" width="20" height="20" rx="3" fill="#d5eaf0" stroke="#fff8ec" stroke-width="3"/>
    <g stroke="#fff8ec" stroke-width="2"><path d="M284 126 V146 M274 136 H294"/><path d="M356 126 V146 M346 136 H366"/></g>

    <rect x="494" y="128" width="14" height="60" rx="5" fill="#8d6e63"/>
    <g fill="#5a9866"><circle cx="501" cy="108" r="28"/><circle cx="477" cy="128" r="20"/><circle cx="526" cy="128" r="20"/></g>
    <g fill="#6aa874"><circle cx="496" cy="102" r="16"/><circle cx="516" cy="118" r="12"/></g>
    ${bunting()}

    <ellipse cx="250" cy="190" rx="16" ry="9" fill="#7fb77e"/><ellipse cx="392" cy="191" rx="14" ry="8" fill="#7fb77e"/>
    ${flower(240, 178, '#e0664a')}${flower(404, 180, '#ffffff')}${flower(426, 174, '#f2b134')}${flower(584, 182, '#e0664a')}${flower(40, 184, '#ffffff')}

    ${person(104, 1.25, '#3b6ea5', 0)}
    ${person(144, 1.18, '#e0664a', 1)}
    ${person(180, 0.88, '#f2b134', 2)}
    ${person(208, 0.78, '#1f9d8f', 3)}
    ${person(452, 0.84, '#8d6bb5', 1)}
    ${person(574, 0.74, '#6c9a5b', 2)}
  </g>
</svg>`;
  }

  function empty() {
    return `
<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M70 62 V36" stroke="#5a9866" stroke-width="3" stroke-linecap="round"/>
  <path d="M70 46 C57 46 51 38 51 29 C62 29 70 35 70 46Z" fill="#8fbf8a"/>
  <path d="M70 38 C81 38 89 31 89 21 C79 21 70 28 70 38Z" fill="#5a9866"/>
  <path d="M50 62 H90 L85 90 H55Z" fill="#e0664a"/>
  <rect x="46" y="56" width="48" height="9" rx="3" fill="#d9533a"/>
  <circle cx="26" cy="30" r="3" fill="#f2b134"/><circle cx="116" cy="44" r="2.4" fill="#1f9d8f"/><circle cx="108" cy="18" r="2" fill="#e0664a"/>
</svg>`;
  }

  return { hero, empty };
})();
