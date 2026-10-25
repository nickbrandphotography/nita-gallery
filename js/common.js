/* Shared behaviour for every NITA page. Page scripts use window.NITA. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---- contact config: change these in one place ---- */
const EMAIL = {
  gallery: 'hello@bodyscapes.com.au',
  ritushka: 'studio@ritushka.art',
  nick: 'hello@bodyscapes.com.au',
  nikki: 'live@nikkibfashion.com'
};
const OPENING = new Date('2026-10-29T18:00:00+11:00');
// [day, label, [open, close] in 24h or null when closed] — from the Hours sign
const WEEK = [
  ['Mon', 'Closed', null], ['Tue', '10am – 6pm', [10, 18]], ['Wed', '10am – 6pm', [10, 18]],
  ['Thu', '10am – 8pm', [10, 20]], ['Fri', '10am – 6pm', [10, 18]], ['Sat', '10am – 3pm', [10, 15]], ['Sun', 'Closed', null]
];
const mail = (who, subj, body) => `mailto:${EMAIL[who]}?subject=${encodeURIComponent(subj)}${body ? '&body=' + body : ''}`;
$$('[data-mail]').forEach(a => {
  const subj = a.dataset.subject || ({ ritushka: 'Enquiry — Ritushka paintings at NITA Gallery', nick: 'Enquiry — Bodyscapes at NITA Gallery', nikki: 'Enquiry — Nikki B at NITA Gallery' }[a.dataset.mail] || 'NITA Gallery');
  a.href = mail(a.dataset.mail, subj, a.dataset.body);
});

/* ---- split headings into words ---- */
$$('[data-split]').forEach(el => {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
});

/* ---- reveal on scroll ---- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
const observe = root => $$('.rv,[data-split]', root).forEach(el => io.observe(el));
observe(document);

/* ---- nav ---- */
const nav = $('#nav'), links = $('#links'), burger = $('#burger');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.onclick = () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };

/* ---- page-change curtain ---- */
const cur = $('#curtain'), loader = $('#loader');
const THEME = { 'ritushka.html': '#ff7a1a', 'nick-brand.html': '#000000', 'nikki-b.html': '#f0307f', 'jewellery.html': '#d9a21a', 'index.html': '#252525' };
function reveal() {
  if (!cur) return;
  setTimeout(() => {
    cur.classList.add('out');
    setTimeout(() => { cur.hidden = true; cur.classList.remove('start', 'out'); }, 950);
  }, 80);
}
if (cur) {
  const first = loader && !sessionStorage.getItem('nitaSeen');
  if (first) cur.hidden = true; else { if (loader) loader.remove(); reveal(); }
}
addEventListener('pageshow', e => { if (e.persisted && cur) { cur.hidden = true; cur.classList.remove('in', 'start', 'out'); } });
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || /^mailto|^tel/.test(a.getAttribute('href'))) return;
  if (u.pathname === location.pathname && u.hash) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); return; }
  if (u.pathname === location.pathname && !u.hash) return;
  if (reduce || !cur) return;
  e.preventDefault();
  const key = u.pathname.split('/').pop() || 'index.html';
  cur.style.setProperty('--cur', THEME[key] || '#252525');
  cur.hidden = false; cur.classList.remove('start', 'out'); void cur.offsetWidth; cur.classList.add('in');
  setTimeout(() => { location.href = a.href; }, 620);
});

/* ---- intro loader (home, first visit of the session only) ---- */
if (loader && loader.isConnected) {
  const hide = () => { sessionStorage.setItem('nitaSeen', '1'); loader.classList.add('out'); setTimeout(() => loader.remove(), 1600); };
  const t0 = performance.now();
  addEventListener('load', () => setTimeout(hide, Math.max(0, 1400 - (performance.now() - t0))));
  setTimeout(() => loader.isConnected && hide(), 4000);
}

/* ---- custom cursor ---- */
if (fine) {
  const c = $('#cursor'); let x = 0, y = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; });
  (function loop() { cx += (x - cx) * .22; cy += (y - cy) * .22; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  document.addEventListener('mouseover', e => c.classList.toggle('big', !!e.target.closest('a,button,[data-hot],.filters')));
}

/* ---- magnetic buttons + 3D tilt ---- */
if (fine && !reduce) {
  $$('.magnetic').forEach(b => {
    const s = b.firstElementChild;
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2; b.style.transform = `translate(${dx * .18}px,${dy * .28}px)`; if (s) s.style.transform = `translate(${dx * .08}px,${dy * .12}px)`; });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; if (s) s.style.transform = ''; });
  });
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('.tilt');
    $$('.tilt.hot').forEach(x => { if (x !== t) { x.classList.remove('hot'); x.style.transform = ''; } });
    if (!t) return;
    const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    t.classList.add('hot'); t.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${py * -10}deg) scale(1.02)`;
  });
}

/* ---- scroll parallax: [data-par] moves inside its parent ---- */
const par = $$('[data-par]'); let tick = false;
function parallax() {
  tick = false;
  par.forEach(el => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    el.style.transform = `translate3d(0,${(r.top + r.height / 2 - innerHeight / 2) * -parseFloat(el.dataset.par)}px,0)`;
  });
}
if (par.length && !reduce) { addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(parallax); } }, { passive: true }); parallax(); }

/* ---- scroll-lit statement ---- */
(() => {
  const el = $('#scrub'); if (!el) return;
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="sw">${esc(w)}</span>`).join(' ');
  const sw = $$('.sw', el);
  if (reduce) { sw.forEach(s => s.classList.add('lit')); return; }
  const upd = () => {
    const r = el.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .25)));
    sw.forEach((s, i) => s.classList.toggle('lit', i / sw.length < p * 1.08));
  };
  addEventListener('scroll', upd, { passive: true }); upd();
})();

