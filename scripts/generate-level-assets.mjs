import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetRoot = join(root, 'public/assets/garage-band');

const ensure = (dir) => mkdirSync(join(assetRoot, dir), { recursive: true });
['backgrounds', 'props', 'debris', 'effects'].forEach(ensure);

const svg = (width, height, body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${body}
</svg>
`;

const writeAsset = (relativePath, width, height, body) => {
  writeFileSync(join(assetRoot, relativePath), svg(width, height, body));
};

writeAsset('backgrounds/garage_background.svg', 1700, 960, `
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#221b2f"/>
    <stop offset="0.58" stop-color="#30243a"/>
    <stop offset="1" stop-color="#19161f"/>
  </linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3b3135"/>
    <stop offset="1" stop-color="#1d1a21"/>
  </linearGradient>
  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".35"/>
  </filter>
</defs>
<rect width="1700" height="960" fill="url(#wall)"/>
<circle cx="480" cy="120" r="230" fill="#ff5c8a" opacity=".08"/>
<circle cx="1300" cy="210" r="250" fill="#5de0e6" opacity=".07"/>
<rect x="0" y="760" width="1700" height="200" fill="url(#floor)"/>
<g opacity=".35" stroke="#5d4a5f" stroke-width="3">
  <path d="M0 870 L340 760 M210 960 L540 760 M520 960 L800 760 M820 960 L1050 760 M1130 960 L1320 760 M1450 960 L1580 760"/>
</g>
<g filter="url(#softShadow)">
  <rect x="590" y="115" width="930" height="610" rx="10" fill="#443347" opacity=".82"/>
  <rect x="590" y="115" width="930" height="610" rx="10" fill="none" stroke="#66506a" stroke-width="8" opacity=".7"/>
  <g stroke="#66506a" stroke-width="3" opacity=".38">
    <path d="M590 195H1520 M590 275H1520 M590 355H1520 M590 435H1520 M590 515H1520 M590 595H1520 M690 115V725 M790 115V725 M890 115V725 M990 115V725 M1090 115V725 M1190 115V725 M1290 115V725 M1390 115V725"/>
  </g>
</g>
<g fill="#f8f1dc" opacity=".62" font-family="Arial Black, Impact, sans-serif">
  <text x="650" y="178" font-size="28">THE GARAGE THAT SHOULD HAVE STAYED QUIET</text>
  <text x="1110" y="705" font-size="18" fill="#ffe17d">NO REFUNDS ON PRACTICE SPACE</text>
</g>
<g opacity=".55">
  <rect x="88" y="695" width="260" height="22" rx="11" fill="#111018"/>
  <rect x="125" y="665" width="180" height="28" rx="12" fill="#2d2433" stroke="#5d4a5f" stroke-width="4"/>
  <path d="M132 664c34-58 115-57 151 0" fill="none" stroke="#5d4a5f" stroke-width="10"/>
</g>
`);

const outline = 'stroke="#19161f" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"';

writeAsset('props/folding_table_intact.svg', 260, 100, `
<ellipse cx="130" cy="87" rx="116" ry="10" fill="#000" opacity=".18"/>
<rect x="16" y="16" width="228" height="34" rx="12" fill="#ff8fab" ${outline}/>
<path d="M36 53l28 34M222 53l-30 34M86 53l-16 34M172 53l18 34" stroke="#d8d8ea" stroke-width="8" stroke-linecap="round"/>
<path d="M36 28h168" stroke="#fff7c2" stroke-width="7" opacity=".38"/>
<path d="M178 17l20 33M205 17l22 32" stroke="#19161f" stroke-width="4" opacity=".4"/>
`);

writeAsset('props/questionable_cake_intact.svg', 120, 118, `
<ellipse cx="60" cy="104" rx="45" ry="7" fill="#000" opacity=".18"/>
<path d="M21 48c8-26 69-29 79 0v39c-8 24-72 24-79 0z" fill="#ffe066" ${outline}/>
<path d="M23 55c18 13 56 13 75 0" fill="none" stroke="#fff7c2" stroke-width="9" opacity=".65"/>
<path d="M33 46c9 10 13 22 6 33M68 45c9 13 12 26 0 41M89 48c6 12 8 22 1 32" stroke="#fb7185" stroke-width="5" opacity=".75"/>
<circle cx="43" cy="36" r="6" fill="#f472b6"/>
<circle cx="76" cy="34" r="6" fill="#38bdf8"/>
<path d="M48 19h24l-10 15z" fill="#fb923c" stroke="#19161f" stroke-width="4"/>
`);

writeAsset('props/old_tv_intact.svg', 150, 138, `
<ellipse cx="75" cy="124" rx="58" ry="8" fill="#000" opacity=".2"/>
<path d="M24 33h102c9 0 16 7 16 16v56c0 9-7 16-16 16H24c-9 0-16-7-16-16V49c0-9 7-16 16-16z" fill="#2dd4bf" ${outline}/>
<rect x="23" y="48" width="70" height="54" rx="8" fill="#1d1a21" stroke="#19161f" stroke-width="6"/>
<path d="M35 59c18 7 33 7 48 0" stroke="#93f5ff" stroke-width="5" opacity=".8"/>
<circle cx="115" cy="57" r="8" fill="#ffe17d" stroke="#19161f" stroke-width="5"/>
<circle cx="116" cy="86" r="10" fill="#fb7185" stroke="#19161f" stroke-width="5"/>
<path d="M57 33L29 8M83 33l28-25" stroke="#d8d8ea" stroke-width="7"/>
<path d="M31 111h88" stroke="#19161f" stroke-width="6" opacity=".42"/>
`);

writeAsset('props/speaker_stack_intact.svg', 116, 225, `
<ellipse cx="58" cy="210" rx="45" ry="8" fill="#000" opacity=".2"/>
<rect x="13" y="10" width="90" height="196" rx="11" fill="#a78bfa" ${outline}/>
<rect x="25" y="24" width="66" height="54" rx="6" fill="#241f2c" stroke="#19161f" stroke-width="5"/>
<circle cx="58" cy="51" r="18" fill="#4a3b4f" stroke="#d8d8ea" stroke-width="5"/>
<rect x="25" y="92" width="66" height="92" rx="8" fill="#241f2c" stroke="#19161f" stroke-width="5"/>
<circle cx="58" cy="137" r="31" fill="#4a3b4f" stroke="#d8d8ea" stroke-width="6"/>
<path d="M33 31h50M31 100h54" stroke="#fff7c2" stroke-width="4" opacity=".32"/>
<path d="M82 14l17 22M18 174l20 28" stroke="#ff5c8a" stroke-width="7"/>
`);

writeAsset('props/cooler_intact.svg', 150, 92, `
<ellipse cx="75" cy="80" rx="58" ry="7" fill="#000" opacity=".18"/>
<rect x="16" y="27" width="118" height="47" rx="11" fill="#fb7185" ${outline}/>
<path d="M31 17h88c8 0 14 6 14 14v9H17v-9c0-8 6-14 14-14z" fill="#38bdf8" ${outline}/>
<path d="M48 18c4-15 50-15 55 0" fill="none" stroke="#d8d8ea" stroke-width="9"/>
<path d="M36 53h48" stroke="#fff7c2" stroke-width="5" opacity=".45"/>
<path d="M99 51l19 15M111 49l-13 17" stroke="#19161f" stroke-width="4" opacity=".5"/>
`);

writeAsset('props/garage_shelf_intact.svg', 330, 105, `
<ellipse cx="165" cy="94" rx="132" ry="8" fill="#000" opacity=".18"/>
<path d="M18 52h294v26H18z" fill="#b97842" ${outline}/>
<path d="M36 15v77M294 15v77" stroke="#6b4a35" stroke-width="13" stroke-linecap="round"/>
<path d="M44 34h68l9 18H35z" fill="#fb923c" stroke="#19161f" stroke-width="6"/>
<rect x="134" y="24" width="58" height="31" rx="7" fill="#38bdf8" stroke="#19161f" stroke-width="6"/>
<path d="M216 56c-6-21 62-22 55 0" fill="#5d4a5f" stroke="#19161f" stroke-width="6"/>
<path d="M50 66h220" stroke="#fff7c2" stroke-width="5" opacity=".25"/>
`);

writeAsset('props/paint_can_intact.svg', 86, 92, `
<ellipse cx="43" cy="81" rx="30" ry="6" fill="#000" opacity=".2"/>
<path d="M18 29c5-14 45-14 50 0v39c-5 15-45 15-50 0z" fill="#facc15" ${outline}/>
<ellipse cx="43" cy="29" rx="25" ry="11" fill="#fff7c2" stroke="#19161f" stroke-width="6"/>
<path d="M26 26c4-21 30-21 34 0" fill="none" stroke="#d8d8ea" stroke-width="5"/>
<path d="M24 48c12 7 25 7 38 0" stroke="#fb7185" stroke-width="7"/>
<circle cx="52" cy="59" r="5" fill="#38bdf8"/>
`);

writeAsset('props/cable_bin_intact.svg', 130, 90, `
<ellipse cx="65" cy="78" rx="48" ry="7" fill="#000" opacity=".18"/>
<path d="M17 30h96l-10 43H27z" fill="#38bdf8" ${outline}/>
<path d="M32 30c-5-25 29-25 24 0M63 30c-5-30 39-30 34 0M42 30c0-17 35-17 35 0" fill="none" stroke="#19161f" stroke-width="7"/>
<path d="M32 47c22 18 44-14 68 7M38 62c19-11 38 12 55 0" fill="none" stroke="#f472b6" stroke-width="5"/>
<path d="M28 38h78" stroke="#fff7c2" stroke-width="5" opacity=".35"/>
`);

writeAsset('props/mystery_box_intact.svg', 104, 104, `
<ellipse cx="52" cy="91" rx="40" ry="7" fill="#000" opacity=".18"/>
<rect x="15" y="23" width="74" height="64" rx="7" fill="#fb923c" ${outline}/>
<path d="M15 46h74M52 23v64" stroke="#6b4a35" stroke-width="7"/>
<path d="M36 39c0-15 29-15 29 0 0 13-14 11-14 24" fill="none" stroke="#fff7c2" stroke-width="8"/>
<circle cx="52" cy="73" r="5" fill="#fff7c2"/>
<path d="M24 29h18M61 29h18" stroke="#ffe17d" stroke-width="4" opacity=".5"/>
`);

writeAsset('props/neon_sign_intact.svg', 265, 86, `
<ellipse cx="132" cy="74" rx="110" ry="7" fill="#000" opacity=".14"/>
<rect x="14" y="20" width="237" height="39" rx="18" fill="#241f2c" stroke="#19161f" stroke-width="8"/>
<path d="M39 44c15-31 44-31 59 0 14-29 45-29 59 0 15-30 45-30 61 0" fill="none" stroke="#f472b6" stroke-width="9" stroke-linecap="round"/>
<path d="M39 44c15-31 44-31 59 0 14-29 45-29 59 0 15-30 45-30 61 0" fill="none" stroke="#fff7c2" stroke-width="3" stroke-linecap="round"/>
<circle cx="32" cy="39" r="6" fill="#38bdf8"/>
<circle cx="232" cy="39" r="6" fill="#38bdf8"/>
`);

writeAsset('props/tiny_drum_kit_intact.svg', 150, 150, `
<ellipse cx="75" cy="134" rx="58" ry="8" fill="#000" opacity=".19"/>
<circle cx="75" cy="84" r="39" fill="#e879f9" ${outline}/>
<circle cx="75" cy="84" r="24" fill="#241f2c" stroke="#d8d8ea" stroke-width="7"/>
<circle cx="33" cy="67" r="23" fill="#ff8fab" ${outline}/>
<circle cx="119" cy="68" r="21" fill="#38bdf8" ${outline}/>
<ellipse cx="111" cy="36" rx="29" ry="12" fill="#f7d65b" stroke="#19161f" stroke-width="6" transform="rotate(-12 111 36)"/>
<path d="M42 108l-15 28M108 108l18 28" stroke="#d8d8ea" stroke-width="7"/>
`);

writeAsset('props/garage_window_intact.svg', 84, 245, `
<ellipse cx="42" cy="226" rx="30" ry="7" fill="#000" opacity=".16"/>
<rect x="16" y="14" width="52" height="208" rx="7" fill="#93c5fd" opacity=".9" ${outline}/>
<path d="M42 17v202M18 70h48M18 123h48M18 176h48" stroke="#19161f" stroke-width="6"/>
<path d="M27 32l26 27M30 94l22 21M29 146l25 25" stroke="#fff7c2" stroke-width="5" opacity=".55"/>
<path d="M59 184l-18 22" stroke="#38bdf8" stroke-width="5"/>
`);

writeAsset('debris/wood_chunk_01.svg', 48, 38, `<path d="M8 10l28-5 6 18-23 10z" fill="#b97842" ${outline}/><path d="M15 14l18 8" stroke="#6b4a35" stroke-width="4"/>`);
writeAsset('debris/wood_chunk_02.svg', 52, 34, `<path d="M9 18L27 5l18 9-9 16-22-2z" fill="#d08a4b" ${outline}/><path d="M23 11l-4 15M32 13l5 10" stroke="#6b4a35" stroke-width="4"/>`);
writeAsset('debris/glass_chunk_01.svg', 44, 40, `<path d="M8 30L20 5l18 24z" fill="#94f4ff" opacity=".86" ${outline}/><path d="M19 10l4 18" stroke="#fff" stroke-width="3" opacity=".7"/>`);
writeAsset('debris/metal_chunk_01.svg', 50, 36, `<path d="M7 20L22 5l21 8-6 17-24 1z" fill="#b7b7c9" ${outline}/><path d="M19 12h17" stroke="#f8f1dc" stroke-width="3" opacity=".45"/>`);
writeAsset('debris/fabric_scrap_01.svg', 54, 38, `<path d="M8 22c11-18 19 10 35-8l3 15c-16 13-24-7-35 4z" fill="#f472b6" ${outline}/><path d="M17 22c7 4 14 5 22 0" stroke="#fff7c2" stroke-width="3" opacity=".45"/>`);

writeAsset('effects/impact_star.svg', 92, 92, `<path d="M46 5l9 27 29-8-20 23 22 20-30-4-10 24-10-24-30 4 22-20-20-23 29 8z" fill="#ffe17d" ${outline}/><path d="M46 21l5 20 20-3-15 14 13 13-20-3-3 15-4-15-20 3 14-13-15-14 20 3z" fill="#fb7185"/>`);
writeAsset('effects/dust_puff.svg', 84, 84, `<g fill="#e3c9a3" stroke="#19161f" stroke-width="5" opacity=".88"><circle cx="31" cy="46" r="19"/><circle cx="49" cy="34" r="20"/><circle cx="55" cy="54" r="17"/><circle cx="25" cy="29" r="12"/></g>`);
writeAsset('effects/spark_01.svg', 64, 64, `<path d="M32 3l6 20 20-8-13 17 16 14-21-4-8 19-7-19-22 4 17-14L7 15l20 8z" fill="#38bdf8" ${outline}/><path d="M31 14l4 15 15-4-10 10 9 9-14-3-4 12-4-12-14 3 10-9-10-10 15 4z" fill="#fff7c2"/>`);
writeAsset('effects/smoke_puff.svg', 96, 96, `<g fill="#c084fc" stroke="#19161f" stroke-width="5" opacity=".78"><circle cx="38" cy="54" r="24"/><circle cx="59" cy="40" r="26"/><circle cx="65" cy="62" r="18"/><circle cx="27" cy="34" r="14"/></g><path d="M30 53c17 9 31 7 45-8" stroke="#f8f1dc" stroke-width="4" opacity=".32" fill="none"/>`);
