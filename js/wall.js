/* "View on your wall": photograph a wall (or pick a sample room), mark the four corners of something rectangular of known
   size, then swipe through the gallery's wall art at true size and in true perspective, even on a wall photographed at an
   angle. Works are never cropped or stretched: each is drawn at its photograph's own proportions.
   Every work is pictured in the 10 mm oak shadow frame (7 mm oak, 3 mm gap, no mat) unless the visitor picks another.
   Ritushka originals say whether they are sold framed. Print framing is quoted separately, so the price is the print alone.
   Prices and the "Add to cart" button come from catalog.json through bag.js. The visitor's photo never leaves the device. */
(() => {
'use strict';
const app = document.getElementById('wallApp'); if (!app) return;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const money = n => 'AUD $' + n.toLocaleString('en-AU');
const nums = s => (String(s || '').match(/\d+(\.\d+)?/g) || []).map(Number);
const file = p => String(p || '').split('?')[0].split('/').pop();

/* Sample rooms: photographed interiors from the art mock-up library, each with its back wall at an angle. H maps the wall
   in cm (origin at its top-left, y down) to pixels of the 1600 px image. x, y: where a work hangs, in wall cm; bottom: the
   lowest its bottom edge may go (clear of furniture); top: the highest its top edge may go. Same rule as the mock-ups. */
const SAMPLES = [
  { id: 'heritage-gallery', label: 'Gallery', h: 1073, H: [0.104735, 0.00681581, 543.038, -0.368472, 0.880897, 369.62, -0.000702582, 4.89722e-06, 1], x: 450.0, y: 155.0, bottom: 225.0, top: 25.0 },
  { id: 'coastal-living-room', label: 'Living room', h: 1073, H: [3.47387, 0, 227.848, 0.634429, 2.89381, 91.2025, 0.00117977, 0, 1], x: 271.0, y: 169.0, bottom: 169.0, top: 25.0 },
  { id: 'art-deco-hotel-lounge', label: 'Hotel lounge', h: 1073, H: [3.32106, 0, 411.392, 0.838087, 2.95747, -119.051, 0.00161859, 0, 1], x: 228.6, y: 230.0, bottom: 230.0, top: 25.0 },
  { id: 'harbourside-boardroom', label: 'Boardroom', h: 1073, H: [3.30628, 0, 329.114, 0.567887, 2.75059, 67.2152, 0.00111726, 0, 1], x: 206.8, y: 120.0, bottom: 210.0, top: 25.0 },
  { id: 'architect-studio-entry', label: 'Studio', h: 1073, H: [3.52279, 0, 455.696, 0.646071, 2.7055, 31.2658, 0.00129147, 0, 1], x: 247.7, y: 221.5, bottom: 221.5, top: 25.0 },
  { id: 'moody-hotel-bedroom', label: 'Bedroom', h: 1073, H: [3.58172, 0, 189.873, 0.633746, 2.89489, 8.22785, 0.00131691, 0, 1], x: 246.6, y: 161.5, bottom: 161.5, top: 25.0 },
  { id: 'melbourne-penthouse', label: 'Penthouse', h: 1073, H: [0.562958, 0, 303.797, -0.320975, 1.28903, 275, -0.000738731, 0, 1], x: 405.4, y: 181.9, bottom: 181.9, top: 25.0 },
  { id: 'japanese-restaurant', label: 'Restaurant', h: 1073, H: [0.642932, 0, 462.025, -0.408725, 1.83671, 194.62, -0.000923262, 0, 1], x: 264.0, y: 180.0, bottom: 180.0, top: 25.0 },
  { id: 'upstairs-landing', label: 'Landing', h: 1073, H: [3.14732, 0, 278.481, 0.424997, 2.63901, 170.127, 0.00103593, 0, 1], x: 210.3, y: 188.9, bottom: 188.9, top: 25.0 },
].map(s => ({ ...s, w: 1600, src: `img/rooms/${s.id}.jpg`, thumb: `img/rooms/${s.id}-thumb.jpg` }));
/* something rectangular on the wall, of known size; a door also tells us where the floor is */
const PRESETS = [
  ['A standard door (82 × 204 cm)', 82, 204, true], ['An A4 sheet taped up (21 × 29.7 cm)', 21, 29.7],
  ['A light switch plate (7.2 × 11.5 cm)', 7.2, 11.5], ["Something else I've measured", null, null],
];
const MOULD = [['oak-shadow', 'Oak shadow frame'], ['none', 'No frame'], ['black', 'Black'], ['oak', 'Oak'], ['white', 'White']];
const MATS = [['none', 'No mat', 0], ['white-5', 'White 5 cm', 5], ['white-8', 'White 8 cm', 8], ['white-12', 'White 12 cm', 12]];
const GLASS = [
  ['clear', 'Clear', 0.2, 'Standard picture glass. Clear, but you will see reflections.'],
  ['non-reflective', 'Non-reflective', 0.06, 'Etched to cut glare. Detail is very slightly softened.'],
  ['museum', 'Museum', 0.02, 'Anti-reflective and UV protective. Almost invisible.'],
  ['acrylic', 'Acrylic', 0.12, 'Lighter and shatter-resistant. Good for larger prints.'],
];
const FLOAT = { face: 1.6, gap: 1.0 }, SHADOW = 1.0 /* oak shadow frame: 7 mm oak + 3 mm gap */, PAPER_FACE = 2.4, BEVEL = 0.35;
const KPX = 4; // px per cm a work is drawn at before it is projected onto the wall
const MODES = [['rit', 'Ritushka originals'], ['prints', 'Ritushka prints'], ['fifty', 'Fifty Pages of Shades']];

/* ---- perspective: one 3x3 homography maps wall cm to photo px, found from four corners of a known rectangle ---- */
function solveH(src, dst) {
  const a = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 8; r++) { if (r === c || !a[c][c]) continue; const f = a[r][c] / a[c][c]; for (let k = c; k < 9; k++) a[r][k] -= f * a[c][k]; }
  }
  return [...a.map((row, i) => row[8] / row[i]), 1];
}
const mul3 = (a, b) => { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]); return o; };
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(v => v / det);
}
const applyH = (m, p) => { const w = m[6] * p.x + m[7] * p.y + m[8]; return { x: (m[0] * p.x + m[1] * p.y + m[2]) / w, y: (m[3] * p.x + m[4] * p.y + m[5]) / w }; };
const cssMatrix = m => `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,${m[8]})`;

