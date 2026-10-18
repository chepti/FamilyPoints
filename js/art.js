/* איורים (SVG מוטבע) */
const Art = (() => {
  const person = (x, s, body, hair) => `
    <g transform="translate(${x} 192) scale(${s})">
      <path d="M-9 0 L-7 -22 Q0 -28 7 -22 L9 0Z" fill="${body}"/>
      <path d="M-7 -20 L-15 -31" stroke="#ffd8b5" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M7 -20 L15 -29" stroke="#ffd8b5" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="0" cy="-33" r="9.5" fill="#ffd8b5"/>
      <path d="M-9.5 -34 Q0 -48 9.5 -34 Q0 -39 -9.5 -34Z" fill="${hair}"/>
      <circle cx="-3.2" cy="-32" r="1.3" fill="#4a3b52"/>
      <circle cx="3.2" cy="-32" r="1.3" fill="#4a3b52"/>
      <path d="M-3.5 -28.5 Q0 -25.5 3.5 -28.5" stroke="#4a3b52" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <circle cx="-6" cy="-29" r="1.8" fill="#ff9aa8" opacity=".7"/>
      <circle cx="6" cy="-29" r="1.8" fill="#ff9aa8" opacity=".7"/>
    </g>`;

  const sparkle = (x, y, s, c = '#ffd23f') => `
    <path transform="translate(${x} ${y}) scale(${s})" fill="${c}"
      d="M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8Z"/>`;

  const flower = (x, y, c) => `
    <g transform="translate(${x} ${y})">
      <path d="M0 0 V14" stroke="#3f9d5c" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="-4" cy="-2" r="3.6" fill="${c}"/><circle cx="4" cy="-2" r="3.6" fill="${c}"/>
      <circle cx="0" cy="-6" r="3.6" fill="${c}"/><circle cx="0" cy="2" r="3.6" fill="${c}"/>
      <circle cx="0" cy="-2" r="2.8" fill="#ffd23f"/>
    </g>`;

  function hero() {
    return `
<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="בית שמח עם כל המשפחה">
  <defs>
    <linearGradient id="fpSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9e0ff"/><stop offset="1" stop-color="#fff2d2"/>
    </linearGradient>
    <clipPath id="fpClip"><rect width="640" height="220" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#fpClip)">
    <rect width="640" height="220" fill="url(#fpSky)"/>
    <g transform="translate(70 62)">
      <g stroke="#ffb800" stroke-width="5" stroke-linecap="round">
        <path d="M0 -42 V-34"/><path d="M0 34 V42"/><path d="M-42 0 H-34"/><path d="M34 0 H42"/>
        <path d="M-30 -30 L-24 -24"/><path d="M24 24 L30 30"/><path d="M-30 30 L-24 24"/><path d="M24 -24 L30 -30"/>
      </g>
      <circle r="26" fill="#ffd23f"/>
      <circle cx="-8" cy="-4" r="2.6" fill="#7a4b00"/><circle cx="8" cy="-4" r="2.6" fill="#7a4b00"/>
      <path d="M-8 6 Q0 14 8 6" stroke="#7a4b00" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="-15" cy="4" r="4" fill="#ff9d6c" opacity=".7"/><circle cx="15" cy="4" r="4" fill="#ff9d6c" opacity=".7"/>
    </g>
    <g fill="#fff">
      <ellipse cx="200" cy="58" rx="42" ry="12"/><circle cx="180" cy="50" r="15"/><circle cx="204" cy="44" r="19"/><circle cx="226" cy="52" r="13"/>
      <ellipse cx="520" cy="44" rx="36" ry="10"/><circle cx="504" cy="38" r="12"/><circle cx="526" cy="33" r="16"/><circle cx="544" cy="40" r="11"/>
    </g>
    ${sparkle(30, 128, 1)}${sparkle(596, 96, 1.2)}${sparkle(430, 30, .9)}${sparkle(262, 26, .8, '#ff9aa8')}${sparkle(605, 160, .7, '#fff')}
    <path d="M0 172 Q120 120 270 160 T520 150 T640 165 V220 H0Z" fill="#a4e6ad"/>
    <path d="M0 196 Q160 162 320 188 T640 182 V220 H0Z" fill="#6fcf84"/>

    <!-- בית -->
    <rect x="350" y="62" width="16" height="32" fill="#c9694a"/>
    <path d="M358 52 c-6 -8 -16 0 -8 7 l8 7 l8 -7 c8 -7 -2 -15 -8 -7Z" fill="#ff7b9c" transform="translate(0 -14) scale(.9) translate(36 4)"/>
    <rect x="262" y="106" width="116" height="84" rx="8" fill="#ffe2b8" stroke="#f2b97a" stroke-width="3"/>
    <path d="M248 114 L320 52 L392 114Z" fill="#ff7b7b" stroke="#e85d5d" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="320" cy="92" r="9" fill="#bfe9ff" stroke="#fff" stroke-width="3"/>
    <path d="M302 190 V152 a18 18 0 0 1 36 0 V190Z" fill="#8b6bd9"/>
    <circle cx="332" cy="172" r="2.6" fill="#ffd23f"/>
    <g fill="#bfe9ff" stroke="#fff" stroke-width="3">
      <rect x="274" y="126" width="20" height="20" rx="4"/><rect x="346" y="126" width="20" height="20" rx="4"/>
    </g>
    <g stroke="#fff" stroke-width="2"><path d="M284 126 V146 M274 136 H294"/><path d="M356 126 V146 M346 136 H366"/></g>

    <!-- עץ -->
    <rect x="494" y="128" width="14" height="58" rx="5" fill="#a9744f"/>
    <g fill="#4fb477"><circle cx="501" cy="110" r="28"/><circle cx="477" cy="128" r="20"/><circle cx="526" cy="128" r="20"/></g>
    <g fill="#ff5d5d"><circle cx="490" cy="108" r="4.5"/><circle cx="513" cy="120" r="4.5"/><circle cx="480" cy="130" r="4.5"/><circle cx="508" cy="96" r="4.5"/></g>

    ${flower(246, 176, '#ff8fab')}${flower(402, 178, '#ffffff')}${flower(424, 172, '#ff9d6c')}${flower(580, 180, '#ff8fab')}${flower(40, 182, '#ffffff')}

    ${person(100, 1.3, '#5aa9e6', '#6b4a3a')}
    ${person(142, 1.2, '#ff8fab', '#3b2a20')}
    ${person(180, .85, '#ffb703', '#c9694a')}
    ${person(208, .75, '#90be6d', '#4a3b52')}
    ${person(448, .8, '#b392f5', '#3b2a20')}
    ${person(572, .7, '#4dd4c4', '#c9694a')}
  </g>
</svg>`;
  }

  function empty() {
    return `
<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="#e6f4ff"><ellipse cx="70" cy="66" rx="48" ry="18"/><circle cx="46" cy="52" r="18"/><circle cx="72" cy="42" r="24"/><circle cx="98" cy="54" r="16"/></g>
  <circle cx="60" cy="56" r="3" fill="#4a3b52"/><circle cx="82" cy="56" r="3" fill="#4a3b52"/>
  <path d="M62 65 Q71 73 80 65" stroke="#4a3b52" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="52" cy="64" r="4.5" fill="#ffb3c1" opacity=".8"/><circle cx="90" cy="64" r="4.5" fill="#ffb3c1" opacity=".8"/>
  ${sparkle(22, 24, 1.2)}${sparkle(122, 30, 1, '#ff9aa8')}${sparkle(112, 80, .7, '#7c5cff')}
</svg>`;
  }

  return { hero, empty };
})();
