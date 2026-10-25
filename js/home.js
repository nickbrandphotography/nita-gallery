(() => {
const { $, $$, sparkles, reduce, fine } = window.NITA;

/* hero: live paint canvas that follows the mouse */
(() => {
  const c = $('#blobs'), g = c.getContext('2d'); let W, H, vis = true;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const cols = ['31,166,196', '255,122,26', '240,48,127', '176,42,154', '255,194,26', '13,79,139'];
  const blobs = cols.map((col, i) => ({ col, a: Math.random() * 6.28, sp: .0004 + Math.random() * .0006, rx: .25 + Math.random() * .25, ry: .2 + Math.random() * .25, r: .28 + Math.random() * .2, ph: i }));
  const trail = [];
  const size = () => { W = c.width = c.clientWidth * dpr; H = c.height = c.clientHeight * dpr; };
  size(); addEventListener('resize', size);
  new IntersectionObserver(e => vis = e[0].isIntersecting).observe(c);
  $('#hero').addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect(), mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
    if (trail.length < 70) trail.push({ x: mx, y: my, r: (40 + Math.random() * 70) * dpr, col: cols[Math.floor(Math.random() * cols.length)], life: 1 });
  });
  (function frame(t) {
    requestAnimationFrame(frame); if (!vis) return;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#252525'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.a += b.sp * 16;
      const x = W / 2 + Math.cos(b.a + b.ph) * W * b.rx, y = H / 2 + Math.sin(b.a * 1.3 + b.ph) * H * b.ry, r = Math.min(W, H) * b.r * (reduce ? 1 : 1 + Math.sin(t * .0008 + b.ph) * .12);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${b.col},.34)`); gr.addColorStop(1, `rgba(${b.col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i]; p.life -= .014; if (p.life <= 0) { trail.splice(i, 1); continue; }
      const r = p.r * (1.3 - p.life * .3), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, `rgba(${p.col},${.55 * p.life})`); gr.addColorStop(1, `rgba(${p.col},0)`);
      g.fillStyle = gr; g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(37,37,37,.35)'; g.fillRect(0, 0, W, H);
  })(0);
})();

/* hero floaters follow the mouse */
if (fine && !reduce) {
  const fls = $$('.fl'); let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
  (function loop() {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    if (scrollY < innerHeight) fls.forEach(f => { const d = +f.dataset.depth; f.style.transform = `translate3d(${cx * -70 * d}px,${cy * -70 * d}px,0)`; });
    requestAnimationFrame(loop);
  })();
}

sparkles($('.spark-c'), 30, '255,226,140');
})();