/* ---- the works, from catalog.json ---- */
let groups = { rit: [], prints: [], fifty: [] };
const framedRit = {};
((window.NITA_DATA || {}).rit || []).forEach(a => { framedRit[file(a.img)] = !!a.framed; });

function build(cat) {
  const items = cat.items || [];
  /* two numbers from "a × b cm"; which is the width is settled from the picture itself once it loads */
  const dims = s => { const [a, b] = nums(s); return a && b ? [a, b] : null; };
  groups.rit = items.filter(i => i.brand === 'ritushka' && i.type === 'Paintings' && !i.sold && dims(i.size)).map(i => ({
    key: i.id, title: i.name, img: i.img, thumb: i.thumb, kind: 'canvas', framed: framedRit[file(i.thumb)] ?? /floating oak/i.test(i.desc || ''),
    sizes: [{ label: 'Original', d: dims(i.size), id: i.id, price: i.price, sold: i.sold }],
  }));
  const byPrint = {};
  items.filter(i => i.type === 'Prints' && dims(i.dims)).forEach(i => {
    const g = byPrint[i.print] || (byPrint[i.print] = { key: i.print, title: i.title, img: i.img, thumb: i.thumb, kind: 'paper', sizes: [] });
    g.sizes.push({ label: i.variant, d: dims(i.dims), id: i.id, price: i.price, sold: i.sold, note: i.edition ? `Edition of ${i.edition}, signed and numbered.` : '' });
  });
  groups.prints = Object.values(byPrint);
  groups.fifty = items.filter(i => i.brand === 'nick-brand' && dims(i.size)).map(i => ({
    key: i.id, title: i.name, img: i.img, thumb: i.thumb, kind: 'canvas-choice',
    sizes: [{ label: 'As listed', d: dims(i.size), id: i.id, price: i.price, sold: i.sold }],
  }));
}

/* ---- state ---- */
const S = {
  step: 'start', room: null, handles: [], preset: 0, refW: 82, refH: 204,
  mode: 'rit', idx: 0, sizeIdx: 0, mould: 'oak-shadow', mat: 'none', glass: 'non-reflective', canvasMould: 'oak-shadow',
  pos: null, bright: 1, scale: 0.3,
};
const aspect = {}; // image file -> width / height, once loaded
const list = () => groups[S.mode];
const item = () => list()[clamp(S.idx, 0, list().length - 1)];
const size = () => { const it = item(); return it.sizes[clamp(S.sizeIdx, 0, it.sizes.length - 1)]; };

