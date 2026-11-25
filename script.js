/* =========================================================
   De volón Pimpón — script.js
   Un solo motor rAF para el scroll (suavizado «motion slow»),
   revelados con respaldo por geometría, canvas de tráfico,
   cargador, formulario → WhatsApp y microinteracciones.
   anime.js 3.2.2 es opcional: todo funciona sin él.
   ========================================================= */

/* ---- ÚNICO lugar del número de WhatsApp (52 + 10 dígitos). Vacío = se oculta todo lo de WhatsApp ---- */
const WHATSAPP_NUMBER = '524445056935';

/* ---- Redes: cada icono aparece solo si hay URL ---- */
const SOCIAL = { facebook: '', instagram: '', tiktok: '' };

(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('live');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const safe = (fn) => { try { fn(); } catch (err) { if (window.console) console.warn('[pimpon]', err); } };

  /* ---------- Estado del motor de scroll ---------- */
  let dirty = true;
  let busy = true;
  const markDirty = () => { dirty = true; };
  const scrubs = [];
  const extras = [];

  /* progreso de un elemento al cruzar la ventana (0 al entrar por abajo, 1 al salir por arriba) */
  const through = (el) => {
    const r = el.getBoundingClientRect();
    return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
  };
  /* progreso dentro de una sección alta con escenario sticky */
  const stickyP = (sec) => {
    const r = sec.getBoundingClientRect();
    const d = r.height - window.innerHeight;
    return d > 0 ? clamp(-r.top / d) : 0;
  };
  /* registra un valor suavizado: cur += (obj - cur) * k */
  function scrub(get, apply, opt = {}) {
    const s = { get, apply, k: opt.k || 0.09, end: opt.end === undefined ? 1 : opt.end, cur: null, last: NaN };
    if (reduce) s.get = () => s.end;
    scrubs.push(s);
    return s;
  }

  /* =======================================================
     1 · WhatsApp, teléfono y redes
     ======================================================= */
  const N = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const waUrl = (text) => `https://wa.me/${N}?text=${encodeURIComponent(text)}`;
  safe(() => {
    if (!N) {
      root.classList.add('no-wa');
      const f = $('#form'); if (f) f.setAttribute('hidden', '');
      const n = $('#notice'); if (n) n.removeAttribute('hidden');
      return;
    }
    $$('a[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.msg || 'Hola, quiero que me ayuden con un pendiente.');
      a.target = '_blank';
      a.rel = 'noopener';
    });
    const d = N.slice(-10);
    const pretty = `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
    $$('[data-phone]').forEach((a) => { a.textContent = pretty; a.href = `tel:+${N}`; });
    $$('[data-phone-text]').forEach((s) => { s.textContent = pretty; });
  });
  safe(() => {
    Object.keys(SOCIAL).forEach((k) => {
      const url = SOCIAL[k];
      const a = $(`[data-social="${k}"]`);
      if (a && url) { a.href = url; a.parentElement.hidden = false; }
    });
  });

  /* =======================================================
     2 · Cargador (≤ 2.3 s) — hero entra por CSS puro
     ======================================================= */
  let heroStarted = false;
  function heroStart() {
    if (heroStarted) return;
    heroStarted = true;
    safe(() => {
      if (window.anime && !reduce) {
        window.anime({
          targets: '.chipf',
          scale: [0, 1],
          opacity: [0, 1],
          delay: window.anime.stagger(150, { start: 400 }),
          duration: 1100,
          easing: 'easeOutElastic(1, .6)'
        });
      }
    });
  }
  safe(() => {
    const L = $('#loader');
    if (!L) { heroStart(); return; }
    const pct = $('#ldPct'), arc = $('#ldArc'), tip = $('#ldTip');
    const dur = reduce ? 300 : 1600;
    const t0 = performance.now();
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      L.classList.add('out');
      heroStart();
      setTimeout(() => { L.classList.add('done'); L.setAttribute('aria-hidden', 'true'); }, reduce ? 50 : 520);
    };
    const frame = (now) => {
      if (ended) return;
      const t = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 2.2);
      const v = Math.round(e * 100);
      if (pct) pct.textContent = String(v).padStart(2, '0') + '%';
      if (arc) arc.style.strokeDashoffset = String(100 - e * 100);
      if (tip) tip.style.transform = `rotate(${(e * 360).toFixed(1)}deg)`;
      if (t < 1) requestAnimationFrame(frame); else setTimeout(end, 80);
    };
    requestAnimationFrame(frame);
    setTimeout(end, reduce ? 450 : 2300);   // temporizador duro
  });

  /* =======================================================
     3 · Revelados con respaldo por geometría
     ======================================================= */
  const revealEls = $$('[data-reveal], .mask');
  let sweepReveal = () => {};
  function startCounter(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reduce) { el.textContent = String(target); return; }
    const set = (v) => { el.textContent = String(Math.round(v)); };
    if (window.anime) {
      const o = { v: 0 };
      set(0);
      window.anime({ targets: o, v: target, duration: 1800, easing: 'easeOutExpo', update: () => set(o.v), complete: () => set(target) });
    } else {
      const t0 = performance.now();
      const f = (now) => {
        const t = clamp((now - t0) / 1800);
        set(target * easeOut(t));
        if (t < 1) requestAnimationFrame(f); else set(target);
      };
      set(0);
      requestAnimationFrame(f);
    }
  }
  function showEl(el) {
    if (el.classList.contains('is-in')) return;
    const d = parseInt(el.dataset.delay || '0', 10);
    if (d && !reduce) {
      el.style.transitionDelay = d + 'ms';
      setTimeout(() => { el.style.transitionDelay = ''; }, d + 1600);
    }
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(startCounter);
  }
  safe(() => {
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { showEl(en.target); io.unobserve(en.target); }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => io.observe(el));
    }
    const pending = new Set(revealEls);
    sweepReveal = () => {
      const vh = window.innerHeight;
      pending.forEach((el) => {
        if (el.classList.contains('is-in')) { pending.delete(el); return; }
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh * 0.96) {
          showEl(el);
          pending.delete(el);
          if (io) io.unobserve(el);
        }
      });
    };
    if (!io || reduce) revealEls.forEach(showEl);
    extras.push(sweepReveal);
    window.addEventListener('load', () => { sweepReveal(); setTimeout(sweepReveal, 2000); });
    setTimeout(sweepReveal, 2000);
    setTimeout(sweepReveal, 3500);
  });

  /* =======================================================
     4 · Palabras de «Tu lista, tachada»
     ======================================================= */
  safe(() => {
    const h = $('[data-words]');
    if (!h) return;
    let k = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else {
              const s = document.createElement('span');
              s.className = 'w';
              s.style.setProperty('--k', k++);
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    };
    walk(h);
    h.style.setProperty('--n', k);
  });

  /* =======================================================
     5 · Encabezado, menú, progreso y riel
     ======================================================= */
  safe(() => {
    const hdr = $('#hdr'), bar = $('#progress i'), burger = $('#burger'), menu = $('#menu');

    const setMenu = (open) => {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
    };
    burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 900) setMenu(false); });

    /* riel de puntos */
    const secs = $$('[data-rail]');
    const rail = document.createElement('nav');
    rail.className = 'rail';
    rail.setAttribute('aria-label', 'Secciones de la página');
    const dots = secs.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.l = s.dataset.rail;
      b.setAttribute('aria-label', 'Ir a ' + s.dataset.rail);
      b.addEventListener('click', () => s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
      rail.appendChild(b);
      return b;
    });
    document.body.appendChild(rail);

    extras.push(() => {
      const y = window.scrollY;
      hdr.classList.toggle('is-small', y > 40);
      const max = root.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
      const mid = window.innerHeight * 0.5;
      let active = -1;
      secs.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) active = i;
      });
      dots.forEach((d, i) => d.classList.toggle('is-on', i === active));
    });
  });

  /* =======================================================
     6 · Hero: canvas «tráfico de ciudad» + parallax
     ======================================================= */
  safe(() => {
    const cv = $('#trafico'), hero = $('.hero');
    if (!cv || !hero || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, G = 44, parts = [], inView = true, running = false, last = 0;
    const mouse = { x: -999, y: -999 };
    const COLS = { r: [224, 22, 31], m: [14, 27, 61], y: [255, 198, 41] };
    const pick = () => { const q = Math.random(); return q < 0.7 ? COLS.r : q < 0.9 ? COLS.m : COLS.y; };

    function spawn(anywhere) {
      const horiz = Math.random() < 0.5;
      const d = Math.random() < 0.5 ? 1 : -1;
      const p = { dx: horiz ? d : 0, dy: horiz ? 0 : d, speed: 60 + Math.random() * 80, c: pick(), glow: 0, x: 0, y: 0 };
      if (horiz) {
        p.y = Math.floor(Math.random() * Math.ceil(H / G)) * G + 0.5;
        p.x = anywhere ? Math.random() * W : (d > 0 ? -80 : W + 80);
      } else {
        p.x = Math.floor(Math.random() * Math.ceil(W / G)) * G + 0.5;
        p.y = anywhere ? Math.random() * H : (d > 0 ? -80 : H + 80);
      }
      return p;
    }
    function size() {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G = window.innerWidth >= 640 ? 56 : 44;
      const n = clamp(Math.round(W / 30), 18, 46);
      parts = Array.from({ length: n }, () => spawn(true));
      draw();
    }
    function move(p, dt) {
      const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      const near = finePointer && dist < 140;
      p.glow += ((near ? 1 : 0) - p.glow) * 0.15;
      const v = p.speed * (1 + p.glow * 1.2) * dt;
      const nx = p.x + p.dx * v, ny = p.y + p.dy * v;
      if (p.dx) {
        const a = (p.x - 0.5) / G, b = (nx - 0.5) / G;
        if (Math.floor(a) !== Math.floor(b) && Math.random() < 0.35) {
          const k = p.dx > 0 ? Math.floor(b) : Math.floor(a);
          p.x = k * G + 0.5; p.dx = 0; p.dy = Math.random() < 0.5 ? 1 : -1;
        } else p.x = nx;
      } else {
        const a = (p.y - 0.5) / G, b = (ny - 0.5) / G;
        if (Math.floor(a) !== Math.floor(b) && Math.random() < 0.35) {
          const k = p.dy > 0 ? Math.floor(b) : Math.floor(a);
          p.y = k * G + 0.5; p.dy = 0; p.dx = Math.random() < 0.5 ? 1 : -1;
        } else p.y = ny;
      }
      if (p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100) Object.assign(p, spawn(false));
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (const p of parts) {
        const [r, g, b] = p.c;
        const tx = p.x - p.dx * 70, ty = p.y - p.dy * 70;
        const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},${0.75 + p.glow * 0.25})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3 + p.glow * 1.5;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.4 + p.glow * 1.6, 0, 6.2832); ctx.fill();
        if (p.glow > 0.05) {
          ctx.fillStyle = `rgba(${r},${g},${b},${0.22 * p.glow})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 6.2832); ctx.fill();
        }
      }
    }
    function loop(now) {
      if (!inView || document.hidden) { running = false; return; }
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      parts.forEach((p) => move(p, dt));
      draw();
      requestAnimationFrame(loop);
    }
    function start() {
      if (reduce || running || !inView || document.hidden) return;
      running = true; last = performance.now();
      requestAnimationFrame(loop);
    }
    size();
    start();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) start(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', start);
    let rw = window.innerWidth, rh = window.innerHeight;
    window.addEventListener('resize', () => {
      /* en móvil la barra del navegador cambia el alto al hacer scroll: solo se rehace si cambia de verdad */
      if (window.innerWidth !== rw || Math.abs(window.innerHeight - rh) > 160) {
        rw = window.innerWidth; rh = window.innerHeight; size();
      }
    });
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    }
  });

  safe(() => {
    /* parallax de la foto: 0.06× del scroll y 12 px con el puntero */
    const stage = $('#stage'), hero = $('.hero');
    if (!stage || !hero) return;
    const ptr = { x: 0, y: 0 };
    if (finePointer && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = hero.getBoundingClientRect();
        ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        markDirty();
      });
      hero.addEventListener('pointerleave', () => { ptr.x = ptr.y = 0; markDirty(); });
    }
    scrub(() => Math.min(window.scrollY, window.innerHeight * 1.2), (v) => stage.style.setProperty('--sy', v.toFixed(1)), { k: 0.12, end: 0 });
    scrub(() => ptr.x, (v) => stage.style.setProperty('--px', v.toFixed(3)), { k: 0.08, end: 0 });
    scrub(() => ptr.y, (v) => stage.style.setProperty('--py', v.toFixed(3)), { k: 0.08, end: 0 });
  });

  /* =======================================================
     7 · Cintas: duplicado de pista y velocidad según el scroll
     ======================================================= */
  safe(() => {
    const tracks = $$('[data-marq]');
    if (reduce) return;
    tracks.forEach((t) => {
      const g = t.firstElementChild;
      if (!g) return;
      const c = g.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      t.appendChild(c);
    });
    let anims = [];
    const grab = () => { anims = tracks.map((t) => (t.getAnimations ? t.getAnimations()[0] : null)).filter(Boolean); };
    setTimeout(grab, 300);
    window.addEventListener('load', grab);
    let lastY = window.scrollY, boost = 0, applied = 0;
    extras.push(() => {
      const y = window.scrollY;
      boost = Math.max(boost * 0.93, Math.min(Math.abs(y - lastY) * 0.04, 5));
      lastY = y;
      if (boost < 0.01) boost = 0; else busy = true;
      if (Math.abs(boost - applied) > 0.02 || (boost === 0 && applied !== 0)) {
        applied = boost;
        anims.forEach((a) => { try { a.playbackRate = 1 + applied; } catch (e) { /* noop */ } });
      }
    });
  });

  /* =======================================================
     8 · «Tu lista, tachada» (scrub palabra por palabra + post-its)
     ======================================================= */
  safe(() => {
    const sec = $('.lista');
    if (!sec) return;
    const pis = $$('.pi', sec);
    scrub(() => stickyP(sec), (p) => {
      sec.style.setProperty('--p', p.toFixed(4));
      pis.forEach((pi, i) => pi.classList.toggle('done', p >= (i < 8 ? 0.1 + i * 0.085 : 0.86)));
    }, { k: 0.09, end: 1 });
  });

  /* =======================================================
     9 · Servicios: pista horizontal sticky (≥ 900 px) + tilt
     ======================================================= */
  const layouts = [];
  safe(() => {
    const sec = $('#servicios'), track = $('#servTrack'), bar = $('#servBar'), count = $('#servCount');
    if (!sec || !track) return;
    const total = $$('.card', track).length;
    let hs = false, maxX = 0;
    const layout = () => {
      const want = window.innerWidth >= 900 && !reduce;
      sec.classList.toggle('hs', want);
      hs = want;
      track.style.transform = '';
      if (want) {
        maxX = Math.max(0, track.scrollWidth - window.innerWidth);
        sec.style.height = (maxX + window.innerHeight) + 'px';
      } else {
        maxX = 0;
        sec.style.height = '';
      }
      markDirty();
    };
    layouts.push(layout);
    layout();
    scrub(() => (hs ? stickyP(sec) : 0), (p) => {
      if (!hs) return;
      track.style.transform = `translate3d(${(-p * maxX).toFixed(1)}px,0,0)`;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      if (count) count.textContent = `${String(Math.min(total, Math.round(p * (total - 1)) + 1)).padStart(2, '0')} / ${total}`;
    }, { k: 0.09, end: 0 });
  });

  /* =======================================================
     10 · Cómo funciona (teléfono que «chatea»)
     ======================================================= */
  safe(() => {
    const st = $('#comoStage');
    if (!st) return;
    const steps = $$('.step', st);
    const items = $$('.msg, .typing', st);
    let cur = -2;
    const setStep = (n) => {
      if (n === cur) return;
      cur = n;
      st.dataset.step = String(Math.max(0, n));
      steps.forEach((li, i) => li.classList.toggle('is-on', i === Math.max(0, n)));
      items.forEach((el) => el.classList.toggle('on', Number(el.dataset.s) <= n));
    };
    scrub(() => stickyP(st), (p) => {
      st.style.setProperty('--p', p.toFixed(4));
      const r = st.getBoundingClientRect();
      const entered = reduce || r.top < window.innerHeight * 0.45;
      setStep(entered ? Math.min(2, Math.floor(p * 3)) : -1);
    }, { k: 0.14, end: 1 });
    if (reduce) { setStep(2); }
  });

  /* =======================================================
     11 · Rápido · Seguro · Confiable
     ======================================================= */
  safe(() => {
    $$('[data-row]').forEach((row) => {
      const w = $('.row__w', row);
      scrub(() => {
        const r = w.getBoundingClientRect();
        return clamp((window.innerHeight * 0.85 - r.top) / (window.innerHeight * 0.5));
      }, (f) => row.style.setProperty('--fill', f.toFixed(3)), { k: 0.1, end: 1 });
    });
    const sec = $('.pil'), poster = $('#poster');
    if (!sec || !poster) return;
    scrub(() => through(sec), (p) => poster.style.setProperty('--p', p.toFixed(4)), { k: 0.08, end: 0.5 });
    if (finePointer && !reduce) {
      const tgt = { x: 0, y: 0 };
      const zone = $('.pil__poster') || poster;
      zone.addEventListener('pointermove', (e) => {
        const r = poster.getBoundingClientRect();
        tgt.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.7, 0.7);
        tgt.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.7, 0.7);
        markDirty();
      });
      zone.addEventListener('pointerleave', () => { tgt.x = tgt.y = 0; markDirty(); });
      scrub(() => tgt.x, (v) => poster.style.setProperty('--ptx', (v * 12).toFixed(2) + 'deg'), { k: 0.08, end: 0 });
      scrub(() => tgt.y, (v) => poster.style.setProperty('--pty', (-v * 8).toFixed(2) + 'deg'), { k: 0.08, end: 0 });
    }
  });

  /* =======================================================
     12 · Chofer: cartel en perspectiva ligado al scroll
     ======================================================= */
  safe(() => {
    const vis = $('#chofVis');
    if (!vis) return;
    scrub(() => clamp((through(vis) - 0.15) / 0.4), (p) => vis.style.setProperty('--p', p.toFixed(4)), { k: 0.09, end: 1 });
  });

  /* =======================================================
     13 · Fletes: el camión cruza con el scroll
     ======================================================= */
  safe(() => {
    const road = $('#road'), truck = $('#truck');
    if (!road || !truck) return;
    scrub(() => through(road), (p) => {
      const w = road.clientWidth;
      truck.style.setProperty('--tx', ((-0.4 + 1.45 * p) * w).toFixed(1) + 'px');
    }, { k: 0.1, end: 0.5 });
  });

  /* =======================================================
     14 · Equipo: la imagen se abre (clip-path en el hijo)
     ======================================================= */
  safe(() => {
    const sec = $('.exp'), frame = $('#expFrame'), pol = $('#polaroid');
    if (!sec || !frame) return;
    scrub(() => stickyP(sec), (p) => {
      const mob = window.innerWidth < 900;
      const e = easeOut(clamp(p / 0.6));
      const iy = lerp(24, mob ? 10 : 0, e), ix = lerp(20, mob ? 4 : 0, e), r = lerp(40, mob ? 28 : 0, e);
      frame.style.setProperty('--iy', iy.toFixed(2) + '%');
      frame.style.setProperty('--ix', ix.toFixed(2) + '%');
      frame.style.setProperty('--r', r.toFixed(1) + 'px');
      frame.style.setProperty('--z', lerp(1.25, 1, e).toFixed(4));
      frame.style.setProperty('--g', e.toFixed(3));
      sec.classList.toggle('is-open', p > 0.55);
      if (pol) pol.style.setProperty('--pp', easeOut(clamp((p - 0.62) / 0.3)).toFixed(4));
    }, { k: 0.09, end: 1 });
  });

  /* =======================================================
     15 · Gorra roja: órbita 3D
     ======================================================= */
  safe(() => {
    const scene = $('#scene'), orbit = $('#orbit');
    if (!scene || !orbit) return;
    let anims = [], rate = 1;
    const grab = () => {
      if (!orbit.getAnimations) return;
      anims = [orbit, ...$$('.oi__c', orbit)].flatMap((el) => el.getAnimations());
    };
    setTimeout(grab, 400);
    window.addEventListener('load', grab);
    scrub(() => through(scene), (p) => {
      const q = clamp((p - 0.15) / 0.5);
      scene.style.setProperty('--tilt', (75 - 20 * q).toFixed(2) + 'deg');
      const want = 1 + q * 1.2;
      if (!reduce && Math.abs(want - rate) > 0.03) {
        rate = want;
        anims.forEach((a) => { try { a.playbackRate = rate; } catch (err) { /* noop */ } });
      }
    }, { k: 0.08, end: 0.4 });
  });

  /* =======================================================
     16 · Motor rAF único
     ======================================================= */
  function tick() {
    if (dirty || busy) {
      dirty = false; busy = false;
      for (let i = 0; i < scrubs.length; i++) {
        const s = scrubs[i];
        let t;
        try { t = s.get(); } catch (e) { continue; }
        if (s.cur === null || reduce) s.cur = t;
        else {
          const d = t - s.cur;
          if (Math.abs(d) > 0.0005) { s.cur += d * s.k; busy = true; } else s.cur = t;
        }
        if (Math.abs(s.cur - s.last) > 0.00001 || Number.isNaN(s.last)) {
          s.last = s.cur;
          try { s.apply(s.cur); } catch (e) { /* noop */ }
        }
      }
      for (let i = 0; i < extras.length; i++) { try { extras[i](); } catch (e) { /* noop */ } }
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', () => { layouts.forEach((f) => safe(f)); markDirty(); });
  window.addEventListener('load', () => { layouts.forEach((f) => safe(f)); markDirty(); setTimeout(() => { layouts.forEach((f) => safe(f)); markDirty(); }, 600); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layouts.forEach((f) => safe(f)); markDirty(); });
  requestAnimationFrame(tick);

  /* =======================================================
     17 · Microinteracciones
     ======================================================= */
  /* tilt 3D de tarjetas y volante */
  safe(() => {
    if (!finePointer || reduce) return;
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width), y = clamp((e.clientY - r.top) / r.height);
        el.style.setProperty('--ry', ((x - 0.5) * 16).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  });

  /* botones magnéticos (máx. 8 px) */
  safe(() => {
    if (!finePointer || reduce) return;
    $$('[data-mag]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = clamp(((e.clientX - (r.left + r.width / 2)) / r.width) * 16, -8, 8);
        const dy = clamp(((e.clientY - (r.top + r.height / 2)) / r.height) * 16, -8, 8);
        b.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  });

  /* sello que se inclina con el puntero */
  safe(() => {
    const zone = $('.cont__left'), img = $('.sello img');
    if (!zone || !img || !finePointer || reduce) return;
    img.style.transition = 'transform .35s ease-out';
    zone.addEventListener('pointermove', (e) => {
      const r = img.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) / 420, -1, 1);
      const dy = clamp((e.clientY - (r.top + r.height / 2)) / 420, -1, 1);
      img.style.setProperty('--ry', (dx * 18).toFixed(1) + 'deg');
      img.style.setProperty('--rx', (-dy * 18).toFixed(1) + 'deg');
    });
    zone.addEventListener('pointerleave', () => { img.style.setProperty('--rx', '0deg'); img.style.setProperty('--ry', '0deg'); });
  });

  /* acordeón de preguntas (details con altura animada) */
  safe(() => {
    $$('.qa').forEach((d) => {
      const s = $('summary', d);
      let timer = 0;
      s.addEventListener('click', (e) => {
        e.preventDefault();
        clearTimeout(timer);
        if (d.open) {
          d.classList.remove('is-open');
          timer = setTimeout(() => { d.open = false; }, reduce ? 0 : 460);
        } else {
          d.open = true;
          requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
        }
      });
    });
  });

  /* formulario → WhatsApp */
  safe(() => {
    const form = $('#form');
    if (!form || !N) return;
    const nombre = $('#f-nombre'), eN = $('#e-nombre'), eT = $('#e-tipo');
    const radios = $$('input[name="tipo"]', form);
    const btn = $('#formBtn'), ok = $('#formOk');
    nombre.addEventListener('input', () => { eN.textContent = ''; nombre.removeAttribute('aria-invalid'); });
    radios.forEach((r) => r.addEventListener('change', () => { eT.textContent = ''; }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nom = nombre.value.trim();
      const tipo = (radios.find((r) => r.checked) || {}).value;
      let bad = null;
      if (nom.length < 2) {
        eN.textContent = 'Dinos tu nombre para saber con quién hablamos.';
        nombre.setAttribute('aria-invalid', 'true');
        bad = nombre;
      } else { eN.textContent = ''; nombre.removeAttribute('aria-invalid'); }
      if (!tipo) {
        eT.textContent = 'Elige qué necesitas para armar tu pedido.';
        if (!bad) bad = radios[0];
      } else eT.textContent = '';
      if (bad) { bad.focus(); return; }
      const detalle = $('#f-detalle').value.trim().replace(/[.\s]+$/, '');
      const cuando = $('#f-cuando').value;
      const msg = `Hola, soy ${nom}. Necesito: ${tipo}. ${detalle ? `Detalle: ${detalle}. ` : ''}Para: ${cuando}.`;
      const url = waUrl(msg);
      form.classList.add('sent');
      ok.querySelector('span').textContent = 'Abriendo WhatsApp…';
      btn.querySelector('.btn__t').textContent = '¡Pedido enviado!';
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
      setTimeout(() => { btn.querySelector('.btn__t').textContent = 'Enviar mi pedido por WhatsApp'; }, 4000);
    });
  });

  /* burbuja del botón flotante (una vez, a los 6 s) */
  safe(() => {
    const waf = $('#waf');
    if (!waf || !N) return;
    setTimeout(() => {
      waf.classList.add('show-bub');
      setTimeout(() => waf.classList.remove('show-bub'), 7000);
    }, 6000);
    waf.addEventListener('click', () => waf.classList.remove('show-bub'));
  });

  /* volver arriba con cohete */
  safe(() => {
    const up = $('#toTop');
    if (!up) return;
    up.addEventListener('click', () => {
      up.classList.add('go');
      setTimeout(() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : 350);
      setTimeout(() => up.classList.remove('go'), 1800);
    });
  });
})();
