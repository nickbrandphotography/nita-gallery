(() => {
const { $, $$, esc, mail, openModal, sparkles, fine } = window.NITA;
const pad = n => String(n).padStart(2, '0');

sparkles($('#sparkles'), 130, '255,226,150');

/* a warm glint follows the cursor */
if (fine) {
  const g = $('#glint');
  addEventListener('mousemove', e => { g.classList.add('on'); g.style.setProperty('--mx', e.clientX + 'px'); g.style.setProperty('--my', e.clientY + 'px'); });
}

/* the cabinet: pieces come from js/jewellery-data.js */
const pieces = window.NITA_JEWEL || [];
const label = (p, i) => p.name || 'No. ' + pad(i + 1);
const cab = $('#cab');
cab.innerHTML = pieces.length
  ? pieces.map((p, i) => `
    <figure class="vt rv" style="--i:${i}" data-i="${i}" tabindex="0" data-hot>
      <div class="im"><img src="${p.img}" alt="${esc(p.alt || label(p, i))}" loading="lazy"></div>
      <figcaption><b>${esc(label(p, i))}</b><span class="pr">AUD $${p.price}</span></figcaption>
    </figure>`).join('')
  : Array.from({ length: 8 }, (_, i) => `<div class="vt empty rv" style="--i:${i}" aria-hidden="true"><span class="s">✦</span></div>`).join('');
window.NITA.observe(cab);

const ctx = i => ({ n: pieces.length, i, get() {
  const p = pieces[this.i];
  return { imgs: [p.img], alt: p.alt || label(p, this.i), html: `
    <p class="meta">NITA Gallery · Jewellery</p><h3>${esc(label(p, this.i))}</h3>
    ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
    <p class="pr">AUD $${p.price}</p>
    <p class="small">Prices in Australian dollars. Come and see it in the gallery, or write to us.</p>
    <a class="btn" href="${mail('gallery', 'Jewellery enquiry — ' + label(p, this.i) + ' (AUD $' + p.price + ')')}"><span>Ask about this piece</span></a>` };
} });
cab.addEventListener('click', e => { const f = e.target.closest('.vt:not(.empty)'); if (f) openModal(ctx(+f.dataset.i)); });
cab.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = e.target.closest('.vt:not(.empty)'); if (f) openModal(ctx(+f.dataset.i)); } });
})();