/* width and height in cm as listed: the longer number goes on the picture's longer side */
function wh(it, sz) {
  const [a, b] = sz.d, r = aspect[file(it.img)];
  if (!r) return { w: a, h: b };
  const long = Math.max(a, b), short = Math.min(a, b);
  return r >= 1 ? { w: long, h: short } : { w: short, h: long };
}
/* the size the photograph is drawn at, never cropped or stretched: a painting or canvas keeps its listed area, a print
   (made from the photograph) its long edge */
function drawn(it, d) {
  const r = aspect[file(it.img)]; if (!r) return d;
  if (it.kind === 'paper') return d.w >= d.h ? { w: d.w, h: d.w / r } : { w: d.h * r, h: d.h };
  const s = Math.sqrt(d.w * d.h / r); return { w: s * r, h: s };
}
function look(it) {
  if (it.kind === 'canvas') return { kind: 'canvas', mould: 'oak-shadow' };
  if (it.kind === 'canvas-choice') return { kind: 'canvas', mould: S.canvasMould };
  return { kind: 'paper', mould: S.mould, mat: S.mat, glass: S.glass };
}
function outer(d, lk) {
  if (lk.mould === 'oak-shadow') return { w: d.w + 2 * SHADOW, h: d.h + 2 * SHADOW };
  if (lk.kind === 'canvas') { const add = lk.mould === 'none' ? 0 : 2 * (FLOAT.face + FLOAT.gap); return { w: d.w + add, h: d.h + add }; }
  if (lk.mould === 'none') return d;
  const m = (MATS.find(x => x[0] === lk.mat) || MATS[0])[2], add = 2 * (m + PAPER_FACE);
  return { w: d.w + add, h: d.h + add };
}
function mouldBg(id) {
  if (id === 'oak') return 'repeating-linear-gradient(100deg,rgba(110,75,40,.16) 0 2px,transparent 2px 6px,rgba(255,240,210,.1) 6px 7px,transparent 7px 11px),linear-gradient(135deg,#d6b583 0%,#bb915d 45%,#c9a26d 70%,#b08452 100%)';
  if (id === 'white') return 'linear-gradient(135deg,#fdfcf8 0%,#ebe8e0 60%,#f5f3ee 100%)';
  return 'linear-gradient(135deg,#2e2e2e 0%,#101010 45%,#1f1f1f 100%)';
}

/* the work as it hangs, drawn at k pixels per cm */
function pieceHTML(it, d, lk, k) {
  const px = cm => Math.max(1, cm * k).toFixed(2) + 'px';
  const shadow = `${px(.6)} ${px(1.8)} ${px(3.5)} rgba(0,0,0,.38),0 ${px(.3)} ${px(.8)} rgba(0,0,0,.25)`;
  const img = `<img src="${esc(it.img)}" alt="" draggable="false" style="display:block;width:${(d.w * k).toFixed(2)}px;height:${(d.h * k).toFixed(2)}px;object-fit:contain">`;
  if (lk.mould === 'oak-shadow') // the brand frame image, as on the shop pages: 56 px of oak and gap, stretched to 10 mm
    return `<div style="border:${px(SHADOW)} solid transparent;border-image:url(img/brand/frame-oak.png) 56 stretch;box-shadow:${shadow}">${img}</div>`;
  if (lk.kind === 'canvas') {
    if (lk.mould === 'none') return `<div style="box-shadow:${px(1)} ${px(2.5)} ${px(4)} rgba(0,0,0,.4)">${img}</div>`;
    return `<div style="background:${mouldBg(lk.mould)};padding:${px(FLOAT.face)};box-shadow:${shadow},inset 0 0 0 1px rgba(0,0,0,.25)">
      <div style="background:#0d0c0b;padding:${px(FLOAT.gap)};box-shadow:inset ${px(.4)} ${px(.4)} ${px(.8)} rgba(0,0,0,.9)">
      <div style="box-shadow:${px(.3)} ${px(.5)} ${px(.7)} rgba(0,0,0,.6)">${img}</div></div></div>`;
  }
  if (lk.mould === 'none') return `<div style="box-shadow:0 ${px(.3)} ${px(1)} rgba(0,0,0,.3)">${img}</div>`;
  const m = (MATS.find(x => x[0] === lk.mat) || MATS[0])[2], g = (GLASS.find(x => x[0] === lk.glass) || GLASS[0])[2];
  const inner = m > 0
    ? `<div style="background:#f3f1ea;padding:${px(m)};box-shadow:inset ${px(.25)} ${px(.25)} ${px(.6)} rgba(0,0,0,.35)"><div style="outline:${px(BEVEL)} solid #f7f5ef;box-shadow:0 0 0 calc(${px(BEVEL)} + 1px) rgba(0,0,0,.12)">${img}</div></div>`
    : img;
  return `<div style="position:relative;background:${mouldBg(lk.mould)};padding:${px(PAPER_FACE)};box-shadow:${shadow},inset 0 0 0 1px rgba(0,0,0,.2)">
    <div style="box-shadow:inset 0 0 ${px(.5)} rgba(0,0,0,.5)">${inner}</div>
    <div aria-hidden="true" style="position:absolute;inset:${px(PAPER_FACE)};pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,${g * 1.4}) 0%,rgba(255,255,255,${g * .5}) 22%,rgba(255,255,255,0) 38%,rgba(255,255,255,0) 62%,rgba(255,255,255,${g * .6}) 78%,rgba(255,255,255,0) 92%)"></div></div>`;
}

