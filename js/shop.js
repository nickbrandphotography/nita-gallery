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
const h = location.hash.slice(1), alias = { 'nikki-b': 'scarves', 'art': 'paintings', 'photographs': 'fifty-pages' };
if (filters && h && h !== 'shop') { const f = alias[h] || h; if ($(`button[data-f="${f}"]`, filters)) apply(f); }

/* prints: choosing a size re-points the card (or the pop-up) at that size's catalogue item */
function pick(box, id, sel) {
  box.dataset.item = id;
  const add = $('.add', box); if (add) add.dataset.add = id;
  const o = sel && sel.selectedOptions[0];
  const pr = $('.pr', box); if (pr && o && !(window.BAG && window.BAG.item(id))) pr.textContent = o.dataset.price;
  const ed = $('.ed', box); if (ed && o) ed.textContent = o.dataset.ed + ', signed and numbered';
  if (window.BAG) window.BAG.hydrate();
}
document.addEventListener('change', e => {
  const sel = e.target.closest && e.target.closest('select.sizes'); if (!sel) return;
  const box = sel.closest('[data-item]'); if (!box) return;
  pick(box, sel.value, sel);
  if (!box.classList.contains('s-card')) {   // changed in the pop-up: keep the card behind it in step
    const c = list[modalIdx], cs = c && $('select.sizes', c);
    if (cs) { cs.value = sel.value; pick(c, sel.value, cs); }
  }
});
let modalIdx = -1;

const BRAND = { 'second-skin': 'Second Skin', 'nikki-b': 'Nikki B', 'ritushka': 'Ritushka', 'nick-brand': 'Fifty Pages of Shades' };
const MAIL = { 'second-skin': 'gallery', 'nikki-b': 'nikki', 'ritushka': 'ritushka', 'nick-brand': 'nick' };
const ctx = i => ({ n: list.length, i, get() {
  const c = list[this.i], id = c.dataset.item, it = (window.BAG && window.BAG.item(id)) || null;
  modalIdx = this.i;
  const isPrint = !!c.dataset.print;
  const name = isPrint ? $('h3', c).textContent : it ? it.name : $('h3', c).textContent;
  const ok = it ? window.BAG.priced(it) : c.classList.contains('priced');
  const brand = c.dataset.brand, art = brand === 'ritushka' || brand === 'nick-brand';
  const pr = ok ? 'AUD ' + window.BAG.money(it.price) : (brand === 'nick-brand' ? 'Inquire' : art ? 'Price on enquiry' : 'Price to come');
  const type = it ? it.type : '';
  const n = brand === 'nikki-b' ? nik[name.toLowerCase()] : null;
  const imgs = n ? [n.model, n.scarf, n.place] : [it ? it.img : $('img', c).src];
  const desc = isPrint ? '<p>Archival pigment giclée on 308gsm Hahnemühle cotton rag paper, hand-signed and numbered by the artist in pencil, with a certificate of authenticity. Shipped unframed.</p>' : it && it.desc ?`<p>${esc(it.desc)}</p>` : (brand === 'second-skin' && it ? `<p>${esc(it.alt)}</p>` : '');
  const story = n ? `<p><em class="serif" style="font-size:1.2em">The place:</em> ${esc(n.story)}</p>` : '';
  const frame = brand === 'nick-brand' ? '<p class="small">The price depends on the size of print and the frame (black, natural oak or white). Inquire and the studio will reply with a quote.</p>' : '';
  const subj = encodeURIComponent(`Enquiry — ${BRAND[brand]} ${name}`);
  const sizes = isPrint ? `<label class="sz"><span>Size</span>${$('select.sizes', c).outerHTML.replace(/ selected(="[^"]*")?/g, '').replace(`value="${id}"`, `value="${id}" selected`)}</label>
      <p class="ed small">${it ? 'Edition of ' + it.edition + ', signed and numbered' : ''}</p>
      <p class="small">Made to order in Sydney and shipped unframed, rolled in a tube or flat in a rigid mailer. About 10–15 business days in Australia, up to 4 weeks internationally.</p>` : '';
  return { imgs, alt: it ? it.alt : name, html: `
    <div data-item="${esc(id)}" class="${ok ? 'priced' : 'unpriced'}">
      <p class="meta">${BRAND[brand]}${isPrint ? ' · Limited edition print' : type && type !== BRAND[brand] ? ' · ' + esc(type) : ''}</p><h3>${esc(name)}</h3>
      ${desc}${story}${frame}${sizes}
      <p class="pr">${pr}${ok && art && !isPrint ? ' <small class="small">framed</small>' : ''}</p>
      <p><button class="add" type="button" data-add="${esc(id)}">Add to cart</button>
      <a class="ask" href="mailto:${window.NITA.EMAIL[MAIL[brand]]}?subject=${subj}">Ask about this piece</a></p>
      <p class="small">Prices in Australian dollars. Delivery worldwide, priced by country in your cart.</p>
    </div>` };
} });
grid.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openModal(ctx(list.indexOf(b.closest('.s-card')))); });
})();
