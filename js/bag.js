/* NITA Gallery shop: the cart, the delivery price and checkout. Loaded on every page.
   Prices come from catalog.json (and are re-checked on the server at checkout); delivery from shipping.json. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EMAIL = 'studio@nickbrandphotography.com';
const KEY = 'nita-bag', SHIPKEY = 'nita-ship-to';

let CAT = null, byId = {}, SHIP = null, shipTo = 'AU', bag = [], lastFocus = null;
const priced = it => !!it && !it.sold && typeof it.price === 'number' && it.price > 0;
const money = n => '$' + n.toLocaleString('en-AU', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const maxOf = it => (it && it.max) || 5;

try { bag = JSON.parse(localStorage.getItem(KEY) || '[]').filter(i => i && typeof i.id === 'string' && i.qty > 0).map(i => ({ id: i.id, qty: Math.floor(i.qty) })); } catch (e) { bag = []; }
try { shipTo = localStorage.getItem(SHIPKEY) || ''; } catch (e) { shipTo = ''; }
if (!shipTo) { const m = (navigator.language || '').match(/-([A-Za-z]{2})$/); shipTo = m ? m[1].toUpperCase() : 'AU'; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) { /* private mode: the bag lives in memory */ } };

/* ---- the cart button in the header, the drawer and the toast ---- */
const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
const nav = $('#nav');
const btn = document.createElement('button');
btn.className = 'bag-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Open your cart');
btn.innerHTML = ICON + '<span class="bag-count" id="bagCount">0</span>';
const burger = $('#burger');
if (nav) nav.insertBefore(btn, burger || null); else document.body.append(btn);

const drawer = document.createElement('aside');
drawer.className = 'drawer'; drawer.id = 'drawer'; drawer.setAttribute('aria-label', 'Your cart'); drawer.setAttribute('aria-hidden', 'true');
const scrim = document.createElement('div'); scrim.className = 'scrim';
const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status');
document.body.append(scrim, drawer, toastEl);

/* ---- helpers ---- */
const lines = () => bag.filter(i => byId[i.id]);
const count = () => (CAT ? lines() : bag).reduce((n, i) => n + i.qty, 0);
const subtotal = () => Math.round(lines().reduce((s, i) => s + (priced(byId[i.id]) ? byId[i.id].price * i.qty : 0), 0) * 100) / 100;
const hasUnpriced = () => lines().some(i => !priced(byId[i.id]));
const zoneFor = c => SHIP && (SHIP.zones.find(z => z.countries.includes(c)) || SHIP.zones.find(z => z.countries.includes('*')));
/* jewellery and scarves ship at the zone's "amount", framed art at its "artwork" price; a mixed cart pays the higher */
const shipCost = () => {
  const z = zoneFor(shipTo), L = lines(); if (!z || !L.length) return null;
  const need = [];
  if (L.some(i => !artShip(byId[i.id]))) need.push(z.amount);
  if (L.some(i => artShip(byId[i.id]))) need.push(z.artwork);
  return need.every(v => typeof v === 'number' && v >= 0) ? Math.max(...need) : null;
};
const BRANDS = { 'second-skin': 'Second Skin', 'nikki-b': 'Nikki B', 'ritushka': 'Ritushka', 'nick-brand': 'Fifty Pages of Shades' };
const brandName = it => BRANDS[it.brand] || 'NITA Gallery';
const isArt = it => it.brand === 'ritushka' || it.brand === 'nick-brand';
const artShip = it => it.ship === 'art';   // framed originals and photographs; prints, jewellery and scarves ship small
const noPrice = it => it.brand === 'nick-brand' ? 'Inquire' : isArt(it) ? 'Price on enquiry' : 'Price to come';

function enquiryHref() {
  const rows = lines().map(i => { const p = byId[i.id]; return `- ${brandName(p)} ${p.name} x ${i.qty}${priced(p) ? ' (AUD $' + p.price * i.qty + ')' : ' (price to be confirmed)'}`; });
  const where = SHIP && SHIP.countries[shipTo] ? SHIP.countries[shipTo] : '';
  const body = `Hello NITA Gallery,\n\nI'd like to order:\n${rows.join('\n')}\n\nPlease send me the total, including delivery to: ${where}\n\nMy name:\nMy address:`;
  return `mailto:${EMAIL}?subject=${encodeURIComponent('Order from the NITA Gallery shop')}&body=${encodeURIComponent(body)}`;
}

