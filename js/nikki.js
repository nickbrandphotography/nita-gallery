(() => {
const { $, $$, esc, mail, openModal, data } = window.NITA;
const nik = data.nik;
const grp = h => h === 'warm' ? 'warm' : h === 'mono' ? 'mono' : 'cool';
let view = 'model', hue = 'all', list = [];
const grid = $('#kGrid');
const srcOf = (n, v) => v === 'model' ? n.model : v === 'scarf' ? n.scarf : n.place;
const alt = (n, v) => v === 'model' ? `${n.name} scarf worn by a model` : v === 'scarf' ? `${n.name} scarf, flat` : `The place where ${n.name} was photographed`;

function render() {
  list = nik.filter(n => hue === 'all' || grp(n.hue) === hue);
  grid.innerHTML = list.length ? list.map((n, i) => `
    <figure class="kt" data-i="${i}" style="--i:${i}" tabindex="0" data-hot>
      <img class="${view}" src="${srcOf(n, view)}" alt="${esc(alt(n, view))}" loading="lazy">
      <b class="dot" style="background:rgb(${n.rgb})"></b>
      <h4>${esc(n.name)}</h4><span>AUD $120</span>
    </figure>`).join('') : '<p class="k-empty">Nothing in this colour yet.</p>';
  $('#kCount').textContent = `· ${list.length}`;
}
function swapView() {
  $$('.kt', grid).forEach((t, i) => {
    const img = $('img', t), n = list[i]; img.className = view; img.src = srcOf(n, view); img.alt = alt(n, view);
    t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap');
  });
}
render();
$('#viewSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; $$('button', $('#viewSeg')).forEach(x => x.classList.toggle('on', x === b)); swapView(); });
$('#hueSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; hue = b.dataset.h; $$('button', $('#hueSeg')).forEach(x => x.classList.toggle('on', x === b)); render(); });

const ctx = i => ({ n: list.length, i, get() {
  const n = list[this.i];
  return { imgs: [n.model, n.scarf, n.place], alt: n.name, html: `
    <p class="meta">Nikki B · Scarf &amp; sarong</p><h3>${esc(n.name)}</h3>
    <p class="meta" style="color:var(--mute)">100% Modal · 100 × 200 cm · Hand wash</p>
    <p><em class="serif" style="font-size:1.2em">The place:</em> ${esc(n.story)}</p>
    <p class="pr">AUD $120</p>
    <a class="btn" href="${mail('nikki', 'Enquiry — nikkib ' + n.name)}"><span>Ask about ${esc(n.name)}</span></a>` };
} });
grid.addEventListener('click', e => { const f = e.target.closest('.kt'); if (f) openModal(ctx(+f.dataset.i)); });
grid.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = e.target.closest('.kt'); if (f) openModal(ctx(+f.dataset.i)); } });
})();
