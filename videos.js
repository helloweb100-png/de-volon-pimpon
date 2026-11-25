/* =========================================================
   De volón Pimpón — videos.js
   Reproductor de las secciones de video (.vid):
   botón de play sobre la carátula, un solo video sonando
   a la vez y pausa automática al salir de pantalla.
   Sin JS los videos siguen funcionando con sus controles.
   ========================================================= */
(() => {
  'use strict';

  const vids = Array.from(document.querySelectorAll('.vid__frame video'));
  if (!vids.length) return;

  const pauseOthers = (cur) => vids.forEach((v) => { if (v !== cur && !v.paused) v.pause(); });

  vids.forEach((v) => {
    const frame = v.closest('.vid__frame');
    const btn = frame && frame.querySelector('.vid__play');
    if (!frame || !btn) return;

    v.removeAttribute('controls');          // con JS manda el botón propio; los controles vuelven al reproducir

    const started = () => { v.setAttribute('controls', ''); frame.classList.add('is-started'); };
    btn.addEventListener('click', () => {
      started();
      const p = v.play();
      if (p && p.catch) p.catch(() => { frame.classList.remove('is-started'); v.removeAttribute('controls'); });
    });
    v.addEventListener('play', () => { pauseOthers(v); started(); });
    v.addEventListener('ended', () => { frame.classList.remove('is-started'); v.removeAttribute('controls'); });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (!en.isIntersecting && !en.target.paused) en.target.pause(); });
    }, { threshold: 0.1 });
    vids.forEach((v) => io.observe(v));
  }
})();
