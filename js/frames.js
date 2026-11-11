/* Oak floating frames at true scale on the Ritushka and Nick Brand pages.
   Every frame is 10 mm wide in total (7 mm of oak plus a 3 mm shadow gap), measured against the real width of the artwork,
   so a frame is always exactly in proportion to the picture it surrounds. */
(() => {
  const body = document.body;
  if (!(body.classList.contains('t-rit') || body.classList.contains('t-nick') || body.classList.contains('t-home'))) return;
  const D = window.NITA_DATA || {};
  const art = {};
  ['rit', 'bod'].forEach(k => (D[k] || []).forEach(a => { art[a.img.split('/').pop()] = a; }));
  const MM = 10;                                   // the whole visible frame (7 mm oak + 3 mm gap) is 10 mm
  const nums = s => (String(s).match(/\d+(\.\d+)?/g) || []).map(Number);
  const file = img => (img.currentSrc || img.src || '').split('?')[0].split('/').pop();

  /* real width of the artwork shown in this <img>, in mm (0 if it is not one of the listed artworks) */
  function widthMM(img) {
    const a = art[file(img)]; if (!a || !img.naturalWidth || !img.naturalHeight) return 0;
    const [x, y] = nums(a.size); if (!x || !y) return 0;
    return (img.naturalWidth >= img.naturalHeight ? Math.max(x, y) : Math.min(x, y)) * 10;
  }
  /* the frame picture comes in several pixel sizes; use the one closest to what the screen needs, so it is never scaled down hard (that is what made it look pixelated) */
  const SIZES = [8, 12, 16, 24, 32, 48, 72];
  function skin(el, T) {
    const need = T * (window.devicePixelRatio || 1), s = SIZES.find(v => v >= need) || 72;
    el.style.borderImageSource = `url(img/brand/frame-oak-${s}.png)`; el.style.borderImageSlice = String(s);
    el.style.borderImageRepeat = 'stretch'; el.style.borderImageWidth = T + 'px'; el.style.borderImageOutset = T + 'px';
  }
  function put(el, boxW, wmm, margin) {
    const mm = +(el.dataset.fm || MM), T = boxW * mm / wmm;
    el.classList.add('fr'); skin(el, T);
    if (margin) el.style.margin = Math.ceil(T) + 'px';
  }
  function clear(el) {
    el.classList.remove('fr'); ['borderImageSource', 'borderImageSlice', 'borderImageRepeat', 'borderImageWidth', 'borderImageOutset', 'margin'].forEach(k => { el.style[k] = ''; });
  }

  function scan() {
    /* Ritushka's wall: frame each picture box */
    document.querySelectorAll('#rWall .im').forEach(box => {
      const img = box.querySelector('img'), w = img && widthMM(img);
      if (w && box.offsetWidth) put(box, box.offsetWidth, w); else clear(box);
    });
    /* collage in the Ritushka hero */
    document.querySelectorAll('img.cv, img.fl').forEach(img => {
      const w = widthMM(img);
      if (w && img.offsetWidth) put(img, img.offsetWidth, w); else clear(img);
    });
    /* the enlarged picture in the pop-up */
    const m = document.getElementById('mImg');
    if (m) { const w = widthMM(m); if (w && m.offsetWidth && !document.getElementById('modal').hidden) put(m, m.offsetWidth, w, true); else clear(m); }
    /* Nick Brand's viewing room: the picture sits inside a stage, so the frame is drawn on an overlay */
    const st = document.querySelector('.vr-frame');
    if (st) {
      let ov = st.querySelector('.fr-ov'); if (!ov) { ov = document.createElement('div'); ov.className = 'fr-ov fr'; ov.setAttribute('aria-hidden', 'true'); st.appendChild(ov); }
      const img = st.querySelector('img.on'), w = img && widthMM(img);
      if (!w) { ov.style.display = 'none'; }
      else {
        const pad = 16, cw = st.clientWidth - 2 * pad, ch = st.clientHeight - 2 * pad, r = img.naturalWidth / img.naturalHeight;
        const pw = cw / ch > r ? ch * r : cw, ph = cw / ch > r ? ch : cw / r;
        ov.style.display = 'block'; ov.style.width = pw + 'px'; ov.style.height = ph + 'px';
        ov.style.left = (pad + (cw - pw) / 2) + 'px'; ov.style.top = (pad + (ch - ph) / 2) + 'px';
        skin(ov, pw * MM / w);
      }
    }
  }

  let queued = false;
  const go = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 40); };
  addEventListener('resize', go);
  document.addEventListener('load', go, true);                 // images finishing loading
  new MutationObserver(go).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class', 'hidden'] });
  go();
})();
