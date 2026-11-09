(() => {
const { $, $$, esc, mail, openModal, reduce, fine, data } = window.NITA;
const rit = data.rit;

/* hero: canvases drift with the mouse and the scroll */
(() => {
  const cvs = $$('.cv');
  if (!fine || reduce) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
  (function loop() {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    if (scrollY < innerHeight * 1.2) cvs.forEach(f => { const d = +f.dataset.depth; f.style.transform = `translate3d(${cx * -60 * d}px,${cy * -60 * d - scrollY * .05 * d}px,0)`; });
    requestAnimationFrame(loop);
  })();
})();

/* the wall */
const wall = $('#rWall'); let col = 'all', st = 'avail', view = [];
function render() {
  view = rit.filter(a => (col === 'all' || a.cols.includes(col)) && (st === 'all' || (st === 'sold' ? a.sold : !a.sold)));
  wall.innerHTML = view.map((a, i) => `
    <figure class="rw ${a.sold ? 'sold' : 'priced'}" ${a.sold ? '' : `data-item="rit-${a.id.slice(4)}"`} data-i="${i}" style="--i:${i}" tabindex="0" data-hot>
      <div class="im">${a.sold ? '<span class="tag">Sold</span>' : `<button class="kadd" type="button" data-add="rit-${a.id.slice(4)}">+ Cart</button>`}<img src="${a.img}" width="${a.w}" height="${a.h}" alt="${esc(a.title)}, acrylic on canvas by Ritushka" loading="lazy"></div>
      <figcaption><h4>${esc(a.title)}</h4><p>${a.size}${a.sold ? '' : (a.price ? ' · <b>' + a.price.replace('A$', 'AUD $') + '</b>' : '')}</p></figcaption>
    </figure>`).join('');
  if (window.BAG) window.BAG.hydrate();
  $('#wallCount').textContent = view.length ? `${view.length} ${view.length === 1 ? 'work' : 'works'}` : 'No works in this selection';
}
render();
$('#colChips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; col = b.dataset.c; $$('button', $('#colChips')).forEach(x => x.classList.toggle('on', x === b)); render(); });
$('#statusSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st = b.dataset.s; $$('button', $('#statusSeg')).forEach(x => x.classList.toggle('on', x === b)); render(); });

const ctx = i => ({ n: view.length, i, get() {
  const a = view[this.i];
  const prs = (window.BAG ? window.BAG.all() : []).filter(p => p.of === 'rit-' + a.id.slice(4) && !p.sold);
  const printLine = prs.length ? `<p class="small" style="margin-top:1.4rem">Also available as a signed, numbered limited edition print, from AUD $${Math.min(...prs.map(p => p.price))}. <a href="shop.html#prints" style="text-decoration:underline">See the prints</a></p>` : '';
  return { imgs: [a.img], alt: a.title, html: `
    <p class="meta">Ritushka · ${a.id}</p><h3>${esc(a.title)}</h3>
    <p class="meta" style="color:var(--mute)">${a.size} · Acrylic on canvas</p>
    <p>${esc(a.text)}</p>
    ${a.sold ? `<p class="pr" style="color:var(--mute)">Sold</p><p class="small">A related commission can be created in a comparable size and palette.</p>
      <a class="btn" href="${mail('ritushka', 'Commission enquiry — similar to ' + a.title)}"><span>Ask about a commission</span></a>${printLine}`
    : `<p class="pr">${a.price ? a.price.replace('A$', 'AUD $') + ' <small class="small">framed</small>' : 'Price on enquiry'}</p>
      <p class="small">Original, hand-painted, signed, with certificate of authenticity. Floating oak frame. Insured shipping worldwide.</p>
      <p data-item="rit-${a.id.slice(4)}" class="${a.price ? 'priced' : 'unpriced'}"><button class="add" type="button" data-add="rit-${a.id.slice(4)}">Add to cart</button>
      <a class="btn" href="${mail('ritushka', 'Enquiry — ' + a.title + ' (' + a.id + ')')}"><span>Enquire about this work</span></a></p>${printLine}`}` };
} });
wall.addEventListener('click', e => { const f = e.target.closest('.rw'); if (f) openModal(ctx(+f.dataset.i)); });
wall.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = e.target.closest('.rw'); if (f) openModal(ctx(+f.dataset.i)); } });
})();
