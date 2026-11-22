/* "View on your wall": photograph a wall (or pick a sample room), set the scale from one known measurement, then swipe
   through the gallery's wall art at true size. Ritushka originals show exactly as they are (in their floating oak frame
   where they have one). Prints can be previewed in a frame with a mat and glass; framing is quoted separately, so the
   price is always the print alone. Fifty Pages of Shades works can be previewed in black, oak or white floating frames.
   Prices and the "Add to cart" button come from catalog.json through bag.js. The visitor's photo never leaves the device. */
(() => {
'use strict';
const app = document.getElementById('wallApp'); if (!app) return;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const money = n => 'AUD $' + n.toLocaleString('en-AU');
const nums = s => (String(s || '').match(/\d+(\.\d+)?/g) || []).map(Number);
const file = p => String(p || '').split('?')[0].split('/').pop();

/* Sample rooms are drawn at 3.2 px per cm (wall about 5 m wide, 2.6 m high) with the floor at y=840. */
const SAMPLES = [
  { id: 'living', label: 'Living room', src: 'img/rooms/living.svg', w: 1600, h: 1000, ppc: 3.2, eyeY: 840 - 145 * 3.2, top: 512 },
  { id: 'office', label: 'Office', src: 'img/rooms/office.svg', w: 1600, h: 1000, ppc: 3.2, eyeY: 840 - 145 * 3.2, top: 540 },
];
const PRESETS = [
  ['Door height (standard 204 cm)', 204], ['A4 sheet, long side (29.7 cm)', 29.7],
  ['Light switch plate, height (11.5 cm)', 11.5], ["Something else I've measured", null],
];
const MOULD = [['none', 'No frame'], ['black', 'Black'], ['oak', 'Oak'], ['white', 'White']];
const MATS = [['none', 'No mat', 0], ['white-5', 'White 5 cm', 5], ['white-8', 'White 8 cm', 8], ['white-12', 'White 12 cm', 12]];
const GLASS = [
  ['clear', 'Clear', 0.2, 'Standard picture glass. Clear, but you will see reflections.'],
  ['non-reflective', 'Non-reflective', 0.06, 'Etched to cut glare. Detail is very slightly softened.'],
  ['museum', 'Museum', 0.02, 'Anti-reflective and UV protective. Almost invisible.'],
  ['acrylic', 'Acrylic', 0.12, 'Lighter and shatter-resistant. Good for larger prints.'],
];
const FLOAT = { face: 1.6, gap: 1.0 }, PAPER_FACE = 2.4, BEVEL = 0.35;
const MODES = [['rit', 'Ritushka originals'], ['prints', 'Ritushka prints'], ['fifty', 'Fifty Pages of Shades']];

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
  step: 'start', room: null, handles: [{ x: 0, y: 0 }, { x: 0, y: 0 }], preset: 0, refCm: 204,
  mode: 'rit', idx: 0, sizeIdx: 0, mould: 'oak', mat: 'white-8', glass: 'non-reflective', canvasMould: 'black',
  pos: null, bright: 1, scale: 0.3,
};
const aspect = {}; // image file -> width / height, once loaded
const list = () => groups[S.mode];
const item = () => list()[clamp(S.idx, 0, list().length - 1)];
const size = () => { const it = item(); return it.sizes[clamp(S.sizeIdx, 0, it.sizes.length - 1)]; };

/* width and height in cm: the longer number goes on the picture's longer side */
function wh(it, sz) {
  const [a, b] = sz.d, r = aspect[file(it.img)];
  if (!r) return { w: a, h: b };
  const long = Math.max(a, b), short = Math.min(a, b);
  return r >= 1 ? { w: long, h: short } : { w: short, h: long };
}
function look(it) {
  if (it.kind === 'canvas') return { kind: 'canvas', mould: it.framed ? 'oak' : 'none' };
  if (it.kind === 'canvas-choice') return { kind: 'canvas', mould: S.canvasMould };
  return { kind: 'paper', mould: S.mould, mat: S.mat, glass: S.glass };
}
function outer(d, lk) {
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

/* the work as it hangs, drawn at k screen pixels per cm */
function pieceHTML(it, d, lk, k) {
  const px = cm => Math.max(1, cm * k).toFixed(2) + 'px';
  const shadow = `${px(.6)} ${px(1.8)} ${px(3.5)} rgba(0,0,0,.38),0 ${px(.3)} ${px(.8)} rgba(0,0,0,.25)`;
  const img = `<img src="${esc(it.img)}" alt="" draggable="false" style="display:block;width:${(d.w * k).toFixed(2)}px;height:${(d.h * k).toFixed(2)}px;object-fit:cover">`;
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

/* ---- sizing ---- */
const ppc = () => (S.room && S.room.ppc) || 3.2;
function fit() {
  const wrap = app.querySelector('.wv-stagewrap'); if (!wrap || !S.room) return;
  const maxH = innerHeight * 0.75;
  S.scale = Math.min(wrap.clientWidth, maxH * S.room.w / S.room.h) / S.room.w;
}
function current() {
  const it = item(), sz = size(), lk = look(it), d = wh(it, sz), o = outer(d, lk);
  return { it, sz, lk, d, o, nat: { w: o.w * ppc(), h: o.h * ppc() } };
}
function centre(nat) {
  if (S.pos) return S.pos;
  const r = S.room;
  if (r.sample) return { x: r.w / 2, y: Math.max(nat.h / 2 + 10, Math.min(r.sample.eyeY, r.sample.top - 25 * ppc() - nat.h / 2)) };
  return { x: r.w / 2, y: r.h * 0.42 };
}

/* ---- rendering ---- */
function pill(on, attrs, label) { return `<button type="button" class="wv-pill${on ? ' on' : ''}" ${attrs}>${esc(label)}</button>`; }

function renderStart() {
  app.innerHTML = `<div class="wv-start">
    <div><p class="kicker">Step 1</p><h2 class="wv-h">Photograph your wall</h2>
      <p class="wv-p">Stand square to the wall, a few steps back, and take a photo that shows something you know the size of: a door, an A4 sheet taped to the wall, or a light switch. Your photo stays on your device and is never uploaded.</p>
      <input type="file" accept="image/*" capture="environment" id="wvFile" hidden>
      <button type="button" class="btn" id="wvPhoto"><span>Take or upload a photo</span></button></div>
    <div><p class="kicker">Or try a sample room</p><div class="wv-samples">${SAMPLES.map(s =>
      `<button type="button" data-sample="${s.id}"><img src="${s.src}" alt="Sample ${s.label.toLowerCase()}"><span>${s.label}</span></button>`).join('')}</div></div>
  </div>`;
}

function renderMeasure() {
  const r = S.room;
  app.innerHTML = `<div class="wv-cols">
    <div class="wv-stagewrap"><div class="wv-stage" id="wvStage" style="touch-action:none">
      <img src="${esc(r.src)}" alt="Your wall" draggable="false" class="wv-room">
      <svg class="wv-line" id="wvLine"><line stroke="#fff" stroke-width="4" stroke-opacity=".9"/><line stroke="#111" stroke-width="2" stroke-dasharray="8 6"/></svg>
      <div class="wv-handle" data-h="0" role="slider" aria-label="Start of measurement" aria-valuenow="0"><span></span></div>
      <div class="wv-handle" data-h="1" role="slider" aria-label="End of measurement" aria-valuenow="0"><span></span></div>
      <div class="wv-tag" id="wvTag"></div>
    </div></div>
    <div><p class="kicker">Step 2</p><h2 class="wv-h">Set the scale</h2>
      <p class="wv-p">Drag the two dots to each end of something in the photo you know the size of. This tells us how big everything on your wall really is.</p>
      <label class="wv-field"><span>What are you measuring?</span><select id="wvPreset">${PRESETS.map((p, i) => `<option value="${i}"${i === S.preset ? ' selected' : ''}>${esc(p[0])}</option>`).join('')}</select></label>
      <label class="wv-field"><span>Its real length in cm</span><input id="wvCm" type="number" inputmode="decimal" min="1" step="0.1" value="${S.refCm || ''}"></label>
      <p><button type="button" class="btn" id="wvPlace"><span>Place artwork</span></button> <button type="button" class="wv-link" data-go="start">Back</button></p>
      <p class="small">Tip: measure something flat against the wall, at about the height you will hang the art, for the most accurate result.</p>
    </div></div>`;
  fit(); layoutMeasure();
}
function layoutMeasure() {
  const st = document.getElementById('wvStage'); if (!st) return;
  const r = S.room, k = S.scale, [a, b] = S.handles;
  st.style.width = r.w * k + 'px'; st.style.height = r.h * k + 'px';
  const svg = document.getElementById('wvLine'); svg.setAttribute('width', r.w * k); svg.setAttribute('height', r.h * k);
  svg.querySelectorAll('line').forEach(l => { l.setAttribute('x1', a.x * k); l.setAttribute('y1', a.y * k); l.setAttribute('x2', b.x * k); l.setAttribute('y2', b.y * k); });
  st.querySelectorAll('.wv-handle').forEach((h, i) => { h.style.left = S.handles[i].x * k + 'px'; h.style.top = S.handles[i].y * k + 'px'; });
  const tag = document.getElementById('wvTag');
  tag.textContent = S.refCm > 0 ? S.refCm + ' cm' : '?';
  tag.style.left = ((a.x + b.x) / 2 * k + 40) + 'px'; tag.style.top = ((a.y + b.y) / 2 * k) + 'px';
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const btn = document.getElementById('wvPlace'); if (btn) btn.disabled = dist < 10 || !(S.refCm > 0);
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
  const p = document.getElementById('wvPiece'), at = centre(c.nat);
  p.innerHTML = pieceHTML(c.it, c.d, c.lk, ppc() * k);
  p.style.left = (at.x - c.nat.w / 2) * k + 'px'; p.style.top = (at.y - c.nat.h / 2) * k + 'px';
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
    if (S.mould !== 'none') opts += `<div class="wv-opt"><p class="wv-l">Mat board</p>${MATS.map(([id, l]) => pill(S.mat === id, `data-mat="${id}"`, l)).join('')}</div>
      <div class="wv-opt"><p class="wv-l">Glass</p>${GLASS.map(([id, l]) => pill(S.glass === id, `data-glass="${id}"`, l)).join('')}<p class="small">${esc(g[3])}</p></div>`;
  } else if (it.kind === 'canvas-choice') {
    opts = `<div class="wv-opt"><p class="wv-l">Floating frame</p>${MOULD.map(([id, l]) => pill(S.canvasMould === id, `data-cmould="${id}"`, l)).join('')}</div>`;
  }
  const what = it.kind === 'paper' ? `Unframed print, ${r1(d.w)} × ${r1(d.h)} cm. ${sz.note || ''}`
    : it.kind === 'canvas' ? `Original painting, ${d.w} × ${d.h} cm${lk.mould === 'oak' ? ', in a floating oak frame' : ''}.`
    : `Photograph on canvas, ${d.w} × ${d.h} cm. The price depends on the size and frame; ask and the studio will quote.`;
  const overall = (o.w !== d.w || o.h !== d.h)
    ? (it.kind === 'paper' ? ` In the frame you're previewing, about ${Math.round(o.w)} × ${Math.round(o.h)} cm overall.` : ` Overall about ${Math.round(o.w)} × ${Math.round(o.h)} cm.`)
    : '';
  const brand = S.mode === 'fifty' ? 'Fifty Pages of Shades' : 'Ritushka';
  const subject = `Enquiry — ${brand} ${it.title}${it.kind === 'paper' ? ` (${sz.label} print)` : ''}`;
  const body = encodeURIComponent(`I've been looking at ${it.title} on my wall with the gallery's wall viewer.` +
    (it.kind === 'paper' && lk.mould !== 'none' ? ` I liked it in a ${lk.mould} frame with ${(MATS.find(x => x[0] === lk.mat) || MATS[0])[1].toLowerCase()} and ${g[1].toLowerCase()} glass.` : '') +
    (it.kind === 'canvas-choice' ? ` I liked it with ${lk.mould === 'none' ? 'no frame' : 'a ' + lk.mould + ' floating frame'}.` : ''));
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
  S.room = { src, w, h, ppc: null }; S.handles = [{ x: w * .15, y: h * .22 }, { x: w * .15, y: h * .86 }];
  S.pos = null; S.step = 'measure'; render(); brightness(src);
}
function learnAspect(it) {
  const f = file(it.img); if (aspect[f]) return;
  loadImg(it.thumb).then(im => { aspect[f] = im.naturalWidth / im.naturalHeight; if (item() === it) update(); }).catch(() => {});
}
function go(dir) { S.idx = (S.idx + dir + list().length) % list().length; S.sizeIdx = 0; learnAspect(item()); update(); }

/* ---- input ---- */
app.addEventListener('click', e => {
  const t = e.target.closest('button, [data-sample]'); if (!t || t.hasAttribute('data-add')) return;
  if (t.id === 'wvPhoto') { document.getElementById('wvFile').click(); return; }
  if (t.dataset.sample) { const s = SAMPLES.find(x => x.id === t.dataset.sample); S.room = { src: s.src, w: s.w, h: s.h, ppc: s.ppc, sample: { eyeY: s.eyeY, top: s.top } }; S.pos = null; S.bright = 1; S.step = 'place'; render(); return; }
  if (t.id === 'wvPlace') { const [a, b] = S.handles, dist = Math.hypot(b.x - a.x, b.y - a.y); if (dist >= 10 && S.refCm > 0) { S.room.ppc = dist / S.refCm; S.pos = null; S.step = 'place'; render(); } return; }
  if (t.dataset.go) { S.step = t.dataset.go; render(); return; }
  if (t.dataset.step) { go(+t.dataset.step); return; }
  if (t.dataset.idx) { S.idx = +t.dataset.idx; S.sizeIdx = 0; learnAspect(item()); update(); return; }
  if (t.dataset.mode) { S.mode = t.dataset.mode; S.idx = 0; S.sizeIdx = 0; learnAspect(item()); renderPlace(); return; }
  if (t.dataset.size) { S.sizeIdx = +t.dataset.size; update(); return; }
  if (t.dataset.mould) { S.mould = t.dataset.mould; update(); return; }
  if (t.dataset.mat) { S.mat = t.dataset.mat; update(); return; }
  if (t.dataset.glass) { S.glass = t.dataset.glass; update(); return; }
  if (t.dataset.cmould) { S.canvasMould = t.dataset.cmould; update(); return; }
  if (t.hasAttribute('data-recentre')) { S.pos = null; update(); }
});
app.addEventListener('change', e => {
  if (e.target.id === 'wvFile' && e.target.files[0]) usePhoto(e.target.files[0]);
  if (e.target.id === 'wvPreset') { S.preset = +e.target.value; const cm = PRESETS[S.preset][1]; if (cm) { S.refCm = cm; document.getElementById('wvCm').value = cm; } layoutMeasure(); }
});
app.addEventListener('input', e => { if (e.target.id === 'wvCm') { S.refCm = parseFloat(e.target.value); S.preset = PRESETS.length - 1; document.getElementById('wvPreset').value = S.preset; layoutMeasure(); } });

let drag = null;
app.addEventListener('pointerdown', e => {
  const stage = e.target.closest('#wvStage'); if (!stage || e.target.closest('.wv-arrow')) return;
  const h = e.target.closest('.wv-handle'), piece = e.target.closest('#wvPiece');
  const kind = h ? 'handle' : piece ? 'art' : S.step === 'place' ? 'swipe' : null; if (!kind) return;
  const el = h || piece || stage;
  try { el.setPointerCapture(e.pointerId); } catch (x) { /* pointer already gone */ }
  const origin = kind === 'handle' ? { ...S.handles[+h.dataset.h] } : kind === 'art' ? centre(current().nat) : { x: 0, y: 0 };
  drag = { kind, i: h ? +h.dataset.h : 0, sx: e.clientX, sy: e.clientY, origin, t: Date.now() };
  if (kind !== 'swipe') e.preventDefault();
});
app.addEventListener('pointermove', e => {
  if (!drag || !S.room) return;
  const dx = (e.clientX - drag.sx) / S.scale, dy = (e.clientY - drag.sy) / S.scale;
  const p = { x: clamp(drag.origin.x + dx, 0, S.room.w), y: clamp(drag.origin.y + dy, 0, S.room.h) };
  if (drag.kind === 'handle') { S.handles[drag.i] = p; layoutMeasure(); }
  if (drag.kind === 'art') {
    S.pos = p; const c = current(), el = document.getElementById('wvPiece');
    el.style.left = (p.x - c.nat.w / 2) * S.scale + 'px'; el.style.top = (p.y - c.nat.h / 2) * S.scale + 'px';
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
