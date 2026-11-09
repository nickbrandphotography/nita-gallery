/* Shop grid: filter chips and the product pop-up. Used on the shop page and on the Second Skin page. */
(() => {
const { $, $$, esc, openModal } = window.NITA;
const grid = $('#grid'); if (!grid) return;
const filters = $('#filters'), empty = $('#empty');
const cards = $$('.s-card', grid);
const nik = Object.fromEntries((((window.NITA.data || {}).nik) || []).map(n => [n.name.toLowerCase(), n]));
let list = cards.slice();

function apply(f) {
  cards.forEach(c => { c.hidden = !(f === 'all' || c.dataset.slug === f); });
  list = cards.filter(c => !c.hidden);
  if (filters) $$('button', filters).forEach(b => b.classList.toggle('on', b.dataset.f === f));
  if (empty) empty.hidden = list.length > 0;
}
if (filters) filters.addEventListener('click', e => { const b = e.target.closest('button'); if (b) apply(b.dataset.f); });
const h = location.hash.slice(1), alias = { 'nikki-b': 'scarves', 'art': 'paintings' };
if (filters && h && h !== 'shop') { const f = alias[h] || h; if ($(`button[data-f="${f}"]`, filters)) apply(f); }

const BRAND = { 'second-skin': 'Second Skin', 'nikki-b': 'Nikki B', 'ritushka': 'Ritushka', 'nick-brand': 'Nick Brand Photography' };
const MAIL = { 'second-skin': 'gallery', 'nikki-b': 'nikki', 'ritushka': 'ritushka', 'nick-brand': 'nick' };
const ctx = i => ({ n: list.length, i, get() {
  const c = list[this.i], id = c.dataset.item, it = (window.BAG && window.BAG.item(id)) || null;
  const name = it ? it.name : $('h3', c).textContent;
  const ok = it ? window.BAG.priced(it) : c.classList.contains('priced');
  const brand = c.dataset.brand, art = brand === 'ritushka' || brand === 'nick-brand';
  const pr = ok ? 'AUD ' + window.BAG.money(it.price) : (brand === 'nick-brand' ? 'From AUD 1,900 framed' : art ? 'Price on enquiry' : 'Price to come');
  const type = it ? it.type : '';
  const n = brand === 'nikki-b' ? nik[name.toLowerCase()] : null;
  const imgs = n ? [n.model, n.scarf, n.place] : [it ? it.img : $('img', c).src];
  const desc = it && it.desc ? `<p>${esc(it.desc)}</p>` : (brand === 'second-skin' && it ? `<p>${esc(it.alt)}</p>` : '');
  const story = n ? `<p><em class="serif" style="font-size:1.2em">The place:</em> ${esc(n.story)}</p>` : '';
  const frame = brand === 'nick-brand' ? '<p class="small">Framed to order. You choose the frame colour (black, natural oak or white) at checkout.</p>' : '';
  const subj = encodeURIComponent(`Enquiry — ${BRAND[brand]} ${name}`);
  return { imgs, alt: it ? it.alt : name, html: `
    <div data-item="${esc(id)}" class="${ok ? 'priced' : 'unpriced'}">
      <p class="meta">${BRAND[brand]}${type ? ' · ' + esc(type) : ''}</p><h3>${esc(name)}</h3>
      ${desc}${story}${frame}
      <p class="pr">${pr}${ok && art ? ' <small class="small">framed</small>' : ''}</p>
      <p><button class="add" type="button" data-add="${esc(id)}">Add to cart</button>
      <a class="ask" href="mailto:${window.NITA.EMAIL[MAIL[brand]]}?subject=${subj}">Ask about this piece</a></p>
      <p class="small">Prices in Australian dollars. Delivery worldwide, priced by country in your cart.</p>
    </div>` };
} });
grid.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openModal(ctx(list.indexOf(b.closest('.s-card')))); });
})();
