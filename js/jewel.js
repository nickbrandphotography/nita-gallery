(() => {
const { $, $$, esc, openModal, sparkles, fine } = window.NITA;

sparkles($('#sparkles'), 130, '255,226,150');

/* the photo wall opens full size */
const gal = $('#gal');
if (gal) {
  const shots = $$('button[data-g] img', gal).map(im => ({ src: im.getAttribute('src').replace('-s.jpg', '.jpg'), alt: im.alt }));
  const ctx = i => ({ n: shots.length, i, get() {
    const s = shots[this.i];
    return { imgs: [s.src], alt: s.alt, html: `<p class="meta">Second Skin · NITA Gallery</p><h3>The cabinet</h3><p>${esc(s.alt)}</p><p class="small">Come and see it in the gallery, or shop the collection on this page.</p>` };
  } });
  gal.addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (b) openModal(ctx(+b.dataset.g)); });
}
})();
