(() => {
const { $, esc, sparkles, fine, data } = window.NITA;

sparkles($('#sparkles'), 130, '255,226,150');

/* a warm glint follows the cursor */
if (fine) {
  const g = $('#glint');
  addEventListener('mousemove', e => { g.classList.add('on'); g.style.setProperty('--mx', e.clientX + 'px'); g.style.setProperty('--my', e.clientY + 'px'); });
}

/* the cabinet: shows real pieces if data.jewel has any, otherwise empty glass */
const pieces = data.jewel || [];
$('#cab').innerHTML = pieces.length
  ? pieces.map((p, i) => `<figure class="vt rv" style="--i:${i}"><img src="${p.img}" alt="${esc(p.name)}"><figcaption><b>${esc(p.name)}</b><br><small>${esc(p.price || '')}</small></figcaption></figure>`).join('')
  : Array.from({ length: 8 }, (_, i) => `<div class="vt rv" style="--i:${i}" aria-hidden="true"><span class="s">✦</span></div>`).join('');
window.NITA.observe($('#cab'));
})();