/* ---- sizing and placing ---- */
function fit() {
  const wrap = app.querySelector('.wv-stagewrap'); if (!wrap || !S.room) return;
  const maxH = innerHeight * 0.75;
  S.scale = Math.min(wrap.clientWidth, maxH * S.room.w / S.room.h) / S.room.w;
}
function current() {
  const it = item(), sz = size(), lk = look(it), d = wh(it, sz), dz = drawn(it, d), o = outer(dz, lk);
  return { it, sz, lk, d, dz, o };
}
/* where the work hangs, in wall cm; positions stay in wall cm so a work dragged along an angled wall stays on it */
function centre(o) {
  if (S.pos) return S.pos;
  const r = S.room;
  if (r.sample) { const s = r.sample; return { x: s.x, y: Math.max(s.top + o.h / 2, Math.min(s.y, s.bottom - o.h / 2)) }; }
  const mid = applyH(inv3(r.H), { x: r.w / 2, y: r.h * 0.45 });
  return { x: mid.x, y: r.floorY != null ? r.floorY - 150 : mid.y };
}
/* the work is drawn flat at KPX px per cm, then projected: local px -> wall cm -> photo px (H) -> screen px */
function place(el, c) {
  const at = centre(c.o), X0 = at.x - c.o.w / 2, Y0 = at.y - c.o.h / 2;
  const T = [1 / KPX, 0, X0, 0, 1 / KPX, Y0, 0, 0, 1], Sc = [S.scale, 0, 0, 0, S.scale, 0, 0, 0, 1];
  el.style.left = '0'; el.style.top = '0'; el.style.width = c.o.w * KPX + 'px'; el.style.height = c.o.h * KPX + 'px';
  el.style.transformOrigin = '0 0'; el.style.transform = cssMatrix(mul3(Sc, mul3(S.room.H, T)));
}
/* the four corners must make a real, unfolded shape */
function measureOk() {
  const h = S.handles, area = h.reduce((s, p, i) => { const q = h[(i + 1) % 4]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
  return Math.abs(area) > 400 && S.refW > 0 && S.refH > 0;
}

/* ---- rendering ---- */
function pill(on, attrs, label) { return `<button type="button" class="wv-pill${on ? ' on' : ''}" ${attrs}>${esc(label)}</button>`; }

function renderStart() {
  app.innerHTML = `<div class="wv-start">
    <div><p class="kicker">Step 1</p><h2 class="wv-h">Photograph your wall</h2>
      <p class="wv-p">Take a photo of the wall from where you would usually see it, straight on or at an angle. Include something rectangular you know the size of: a door, an A4 sheet taped to the wall, or a light switch plate. Your photo stays on your device and is never uploaded.</p>
      <input type="file" accept="image/*" capture="environment" id="wvFile" hidden>
      <button type="button" class="btn" id="wvPhoto"><span>Take or upload a photo</span></button></div>
    <div><p class="kicker">Or try a sample room</p><div class="wv-samples">${SAMPLES.map(s =>
      `<button type="button" data-sample="${s.id}"><img src="${s.thumb}" alt="Sample ${s.label.toLowerCase()}" width="640" height="429" loading="lazy"><span>${s.label}</span></button>`).join('')}</div></div>
  </div>`;
}

function renderMeasure() {
  const r = S.room;
  app.innerHTML = `<div class="wv-cols">
    <div class="wv-stagewrap"><div class="wv-stage" id="wvStage" style="touch-action:none">
      <img src="${esc(r.src)}" alt="Your wall" draggable="false" class="wv-room">
      <svg class="wv-line" id="wvLine"><polygon fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="4" stroke-opacity=".9"/><polygon fill="none" stroke="#111" stroke-width="2" stroke-dasharray="8 6"/></svg>
      ${['Top left', 'Top right', 'Bottom right', 'Bottom left'].map((l, i) => `<div class="wv-handle" data-h="${i}" role="slider" aria-label="${l} corner" aria-valuenow="0"><span></span></div>`).join('')}
    </div></div>
    <div><p class="kicker">Step 2</p><h2 class="wv-h">Mark something on the wall</h2>
      <p class="wv-p">Drag the four dots onto the four corners of something rectangular in the photo, such as a door frame. It tells us how big everything on the wall is and the angle you photographed it from, so the art is drawn in true perspective.</p>
      <label class="wv-field"><span>What are you marking?</span><select id="wvPreset">${PRESETS.map((p, i) => `<option value="${i}"${i === S.preset ? ' selected' : ''}>${esc(p[0])}</option>`).join('')}</select></label>
      <label class="wv-field"><span>Width in cm</span><input id="wvW" type="number" inputmode="decimal" min="1" step="0.1" value="${S.refW || ''}"></label>
      <label class="wv-field"><span>Height in cm</span><input id="wvHt" type="number" inputmode="decimal" min="1" step="0.1" value="${S.refH || ''}"></label>
      <p><button type="button" class="btn" id="wvPlace"><span>Place artwork</span></button> <button type="button" class="wv-link" data-go="start">Back</button></p>
      <p class="small">Tip: use something flat on the same wall you want to hang the art on. A door frame works best: it is large, and it also tells us where the floor is, so the art starts at eye level.</p>
    </div></div>`;
  fit(); layoutMeasure();
}
function layoutMeasure() {
  const st = document.getElementById('wvStage'); if (!st) return;
  const r = S.room, k = S.scale;
  st.style.width = r.w * k + 'px'; st.style.height = r.h * k + 'px';
  const svg = document.getElementById('wvLine'); svg.setAttribute('width', r.w * k); svg.setAttribute('height', r.h * k);
  const pts = S.handles.map(h => `${h.x * k},${h.y * k}`).join(' ');
  svg.querySelectorAll('polygon').forEach(p => p.setAttribute('points', pts));
  st.querySelectorAll('.wv-handle').forEach((h, i) => { h.style.left = S.handles[i].x * k + 'px'; h.style.top = S.handles[i].y * k + 'px'; });
  const btn = document.getElementById('wvPlace'); if (btn) btn.disabled = !measureOk();
}

function renderPlace() {
  const r = S.room;
  app.innerHTML = `<div class="wv-cols">
    <div class="wv-stagewrap">
      <div class="wv-stage" id="wvStage" style="touch-action:pan-y">
        <img src="${esc(r.src)}" alt="Your wall" draggable="false" class="wv-room">
        <div class="wv-piece" id="wvPiece" style="touch-action:none"></div>
        <button type="button" class="wv-arrow prev" data-step="-1" aria-label="Previous artwork">‹</button>
        <button type="button" class="wv-arrow next" data-step="1" aria-label="Next artwork">›</button>
      </div>
      <p class="wv-hint">Drag the artwork to move it. Swipe across the wall, or use the arrows, to try another work.</p>
      <div class="wv-thumbs" id="wvThumbs"></div>
    </div>
    <div>
      <div class="wv-modes">${MODES.map(([m, l]) => pill(S.mode === m, `data-mode="${m}"`, l)).join('')}</div>
      <div id="wvPanel"></div>
    </div></div>`;
  renderThumbs(); fit(); update();
}
function renderThumbs() {
  const t = document.getElementById('wvThumbs'); if (!t) return;
  t.innerHTML = list().map((it, i) => `<button type="button" data-idx="${i}" class="${i === S.idx ? 'on' : ''}" aria-label="${esc(it.title)}"><img src="${esc(it.thumb)}" alt="" loading="lazy"></button>`).join('');
}
function update() {
  const st = document.getElementById('wvStage'); if (!st || S.step !== 'place') return;
  const r = S.room, k = S.scale, c = current();
  st.style.width = r.w * k + 'px'; st.style.height = r.h * k + 'px';
  const p = document.getElementById('wvPiece');
  p.innerHTML = pieceHTML(c.it, c.dz, c.lk, KPX);
  place(p, c);
  p.style.filter = S.bright < 0.99 ? `brightness(${S.bright})` : '';
  document.querySelectorAll('#wvThumbs button').forEach((b, i) => b.classList.toggle('on', i === S.idx));
  const tb = document.querySelector(`#wvThumbs button[data-idx="${S.idx}"]`), strip = document.getElementById('wvThumbs');
  if (tb && strip) strip.scrollTo({ left: tb.offsetLeft - strip.clientWidth / 2 + tb.clientWidth / 2, behavior: 'smooth' });
  renderPanel(c);
}
function renderPanel(c) {
  const { it, sz, lk, d, o } = c;
  const g = GLASS.find(x => x[0] === S.glass) || GLASS[0];
  const priced = typeof sz.price === 'number' && sz.price > 0 && !sz.sold;
  const r1 = n => Math.round(n * 10) / 10;
  let opts = '';
  if (it.kind === 'paper') {
    opts = `<div class="wv-opt"><p class="wv-l">Print size</p>${it.sizes.map((s, i) => { const x = wh(it, s); return pill(i === S.sizeIdx, `data-size="${i}"`, `${s.label} · ${r1(x.w)} × ${r1(x.h)} cm`); }).join('')}</div>
      <div class="wv-opt"><p class="wv-l">Preview a frame</p>${MOULD.map(([id, l]) => pill(S.mould === id, `data-mould="${id}"`, id === 'none' ? 'Unframed' : l)).join('')}</div>`;
    if (S.mould !== 'none' && S.mould !== 'oak-shadow') opts += `<div class="wv-opt"><p class="wv-l">Mat board</p>${MATS.map(([id, l]) => pill(S.mat === id, `data-mat="${id}"`, l)).join('')}</div>
      <div class="wv-opt"><p class="wv-l">Glass</p>${GLASS.map(([id, l]) => pill(S.glass === id, `data-glass="${id}"`, l)).join('')}<p class="small">${esc(g[3])}</p></div>`;
  } else if (it.kind === 'canvas-choice') {
    opts = `<div class="wv-opt"><p class="wv-l">Frame</p>${MOULD.map(([id, l]) => pill(S.canvasMould === id, `data-cmould="${id}"`, l)).join('')}</div>`;
  }
  const what = it.kind === 'paper' ? `Unframed print, ${r1(d.w)} × ${r1(d.h)} cm. ${sz.note || ''}`
    : it.kind === 'canvas' ? `Original painting, ${d.w} × ${d.h} cm${it.framed ? ', in a floating oak frame' : ', sold unframed (pictured in an oak shadow frame)'}.`
    : `Photograph on canvas, ${d.w} × ${d.h} cm. The price depends on the size and frame; ask and the studio will quote.`;
  const overall = (Math.round(o.w) !== Math.round(d.w) || Math.round(o.h) !== Math.round(d.h))
    ? (it.kind === 'paper' ? ` In the frame you're previewing, about ${Math.round(o.w)} × ${Math.round(o.h)} cm overall.` : ` Overall about ${Math.round(o.w)} × ${Math.round(o.h)} cm.`)
    : '';
  const brand = S.mode === 'fifty' ? 'Fifty Pages of Shades' : 'Ritushka';
  const subject = `Enquiry — ${brand} ${it.title}${it.kind === 'paper' ? ` (${sz.label} print)` : ''}`;
  const body = encodeURIComponent(`I've been looking at ${it.title} on my wall with the gallery's wall viewer.` +
    (it.kind === 'paper' && lk.mould === 'oak-shadow' ? ' I liked it in the oak shadow frame.' : '') +
    (it.kind === 'paper' && lk.mould !== 'none' && lk.mould !== 'oak-shadow' ? ` I liked it in a ${lk.mould} frame with ${(MATS.find(x => x[0] === lk.mat) || MATS[0])[1].toLowerCase()} and ${g[1].toLowerCase()} glass.` : '') +
    (it.kind === 'canvas-choice' ? ` I liked it with ${lk.mould === 'none' ? 'no frame' : lk.mould === 'oak-shadow' ? 'the oak shadow frame' : 'a ' + lk.mould + ' floating frame'}.` : ''));
  const mail = (window.NITA && window.NITA.EMAIL && window.NITA.EMAIL.gallery) || 'studio@nitagallery.com.au';
  document.getElementById('wvPanel').innerHTML = `
    <p class="wv-count">${S.idx + 1} of ${list().length}</p>
    <h2 class="wv-title">${esc(it.title)}</h2>
    ${opts}
    <div class="wv-buy">
      <p class="wv-price">${sz.sold ? 'Sold' : priced ? money(sz.price) : (S.mode === 'fifty' ? 'Inquire' : 'Price on enquiry')}</p>
      <p class="small">${esc(what + overall)}</p>
      ${it.kind === 'paper' && lk.mould !== 'none' ? '<p class="small">Framing is custom and quoted separately. Ask us about the frame you liked.</p>' : ''}
      <p class="wv-actions">${priced ? `<button class="btn" type="button" data-add="${esc(sz.id)}"><span>Add to cart</span></button>` : ''}
        <a class="wv-link" href="mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${body}">Ask about this piece</a></p>
      <p class="wv-tools">${S.room.sample ? '' : '<button type="button" class="wv-link" data-go="measure">Re-measure</button>'}
        ${S.pos ? '<button type="button" class="wv-link" data-recentre>Re-centre</button>' : ''}
        <button type="button" class="wv-link" data-go="start">Change room</button></p>
    </div>`;
}

function render() {
  if (S.step === 'start' || !S.room) renderStart();
  else if (S.step === 'measure') renderMeasure();
  else renderPlace();
}

/* ---- loading a room ---- */
const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
async function brightness(src) {
  try {
    const im = await loadImg(src), c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 32);
    const d = x.getImageData(0, 0, 32, 32).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
    S.bright = clamp(.6 + s / (d.length / 4) / 255 * .55, .72, 1.02); update();
  } catch (e) { S.bright = 1; }
}
async function usePhoto(f) {
  const src = URL.createObjectURL(f), im = await loadImg(src), w = im.naturalWidth, h = im.naturalHeight;
  S.room = { src, w, h, H: null };
  // start with a door-shaped box the visitor drags onto the real thing
  const x0 = w * .12, x1 = w * .26, y0 = h * .2, y1 = h * .88;
  S.handles = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  S.pos = null; S.step = 'measure'; render(); brightness(src);
}
function learnAspect(it) {
  const f = file(it.img); if (aspect[f]) return;
  loadImg(it.thumb).then(im => { aspect[f] = im.naturalWidth / im.naturalHeight; if (item() === it) update(); }).catch(() => {});
}
function go(dir) { S.idx = (S.idx + dir + list().length) % list().length; S.sizeIdx = 0; S.pos = null; learnAspect(item()); update(); }

/* ---- input ---- */
app.addEventListener('click', e => {
  const t = e.target.closest('button, [data-sample]'); if (!t || t.hasAttribute('data-add')) return;
  if (t.id === 'wvPhoto') { document.getElementById('wvFile').click(); return; }
  if (t.dataset.sample) { const s = SAMPLES.find(x => x.id === t.dataset.sample); S.room = { src: s.src, w: s.w, h: s.h, H: s.H, sample: s }; S.pos = null; S.bright = 1; S.step = 'place'; render(); return; }
  if (t.id === 'wvPlace') {
    if (!measureOk()) return;
    S.room.H = solveH([{ x: 0, y: 0 }, { x: S.refW, y: 0 }, { x: S.refW, y: S.refH }, { x: 0, y: S.refH }], S.handles);
    S.room.floorY = PRESETS[S.preset][3] ? S.refH : null; S.pos = null; S.step = 'place'; render(); return;
  }
  if (t.dataset.go) { S.step = t.dataset.go; render(); return; }
  if (t.dataset.step) { go(+t.dataset.step); return; }
  if (t.dataset.idx) { S.idx = +t.dataset.idx; S.sizeIdx = 0; S.pos = null; learnAspect(item()); update(); return; }
  if (t.dataset.mode) { S.mode = t.dataset.mode; S.idx = 0; S.sizeIdx = 0; S.pos = null; learnAspect(item()); renderPlace(); return; }
  if (t.dataset.size) { S.sizeIdx = +t.dataset.size; update(); return; }
  if (t.dataset.mould) { S.mould = t.dataset.mould; update(); return; }
  if (t.dataset.mat) { S.mat = t.dataset.mat; update(); return; }
  if (t.dataset.glass) { S.glass = t.dataset.glass; update(); return; }
  if (t.dataset.cmould) { S.canvasMould = t.dataset.cmould; update(); return; }
  if (t.hasAttribute('data-recentre')) { S.pos = null; update(); }
});
app.addEventListener('change', e => {
  if (e.target.id === 'wvFile' && e.target.files[0]) usePhoto(e.target.files[0]);
  if (e.target.id === 'wvPreset') {
    S.preset = +e.target.value; const [, w, h] = PRESETS[S.preset];
    if (w && h) { S.refW = w; S.refH = h; document.getElementById('wvW').value = w; document.getElementById('wvHt').value = h; }
    layoutMeasure();
  }
});
app.addEventListener('input', e => {
  if (e.target.id !== 'wvW' && e.target.id !== 'wvHt') return;
  if (e.target.id === 'wvW') S.refW = parseFloat(e.target.value); else S.refH = parseFloat(e.target.value);
  S.preset = PRESETS.length - 1; document.getElementById('wvPreset').value = S.preset; layoutMeasure();
});

let drag = null;
function photoPt(e) { const r = document.getElementById('wvStage').getBoundingClientRect(); return { x: (e.clientX - r.left) / S.scale, y: (e.clientY - r.top) / S.scale }; }
app.addEventListener('pointerdown', e => {
  const stage = e.target.closest('#wvStage'); if (!stage || e.target.closest('.wv-arrow')) return;
  const h = e.target.closest('.wv-handle'), piece = e.target.closest('#wvPiece');
  const kind = h ? 'handle' : piece ? 'art' : S.step === 'place' ? 'swipe' : null; if (!kind) return;
  const el = h || piece || stage;
  try { el.setPointerCapture(e.pointerId); } catch (x) { /* pointer already gone */ }
  const origin = kind === 'handle' ? { ...S.handles[+h.dataset.h] } : kind === 'art' ? centre(current().o) : { x: 0, y: 0 };
  drag = { kind, i: h ? +h.dataset.h : 0, sx: e.clientX, sy: e.clientY, origin, t: Date.now() };
  if (kind === 'art') drag.wall = applyH(inv3(S.room.H), photoPt(e)); // where on the wall the pointer started, in cm
  if (kind !== 'swipe') e.preventDefault();
});
app.addEventListener('pointermove', e => {
  if (!drag || !S.room) return;
  if (drag.kind === 'handle') {
    const dx = (e.clientX - drag.sx) / S.scale, dy = (e.clientY - drag.sy) / S.scale;
    S.handles[drag.i] = { x: clamp(drag.origin.x + dx, 0, S.room.w), y: clamp(drag.origin.y + dy, 0, S.room.h) }; layoutMeasure();
  }
  if (drag.kind === 'art') {
    const w = applyH(inv3(S.room.H), photoPt(e));
    S.pos = { x: drag.origin.x + w.x - drag.wall.x, y: drag.origin.y + w.y - drag.wall.y };
    place(document.getElementById('wvPiece'), current());
  }
});
function end(e) {
  const d = drag; drag = null; if (!d) return;
  if (d.kind === 'art') { renderPanel(current()); return; }
  if (d.kind !== 'swipe') return;
  const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - d.t < 700) go(dx < 0 ? 1 : -1);
}
app.addEventListener('pointerup', end);
app.addEventListener('pointercancel', end);
addEventListener('keydown', e => {
  if (S.step !== 'place' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
  if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1);
});
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); if (S.step === 'measure') layoutMeasure(); else update(); }, 60); });

/* ---- start: load the catalogue, then honour ?item=<catalogue id or print name> ---- */
fetch('/catalog.json').then(r => r.json()).then(cat => {
  build(cat);
  const want = new URLSearchParams(location.search).get('item');
  if (want) for (const [m] of MODES) {
    const i = groups[m].findIndex(it => it.key === want || it.sizes.some(s => s.id === want));
    if (i >= 0) { S.mode = m; S.idx = i; const si = groups[m][i].sizes.findIndex(s => s.id === want); S.sizeIdx = Math.max(0, si); break; }
  }
  if (!list().length) S.mode = MODES.find(([m]) => groups[m].length)[0];
  learnAspect(item());
  render();
}).catch(() => { app.innerHTML = '<p class="small">Sorry, the artworks could not be loaded. Please refresh the page.</p>'; });
})();