/* ---- sparkles ---- */
function sparkles(c, n, tint) {
  if (!c) return;
  const g = c.getContext('2d'); let W, H, vis = false; const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { W = c.width = c.clientWidth * dpr; H = c.height = c.clientHeight * dpr; };
  size(); addEventListener('resize', size);
  new IntersectionObserver(e => vis = e[0].isIntersecting).observe(c);
  const s = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * 1.4, ph: Math.random() * 6.28, sp: .6 + Math.random() * 1.6 }));
  (function frame(t) {
    requestAnimationFrame(frame); if (!vis) return;
    g.clearRect(0, 0, W, H);
    for (const p of s) {
      const a = Math.max(0, Math.sin(t * .001 * p.sp + p.ph)) ** 3, x = p.x * W, y = p.y * H, L = p.r * 14 * dpr * a + 1;
      g.fillStyle = `rgba(${tint},${a})`; g.beginPath();
      g.moveTo(x, y - L); g.quadraticCurveTo(x, y, x + L, y); g.quadraticCurveTo(x, y, x, y + L); g.quadraticCurveTo(x, y, x - L, y); g.quadraticCurveTo(x, y, x, y - L); g.fill();
    }
  })(0);
}

/* ---- modal / lightbox ---- */
const modal = $('#modal'), mImg = $('#mImg'), mInfo = $('#mInfo'), mThumbs = $('#mThumbs');
let ctx = null, lastFocus = null;
function show() {
  const v = ctx.get();
  mImg.src = v.imgs[0]; mImg.alt = v.alt; mInfo.innerHTML = v.html;
  mThumbs.innerHTML = v.imgs.length > 1 ? v.imgs.map((s, k) => `<img src="${s}" alt="" class="${k ? '' : 'on'}">`).join('') : '';
  const body = $('.m-body'); body.style.animation = 'none'; void body.offsetWidth; body.style.animation = '';
}
function openModal(c) { ctx = c; lastFocus = document.activeElement; show(); modal.hidden = false; document.body.style.overflow = 'hidden'; $('#mClose').focus(); }
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); }
const go = d => { ctx.i = (ctx.i + d + ctx.n) % ctx.n; show(); };
$('#mClose').onclick = closeModal; $('#mPrev').onclick = () => go(-1); $('#mNext').onclick = () => go(1);
modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('m-body')) closeModal(); });
mThumbs.addEventListener('click', e => { if (e.target.tagName === 'IMG') { mImg.src = e.target.src; $$('img', mThumbs).forEach(i => i.classList.toggle('on', i === e.target)); } });
addEventListener('keydown', e => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1);
});

/* ---- visit info: countdown + hours + open-now (only where present) ---- */
(() => {
  const box = $('#countdown');
  if (box) {
    const pad = n => String(n).padStart(2, '0');
    const t = () => {
      const d = OPENING - Date.now();
      if (d <= 0) { box.hidden = true; return; }
      box.hidden = false;
      $('#cd-d').textContent = pad(Math.floor(d / 864e5)); $('#cd-h').textContent = pad(Math.floor(d / 36e5) % 24);
      $('#cd-m').textContent = pad(Math.floor(d / 6e4) % 60); $('#cd-s').textContent = pad(Math.floor(d / 1e3) % 60);
    };
    t(); setInterval(t, 1000);
  }
  const hoursEls = $$('[data-hours]'), openEls = $$('[data-opennow]');
  if (!hoursEls.length && !openEls.length) return;
  const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false });
  const now = () => { const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value])); return { wd: p.weekday, h: (+p.hour % 24) + +p.minute / 60 }; };
  const t12 = h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
  function draw() {
    const { wd, h } = now(), today = WEEK.find(w => w[0] === wd.slice(0, 3));
    hoursEls.forEach(el => { el.innerHTML = WEEK.map(w => `<div class="${w[2] ? '' : 'closed'} ${w === today ? 'today' : ''}"><span>${w[0]}</span><span>${w[1]}</span></div>`).join(''); });
    let on = false, txt;
    if (Date.now() < OPENING) txt = 'Soft opening · Thu 29 Oct · 6pm';
    else if (today[2] && h >= today[2][0] && h < today[2][1]) { on = true; txt = `Open now · until ${t12(today[2][1])}`; }
    else {
      const i0 = WEEK.indexOf(today); let nx;
      for (let k = 1; k <= 7; k++) { nx = WEEK[(i0 + k) % 7]; if (nx[2]) break; }
      const later = today[2] && h < today[2][0];
      const full = { Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }[nx[0]];
      txt = later ? `Closed · opens today ${t12(today[2][0])}` : `Closed · opens ${full} 10am`;
    }
    openEls.forEach(el => { $('span', el).textContent = txt; el.classList.toggle('on', on); });
  }
  draw(); setInterval(draw, 60000);
})();

window.NITA = { $, $$, esc, EMAIL, mail, openModal, closeModal, sparkles, observe, reduce, fine, data: window.NITA_DATA };
})();