/* ---- drawing ---- */
function renderDrawer(note, isErr) {
  const L = lines(), ready = !!CAT;
  const cost = shipCost(), sub = subtotal(), blocked = hasUnpriced();
  drawer.innerHTML = `
    <div class="dr-head"><h3>Your cart</h3><button class="dr-close" type="button" aria-label="Close cart">✕</button></div>
    <div class="dr-list">${L.length ? L.map(i => { const p = byId[i.id]; return `
      <div class="dr-item"><img src="${esc(p.thumb)}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.type === brandName(p) ? p.type : brandName(p) + ' · ' + p.type)}${p.dims ? ' · ' + esc(p.dims) : ''}</small>
        <div class="qty"><button type="button" data-q="${esc(p.id)}" data-d="-1" aria-label="One fewer ${esc(p.name)}">−</button><span>${i.qty}</span><button type="button" data-q="${esc(p.id)}" data-d="1" aria-label="One more ${esc(p.name)}">+</button></div></div>
        <div class="dr-price">${priced(p) ? 'AUD ' + money(p.price * i.qty) : esc(noPrice(p))}<button type="button" data-rm="${esc(p.id)}">Remove</button></div></div>`; }).join('')
      : `<p class="dr-empty">${ready ? 'Your cart is empty.<br>Choose a piece and tap “Add to cart”.' : 'Loading…'}</p>`}</div>
    <div class="dr-foot">
      ${L.length ? `${SHIP ? `<label class="ship"><span>Deliver to</span><select id="shipTo">${Object.entries(SHIP.countries).map(([c, n]) => `<option value="${c}"${c === shipTo ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : ''}
      <div class="dr-line"><span>${count()} ${count() === 1 ? 'piece' : 'pieces'}</span><span>AUD ${money(sub)}</span></div>
      <div class="dr-line"><span>Delivery</span><span>${!SHIP ? '…' : cost === null ? 'To be confirmed' : cost === 0 ? 'Free' : 'AUD ' + money(cost)}</span></div>
      <div class="dr-total"><span>Total</span><span>${cost === null ? 'AUD ' + money(sub) + ' + delivery' : 'AUD ' + money(Math.round((sub + cost) * 100) / 100)}</span></div>
      <button class="btn solid" type="button" data-checkout${blocked ? ' disabled' : ''}><span>${blocked ? 'Price on enquiry' : !SHIP || cost !== null ? 'Checkout' : 'Order by email'}</span></button>
      <p class="dr-note${isErr ? ' err' : ''}" id="drNote">${esc(note || (blocked ? 'Some pieces in your cart do not have a price yet. Remove them to check out, or order by email and we will confirm the price.' : SHIP && cost === null ? 'We are still confirming the delivery price to this country. Send us your order by email and we will reply with the total.' : 'Delivery address and payment are entered securely on the next page, powered by Stripe.'))}</p>
      <a class="small" href="${enquiryHref()}">Prefer to order by email?</a>` : '<a class="btn" href="/shop"><span>Browse the shop</span></a>'}
    </div>`;
}

function hydrate() {
  if (!CAT) return;
  $$('[data-item]').forEach(el => {
    const p = byId[el.dataset.item]; if (!p) return;
    const ok = priced(p);
    el.classList.toggle('priced', ok); el.classList.toggle('unpriced', !ok);
    $$('.pr', el).forEach(x => { x.textContent = ok ? 'AUD ' + money(p.price) : (p.sold ? 'Sold' : noPrice(p)); });
  });
  $$('[data-add]').forEach(b => { const p = byId[b.dataset.add]; if (p) b.setAttribute('aria-label', `Add ${p.name} to cart`); });
}
function syncBag() {
  const n = count();
  $$('#bagCount').forEach(c => { c.textContent = n; });
  $$('.bag-btn').forEach(b => { b.classList.toggle('has', n > 0); b.setAttribute('aria-label', n ? `Open your cart, ${n} ${n === 1 ? 'piece' : 'pieces'}` : 'Open your cart'); });
}
let tt;
function toast(msg, withBag) {
  toastEl.innerHTML = esc(msg) + (withBag ? ' <button type="button" data-open-bag>View cart</button>' : '');
  toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 3600);
}
function changed() {
  save(); syncBag(); renderDrawer();
  $$('.bag-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
}

/* ---- bag actions ---- */
function add(id) {
  const p = byId[id]; if (!p) return;
  if (!priced(p)) { toast(`${p.name} isn't available to buy online yet. Please ask us about it.`); return; }
  const it = bag.find(i => i.id === id);
  if (it) { if (it.qty >= maxOf(p)) { toast(`Up to ${maxOf(p)} of ${p.name} per order. For more, please write to us.`); return; } it.qty++; } else bag.push({ id, qty: 1 });
  changed(); toast(`${p.name} added to your cart`, true);
}
function setQty(id, d) {
  const it = bag.find(i => i.id === id), p = byId[id]; if (!it) return;
  it.qty = Math.min(maxOf(p), it.qty + d); if (it.qty <= 0) bag = bag.filter(i => i !== it);
  changed();
}
function open() {
  lastFocus = document.activeElement; renderDrawer();
  drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('bag-open');
  const c = $('.dr-close', drawer); if (c) c.focus();
}
function close() {
  if (!drawer.classList.contains('on')) return;
  drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('bag-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

async function checkout(b) {
  const label = $('span', b);
  if (hasUnpriced()) return;
  if (SHIP && shipCost() === null) { location.href = enquiryHref(); return; }   // no delivery price for this country yet: order by email
  b.disabled = true; label.textContent = 'Preparing checkout…';
  let msg = '';
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines(), country: shipTo }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) { location.href = d.url; return; }
    msg = r.status === 503 ? 'Online checkout is being switched on. For now you can order by email below.'
      : r.status === 422 && d.error === 'unpriced' ? `${(d.names || []).join(', ') || 'A piece in your cart'} is not available to buy online yet. Please remove it, or order by email below.`
      : r.status === 422 && d.error === 'sold' ? `${(d.names || []).join(', ') || 'A piece in your cart'} has sold. Please remove it from your cart.`
      : r.status === 422 ? `We are still confirming delivery to ${d.country || 'that country'}. Please order by email below and we will send the price.`
      : 'Sorry, checkout could not start. Please try again, or order by email below.';
  } catch (e) { msg = 'Sorry, we could not reach the checkout. Please check your connection, or order by email below.'; }
  b.disabled = false; label.textContent = 'Checkout';
  const n = $('#drNote'); if (n) { n.textContent = msg; n.classList.add('err'); }
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-add]');
  if (a) { e.preventDefault(); e.stopPropagation(); if (CAT) add(a.dataset.add); else ready.then(() => add(a.dataset.add)); return; }
  if (e.target.closest('.bag-btn') || e.target.closest('[data-open-bag]')) { open(); return; }
  if (e.target.closest('.dr-close') || e.target === scrim) { close(); return; }
  const q = e.target.closest('[data-q]'); if (q) { setQty(q.dataset.q, +q.dataset.d); return; }
  const rm = e.target.closest('[data-rm]'); if (rm) { bag = bag.filter(i => i.id !== rm.dataset.rm); changed(); return; }
  const co = e.target.closest('[data-checkout]'); if (co) checkout(co);
}, true);
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
document.addEventListener('change', e => {
  if (e.target.id !== 'shipTo') return;
  shipTo = e.target.value; try { localStorage.setItem(SHIPKEY, shipTo); } catch (x) { /* ignore */ }
  renderDrawer(); const s = $('#shipTo'); if (s) s.focus();
});
addEventListener('storage', e => { if (e.key === KEY) { try { bag = JSON.parse(e.newValue || '[]'); } catch (x) { bag = []; } syncBag(); renderDrawer(); } });

/* ---- load the price list and delivery zones ---- */
const ready = fetch('catalog.json').then(r => r.json()).then(j => {
  CAT = j; byId = Object.fromEntries(j.items.map(i => [i.id, i]));
  bag = bag.filter(i => byId[i.id]).map(i => ({ id: i.id, qty: Math.min(maxOf(byId[i.id]), i.qty) }));
  save(); hydrate(); syncBag(); renderDrawer();
}).catch(() => { renderDrawer('The shop could not load. Please refresh the page.', true); });
fetch('shipping.json').then(r => r.json()).then(j => { SHIP = j; if (!SHIP.countries[shipTo]) shipTo = 'AU'; renderDrawer(); }).catch(() => {});
syncBag(); renderDrawer();

window.BAG = { noPrice, brandName, add, open, close, toast, ready, hydrate, enquiryHref, items: () => lines().map(i => ({ ...i })),
  item: id => byId[id], all: () => (CAT ? CAT.items : []), priced, money,
  clear: () => { bag = []; save(); syncBag(); renderDrawer(); } };
})();
