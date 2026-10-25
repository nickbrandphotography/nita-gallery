(() => {
const { $, $$, esc, mail, openModal, reduce, fine, data } = window.NITA;

/* order: Collection I (Bodyscapes) then Collection II (Abstract Forms) */
const bod = [...data.bod.filter(b => b.series === 'Bodyscapes'), ...data.bod.filter(b => b.series !== 'Bodyscapes')];
const pad = n => String(n).padStart(2, '0');

/* spotlight that follows the cursor */
if (fine) {
  const sp = $('#spot');
  addEventListener('mousemove', e => { sp.classList.add('on'); sp.style.setProperty('--mx', e.clientX + 'px'); sp.style.setProperty('--my', e.clientY + 'px'); });
}

/* viewing room */
(() => {
  const list = $('#vrList'); let cur = -1, flip = false;
  const groups = [['Bodyscapes', 'Collection I · Bodyscapes', 'The signature series. The human form photographed until it reads as terrain: dunes, ridges and tide-lines drawn in skin and shadow.'],
                  ['Abstract Forms', 'Collection II · Abstract Forms', 'Where Bodyscapes keeps a trace of the figure, Abstract Forms lets it go entirely.']];
  let html = '', n = 0;
  groups.forEach(([k, t, intro]) => {
    html += `<h3 class="vr-group">${t}</h3><p class="vr-intro">${intro}</p>`;
    bod.forEach((b, i) => { if (b.series === k) html += `<button class="vr-item" data-i="${i}"><img src="${b.img}" alt="" loading="lazy"><i>${pad(i + 1)}</i><b>${esc(b.title)}</b><em>${b.size}</em></button>`; });
  });
  list.innerHTML = html;
  const a = $('#vrImg'), b = $('#vrImg2');
  function set(i) {
    if (i === cur) return; cur = i; const w = bod[i];
    const [on, off] = flip ? [b, a] : [a, b]; flip = !flip;
    on.src = w.img; on.alt = w.title; on.classList.add('on'); off.classList.remove('on');
    $('#vrNum').textContent = `${pad(i + 1)} / ${bod.length}`; $('#vrTitle').textContent = w.title; $('#vrMeta').textContent = `${w.series} · ${w.size} · Edition of 15`;
    $$('.vr-item', list).forEach(x => x.classList.toggle('on', +x.dataset.i === i));
  }
  set(0);
  list.addEventListener('mouseover', e => { const x = e.target.closest('.vr-item'); if (x && fine) set(+x.dataset.i); });
  list.addEventListener('focusin', e => { const x = e.target.closest('.vr-item'); if (x) set(+x.dataset.i); });
  list.addEventListener('click', e => { const x = e.target.closest('.vr-item'); if (x) openModal(ctx(+x.dataset.i)); });
  $('.vr-stage').addEventListener('click', () => openModal(ctx(cur)));
})();

const ctx = i => ({ n: bod.length, i, get() {
  const b = bod[this.i];
  return { imgs: [b.img], alt: b.title, html: `
    <p class="meta">Nick Brand Photography · ${b.series}</p><h3>${esc(b.title)}</h3>
    <p class="meta" style="color:var(--mute)">${b.size} · Edition of 15</p>
    <p>Black-and-white photograph on premium canvas, gallery-framed and wired, ready to hang. Floating frame in black, natural oak or white. Signed Certificate of Authenticity and provenance record.</p>
    <p class="pr">From AUD 1,900 <small class="small">framed</small></p>
    <a class="btn" href="${mail('nick', 'Enquiry — ' + b.title)}"><span>Enquire about this edition</span></a>` };
} });

/* sizes drawn to scale against a 175 cm figure (1 cm = 1.5 units) */
(() => {
  const k = 1.5, floor = 316, hang = floor - 147 * k;
  const frames = [
    { w: 200, h: 100, x: 150, src: 'img/bod/where-the-body-ends-and-atmosphere.jpg' },
    { w: 120, h: 120, x: 500, src: 'img/bod/hidden-seams.jpg' },
    { w: 100, h: 100, x: 730, src: 'img/bod/skin-s-secret-conversation.jpg' }
  ];
  const fx = 70, fh = 175 * k;
  const fig = `<g fill="#3a3a3a"><circle cx="${fx}" cy="${floor - fh + 13}" r="13"/><rect x="${fx - 24}" y="${floor - fh + 30}" width="48" height="${fh * .42}" rx="14"/><rect x="${fx - 21}" y="${floor - fh * .58}" width="18" height="${fh * .58}" rx="6"/><rect x="${fx + 3}" y="${floor - fh * .58}" width="18" height="${fh * .58}" rx="6"/></g>
    <g stroke="#666" stroke-width="1"><line x1="${fx + 44}" y1="${floor - fh}" x2="${fx + 44}" y2="${floor}"/><line x1="${fx + 38}" y1="${floor - fh}" x2="${fx + 50}" y2="${floor - fh}"/></g>
    <text x="${fx}" y="${floor - fh - 12}" text-anchor="middle" fill="#8d8982" font-size="11" letter-spacing="2" font-family="Josefin Sans, sans-serif">175 CM</text>`;
  let fr = '';
  frames.forEach((f, i) => {
    const w = f.w * k, h = f.h * k, y = hang - h / 2;
    fr += `<g class="fr"><clipPath id="cp${i}"><rect x="${f.x}" y="${y}" width="${w}" height="${h}"/></clipPath>
      <rect x="${f.x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" fill="#d8c3a0"/>
      <image href="${f.src}" x="${f.x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp${i})"/>
      <text x="${f.x + w / 2}" y="${floor + 26}" text-anchor="middle" fill="#cfcac2" font-size="12" letter-spacing="3" font-family="Josefin Sans, sans-serif">${f.w} × ${f.h} CM</text></g>`;
  });
  $('#scaleFig').innerHTML = `<svg viewBox="0 0 900 360" role="img" aria-label="Three artwork sizes, 200 by 100, 120 by 120 and 100 by 100 centimetres, drawn to scale beside a 175 centimetre figure">
    <line x1="10" y1="${floor}" x2="890" y2="${floor}" stroke="#333"/>${fig}${fr}</svg>`;
})();
})();
