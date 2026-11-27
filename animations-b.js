/* Metalens — motion
   Todo en vanilla. Si el sistema pide menos movimiento, se muestra el estado final. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  document.documentElement.classList.add('js');
  if (reduce) document.documentElement.classList.add('reduce');

  /* ── 1. Títulos: máscaras por línea en desktop; texto fluido en mobile ── */
  const mobileTitles = matchMedia('(max-width: 599px)');
  const titles = $$('.display-166, .display-80, .demo__title').map(el => ({
    el,
    lines: el.innerHTML.split(/<br\s*\/?>/i).map(line => line.trim())
  }));
  function wrapTitles() {
    titles.forEach(({ el, lines }) => {
      const parts = mobileTitles.matches ? [lines.join(' ')] : lines;
      el.innerHTML = parts
        .map((text, i) => `<span class="line"><span style="--i:${i}">${text}</span></span>`)
        .join(' ');
      el.setAttribute('data-reveal', '');
    });
  }
  wrapTitles();
  mobileTitles.addEventListener('change', wrapTitles);

  /* Hero: cada span absoluto se vuelve máscara */
  $$('.hero__title > span').forEach((el, i) => {
    el.innerHTML = `<span class="rise" style="--i:${i}">${el.innerHTML}</span>`;
  });
  /* en mobile la última parte del título son tres renglones: cada uno con su propia máscara */
  const line2 = $('.hero__line2'), line2Html = line2.innerHTML;
  function splitHeroLines() {
    if (!mobileTitles.matches) { line2.innerHTML = line2Html; return; }
    const words = line2.textContent.trim().split(/\s+/);
    line2.innerHTML = words.map((w, k) => `<span class="hl"><span class="rise" style="--i:${2 + k}">${w}</span></span>`).join('');
  }
  splitHeroLines();
  mobileTitles.addEventListener('change', splitHeroLines);
  const nav = $('.nav'), menuToggle = $('.nav__toggle');
  function setMenuOpen(open) {
    if (open) {   // la X queda exactamente donde estaba la hamburguesa, aunque la página esté un poco scrolleada
      const r = menuToggle.getBoundingClientRect();
      nav.style.setProperty('--tg-top', r.top + 'px');
      nav.style.setProperty('--tg-right', (document.documentElement.clientWidth - r.right) + 'px');
    }
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);   // sin scroll detrás del menú
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
  $$('.nav__links a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) setMenuOpen(false);
  });
  mobileTitles.addEventListener('change', () => setMenuOpen(false));
  /* EVERY: letra por letra, de la primera a la última (fill the gap) */
  const every = $('.hero__every .rise');
  every.innerHTML = [...every.textContent].map((c, i) => `<span class="lt" style="--d:${i}">${c}</span>`).join('');
  /* corchetes: cuánto correr cada uno para que arranquen cerrados en el centro del hueco */
  function closeBrackets() {
    const l = $('.hero__br--l'), r = $('.hero__br--r');
    const lEdge = l.offsetLeft + l.offsetWidth, c = (lEdge + r.offsetLeft) / 2;   // offset* ignora transforms
    [l, r].forEach(el => (el.style.transition = 'none'));   // saltar directo a "cerrados", sin animar ese paso
    l.style.setProperty('--close-l', (c - lEdge) + 'px');
    r.style.setProperty('--close-r', (c - r.offsetLeft) + 'px');
    l.offsetWidth;   // fija el estado cerrado antes de devolver la transición
    [l, r].forEach(el => el.style.removeProperty('transition'));
  }

  /* Hover: los textos de links y botones se duplican para poder "rodar" (ver HOVERS en styles.css) */
  $$('.nav__links a, .col a:not(.col__aerolab), .btn').forEach(el => {
    const t = el.textContent.trim();
    if (!t || el.children.length) return;
    el.innerHTML = `<span class="roll" data-t="${t}"><span>${t}</span></span>`;
  });

  /* Menú mobile: cada renglón de cada link va en su propia máscara, así sube por separado.
     Se mide dónde corta cada palabra y se arman los renglones; en desktop vuelve a la estructura del hover. */
  const menuLinks = $$('.nav__links a');
  menuLinks.forEach(a => (a.dataset.label = a.textContent.trim()));
  function splitMenuLines() {
    let n = 0;
    menuLinks.forEach(a => {
      const t = a.dataset.label;
      if (!mobileTitles.matches) { a.innerHTML = `<span class="roll" data-t="${t}"><span>${t}</span></span>`; return; }
      a.innerHTML = t.split(' ').map(w => `<span class="mw">${w}</span>`).join(' ');
      const lines = [];
      a.querySelectorAll('.mw').forEach(w => {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.top - w.offsetTop) < 2) last.words.push(w.textContent);
        else lines.push({ top: w.offsetTop, words: [w.textContent] });
      });
      a.innerHTML = lines.map(l => `<span class="mline"><span style="--l:${n++}">${l.words.join(' ')}</span></span>`).join('');
    });
  }
  document.fonts.ready.then(splitMenuLines);
  mobileTitles.addEventListener('change', splitMenuLines);
  let splitTimer;
  addEventListener('resize', () => { clearTimeout(splitTimer); splitTimer = setTimeout(splitMenuLines, 150); });

  /* ── B2 · Las tres experiencias de Polymorphic Design ── */
  const cmpPanel = $('[data-cmp]');
  if (cmpPanel) {
    const cmp = $('.cmp', cmpPanel), chips = $$('.aud__chip', cmpPanel), previews = $$('.poly-demo', cmp);
    const options = $$('.aud__option', cmpPanel), descriptions = $$('.aud__description', cmpPanel);
    const playback = $('.live__playback', cmpPanel), playbackLabel = $('.live__playback-label', playback);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let cur = Math.max(0, chips.findIndex(chip => chip.classList.contains('is-on'))), playing = !motion.matches, visible = false, timer;
    const stopTimer = () => clearTimeout(timer);
    const canPlay = () => playing && visible && !document.hidden && !motion.matches;
    const syncPlayback = () => {
      playback.dataset.playing = String(playing);
      playbackLabel.textContent = playing ? 'Pause' : 'Play';
      playback.setAttribute('aria-label', playing ? 'Pause demo animation' : 'Play demo animation');
      playback.hidden = motion.matches;
    };
    // FLIP: los fondos cambian de geometría; los textos conservan su tamaño.
    // Los rectángulos se miden una vez por cambio, nunca en cada frame.
    let morphAnimations = [], morphLayer = null, morphVersion = 0;
    const morphEase = 'cubic-bezier(.76, 0, .24, 1)';
    const readBox = (node, origin, extra = {}) => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height,
        color: style.backgroundColor, radius: style.borderRadius, ...extra };
    };
    const readBlocks = (view, origin) => {
      const blocks = new Map();
      blocks.set('shell', readBox($('.poly-tool', view), origin));
      blocks.set('field', readBox($('.poly-tool__amount, .poly-api__endpoint', view), origin));
      const result = $('.poly-tool__amount--result', view);
      if (result) {
        // Un resultado ancho se divide en dos piezas que luego se separan.
        const box = readBox(result, origin);
        blocks.set('left', { ...box, width: box.width / 2 });
        blocks.set('right', { ...box, x: box.x + box.width / 2, width: box.width / 2 });
      } else {
        $$('.poly-tool__metric, .poly-api__editor', view).forEach((node, index) => {
          blocks.set(index === 0 ? 'left' : 'right', readBox(node, origin));
        });
      }
      blocks.set('action', readBox($('.poly-demo__cta', view), origin));
      return blocks;
    };
    const finishMorph = () => {
      morphVersion++;
      morphAnimations.forEach(animation => animation.cancel());
      morphAnimations = [];
      morphLayer?.remove(); morphLayer = null;
      cmp.classList.remove('is-morphing');
      cmp.setAttribute('aria-busy', 'false');
    };
    const tween = (node, frames, options) => {
      const animation = node.animate(frames, { fill: 'both', ...options });
      morphAnimations.push(animation);
      return animation;
    };
    const morphTo = (next, previous, from, to, origin, oldOpacity) => {
      const version = morphVersion;
      morphLayer = document.createElement('div');
      morphLayer.className = 'poly-morph';
      morphLayer.setAttribute('aria-hidden', 'true');
      morphLayer.inert = true;
      // Texto saliente sin fondos ni IDs duplicados; desaparece antes del nuevo.
      const copy = previous.cloneNode(true), rect = previous.getBoundingClientRect();
      copy.removeAttribute('id');
      $$('[id]', copy).forEach(node => node.removeAttribute('id'));
      copy.className = 'poly-demo poly-morph__copy';
      Object.assign(copy.style, { left: `${rect.left - origin.left}px`, top: `${rect.top - origin.top}px`, width: `${rect.width}px` });
      morphLayer.append(copy);
      tween(copy, [{ opacity: oldOpacity, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 160, easing: 'cubic-bezier(.4, 0, 1, 1)' });
      to.forEach((target, key) => {
        const start = from.get(key), block = document.createElement('div');
        block.className = 'poly-morph__block';
        block.dataset.block = key; block.dataset.color = target.color;
        Object.assign(block.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.width}px`, height: `${target.height}px`, borderRadius: target.radius });
        const before = document.createElement('div'), after = document.createElement('div');
        before.style.background = start.color; after.style.background = target.color;
        block.append(before, after); morphLayer.append(block);
        const delay = key === 'left' ? 40 : key === 'right' ? 85 : 0;
        const duration = key === 'shell' ? 760 : key === 'action' ? 680 : 700;
        const transform = `translate(${start.x - target.x}px, ${start.y - target.y}px) scale(${start.width / target.width}, ${start.height / target.height})`;
        tween(block, [{ transform }, { transform: 'translate(0, 0) scale(1, 1)' }], { duration, delay, easing: morphEase });
        tween(before, [{ opacity: 1 }, { opacity: 0 }], { duration, delay, easing: morphEase });
        tween(after, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: morphEase });
      });
      cmp.append(morphLayer);
      cmp.classList.add('is-morphing');
      cmp.setAttribute('aria-busy', 'true');
      const textGroups = $$('.poly-demo__intro, .poly-tool__heading, .poly-tool__amount, .poly-tool__metric, .poly-tool__footnote, .poly-tool__total, .poly-api__endpoint, .poly-api__editor, .poly-demo__cta, .poly-demo__note', next);
      textGroups.forEach((node, index) => {
        tween(node, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], {
          duration: 360, delay: 300 + Math.min(index, 6) * 28, easing: 'cubic-bezier(.22, 1, .36, 1)'
        });
      });
      Promise.all(morphAnimations.map(animation => animation.finished.catch(() => {}))).then(() => {
        if (version === morphVersion) finishMorph();
      });
    };
    const select = (i, instant = false) => {
      const previous = previews[cur], next = previews[i];
      if (i === cur) { if (instant || motion.matches) finishMorph(); return; }
      const animate = !instant && !motion.matches && typeof next.animate === 'function';
      let from, to, origin, oldOpacity;
      if (animate) {
        origin = cmp.getBoundingClientRect();
        from = readBlocks(previous, origin); to = readBlocks(next, origin);
        oldOpacity = Number(getComputedStyle($('.poly-demo__intro', previous)).opacity);
        // Si llega otro clic, retomar la forma visible, sin saltar al estado anterior.
        if (morphLayer) $$('.poly-morph__block', morphLayer).forEach(node => {
          from.set(node.dataset.block, readBox(node, origin, { color: node.dataset.color }));
        });
      }
      finishMorph();
      cur = i;
      chips.forEach((chip, k) => {
        const active = k === i;
        chip.classList.toggle('is-on', active);
        chip.setAttribute('aria-selected', String(active));
        chip.tabIndex = active ? 0 : -1;
        options[k].classList.toggle('is-on', active);
        descriptions[k].hidden = !active;
        previews[k].classList.toggle('is-on', active);
        previews[k].setAttribute('aria-hidden', String(!active));
        previews[k].inert = !active;
      });
      if (animate) morphTo(next, previous, from, to, origin, oldOpacity);
    };
    const schedule = () => {
      stopTimer();
      if (canPlay()) timer = setTimeout(() => { select((cur + 1) % chips.length); schedule(); }, 5500);
    };
    const pause = () => { playing = false; stopTimer(); syncPlayback(); };
    const choose = (i, instant) => {
      pause(); cmp.setAttribute('aria-live', 'polite'); select(i, instant);
    };
    chips.forEach((chip, k) => {
      chip.addEventListener('click', e => choose(k, e.detail === 0));
      chip.addEventListener('keydown', e => {
        const next = { ArrowUp: (k + chips.length - 1) % chips.length, ArrowDown: (k + 1) % chips.length, Home: 0, End: chips.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault(); choose(next, true); chips[next].focus();
      });
      chip.addEventListener('focus', () => { if (playing) pause(); });
    });
    // Una demo enfocada no se reemplaza mientras la persona la está usando.
    cmp.addEventListener('focusin', pause);
    playback.addEventListener('click', () => {
      if (playing) { pause(); return; }
      playing = true; syncPlayback(); cmp.setAttribute('aria-live', 'off'); schedule();
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .25;
      if (!visible) finishMorph();
      schedule();
    }, { threshold: .25 }).observe(cmp);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) finishMorph();
      schedule();
    });
    addEventListener('resize', () => { finishMorph(); schedule(); });
    motion.addEventListener('change', () => {
      if (motion.matches) pause();
      syncPlayback(); select(cur, true);
    });
    // Acciones de muestra: no crean links de cobro ni envían pagos reales.
    $('[data-demo-action="link"]', cmp).addEventListener('click', () => {
      $('[data-link-status]', cmp).textContent = 'Sample link created: pay.example/demo';
    });
    let sampleSales = false;
    $('[data-demo-action="sales"]', cmp).addEventListener('click', e => {
      sampleSales = !sampleSales;
      $('[data-store-sales]', cmp).textContent = sampleSales ? '$500,000' : '$1,250,000';
      $('[data-store-fees]', cmp).textContent = sampleSales ? '$4,000' : '$10,000';
      $('[data-store-net]', cmp).textContent = sampleSales ? '$496,000' : '$1,240,000';
      $('#preview-store .poly-tool__currency', cmp).textContent = 'ARS';
      e.currentTarget.textContent = sampleSales ? 'Try ARS 1,250,000' : 'Try ARS 500,000';
    });
    $('[data-demo-action="payment"]', cmp).addEventListener('click', () => {
      $('[data-api-status]', cmp).textContent = '200 OK';
      $('[data-api-hint]', cmp).textContent = 'Test payment approved. ARS 12,500 · Sandbox only.';
    });
    syncPlayback();
  }

  /* ── 2. Intro: palabras que se encienden con el scroll ── */
  const intro = $('.intro__text');
  intro.querySelectorAll(':scope > span').forEach(group => {
    group.innerHTML = group.textContent.trim().split(/\s+/)
      .map(w => `<span class="w">${w}</span>`).join(' ');
  });
  const words = $$('.w', intro);

  /* ── 3. Fades genéricos ── */
  $$('.tag, .migration__lead, .person__copy, .label-mako, .label-supreme, .form, .cols, .demo__note, .demo__logo-mask, .feat, .live__panel')
    .forEach(el => el.setAttribute('data-reveal', ''));

  if (reduce) { $$('[data-reveal]').forEach(el => el.classList.add('is-in')); }
  else {
    const reveal = (entries, obs) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
    });
    const io = new IntersectionObserver(reveal, { rootMargin: '0px 0px -12% 0px' });
    const ioEdge = new IntersectionObserver(reveal, { rootMargin: '0px' });   // lo que vive pegado al fondo de la página
    $$('[data-reveal]').forEach(el => (el.matches('.demo__logo-mask') ? ioEdge : io).observe(el));
    $$('.price-card').forEach(el => io.observe(el));
  }

  /* Hero arranca al cargar las fuentes */
  document.fonts.ready.then(() => {
    closeBrackets();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));
  });

  /* ── 4. Animaciones ligadas al scroll ── */
  const steps  = $('.steps');
  const pin    = $('.steps__pin');
  const cards  = $$('.step');

  // si la ventana es baja, el bloque de cards se achica lo justo para entrar entero (solo desktop)
  function fitPin() {
    const desktop = document.documentElement.clientWidth >= 1024;
    pin.style.removeProperty('--fit');
    const fit = desktop ? Math.min(1, (innerHeight - 48) / pin.offsetHeight) : 1;
    pin.style.setProperty('--fit', fit.toFixed(4));
  }
  addEventListener('resize', fitPin);
  fitPin();

  function onScroll() {
    const vh = innerHeight;

    // intro: palabra por palabra
    {
      const r = intro.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25));
      const n = words.length;
      words.forEach((w, i) => w.style.opacity = reduce ? 1 : 0.18 + 0.82 * clamp(p * n * 1.15 - i));
    }

    stepFromScroll();

    if (reduce) return;

    // pasos: la zona queda fija y las cards se disparan de a una; cada una se apoya sobre la anterior
    {
      const r = steps.getBoundingClientRect();
      const pinTop = parseFloat(getComputedStyle(pin).top);
      const track = r.height - pin.offsetHeight;    // recorrido de scroll disponible
      const p = track > 1 ? (pinTop - r.top) / track : 1; // sin pista: las tarjetas quedan en el flujo
      // disparadores: al pasar cada umbral la card entra sola y completa (CSS); al volver a subir, sale
      const triggers = [-0.3, 0.2, 0.55];             // 01 al llegar, 02 y 03 mientras la zona está fija
      cards.forEach((c, i) => c.classList.toggle('is-in', p > triggers[i]));
    }
  }

  /* ── Steps del producto: se pintan con el scroll o con clic ── */
  const product = $('.product');
  const productPin = $('.product__pin');
  const ptabs = $$('.ptab');
  const demoStage = $('.product__stage');
  const demoLoop = $('.product__loop');
  const demoVideo = $('.product__video');
  const demoMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const demoMobile = matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
  let demoVisible = !('IntersectionObserver' in window);
  let wantsPlayback = !demoMotion.matches;
  let demoResumeTime = null;

  function syncDemo() {
    if (demoVisible && wantsPlayback) demoVideo.play().catch(() => {});
    else demoVideo.pause();
  }

  demoLoop.addEventListener('click', () => {
    wantsPlayback = demoVideo.paused;
    syncDemo();
  });
  function updateDemoState() {
    demoLoop.setAttribute('aria-pressed', String(!demoVideo.paused));
  }
  demoVideo.addEventListener('play', updateDemoState);
  demoVideo.addEventListener('pause', updateDemoState);
  demoVideo.addEventListener('loadedmetadata', () => {
    if (demoResumeTime === null || demoVideo.currentSrc !== demoVideo.src) return;
    demoVideo.currentTime = demoResumeTime;
    demoResumeTime = null;
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      if (visible === demoVisible) return;
      demoVisible = visible;
      syncDemo();
    }, { threshold: 0.45 }).observe(demoStage);
  }
  demoMotion.addEventListener('change', () => {
    wantsPlayback = !demoMotion.matches;
    syncDemo();
  });

  let current = -1;
  function setDemoSource(tab, keepTime = false) {
    const name = (demoMobile.matches && tab.dataset.demoMobile) || tab.dataset.demo;
    const src = `assets/demos/${name}.mp4?v=7`;
    if (demoVideo.getAttribute('src') === src) return false;

    const time = keepTime ? (demoResumeTime ?? demoVideo.currentTime) : 0;
    demoVideo.pause();
    demoResumeTime = time > 0 ? time : null;
    demoVideo.poster = `assets/demos/${name}.jpg?v=6`;
    demoVideo.src = src;
    return true;
  }
  demoMobile.addEventListener('change', () => {
    if (current >= 0 && setDemoSource(ptabs[current], true)) syncDemo();
  });

  function setStep(n) {
    if (n === current) return;
    current = n;
    ptabs.forEach((t, i) => {
      const was = t.classList.contains('is-on'), on = i <= n;
      t.classList.toggle('is-on', on);               // se van sumando: 01, 01+02, 01+02+03
      t.classList.remove('is-new');
      if (on && !was) { void t.offsetWidth; t.classList.add('is-new'); }   // el que recién se pinta: su texto sube
      t.setAttribute('aria-selected', i === n);
      t.tabIndex = i === n ? 0 : -1;
    });
    const tab = ptabs[n];
    demoStage.setAttribute('aria-labelledby', tab.id);
    demoLoop.setAttribute('aria-label', `Play or pause. ${tab.dataset.description}`);
    if (setDemoSource(tab)) wantsPlayback = !demoMotion.matches;
    syncDemo();
  }
  function productProgress() {
    const r = product.getBoundingClientRect();
    const pinTop = parseFloat(getComputedStyle(productPin).top);
    return (pinTop - r.top) / (r.height - productPin.offsetHeight);       // 0 → 1 mientras está fijo
  }
  // Durante el desplazamiento hacia una pestaña, se mantiene la selección del clic.
  let lockProductStep = false;
  function stepFromScroll() {
    if (lockProductStep) return;
    if (product.offsetHeight <= productPin.offsetHeight + 1) return;          // sin pista (menos movimiento): manda el clic
    const p = productProgress();
    setStep(p < 0.33 ? 0 : p < 0.66 ? 1 : 2);
  }
  ptabs.forEach((t, i) => t.addEventListener('click', () => {
    setStep(i);
    // lleva el scroll al tramo de ese step, así scroll y selección quedan sincronizados
    const r = product.getBoundingClientRect();
    const pinTop = parseFloat(getComputedStyle(productPin).top);
    const track = r.height - productPin.offsetHeight;
    const target = scrollY + r.top - pinTop + track * (i * 0.33 + 0.16);
    if (track > 1) glideTo(target, stepFromScroll, true);
  }));
  ptabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || (mobileTitles.matches && event.key === 'ArrowDown')) next = (index + 1) % ptabs.length;
    else if (event.key === 'ArrowLeft' || (mobileTitles.matches && event.key === 'ArrowUp')) next = (index + ptabs.length - 1) % ptabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ptabs.length - 1;
    else return;
    event.preventDefault();
    ptabs[next].focus({ preventScroll: true });
    ptabs[next].click();
  }));


  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ── Desplazamiento suave para links internos y pestañas ──
     Duración según la distancia; se cancela si la persona mueve la rueda o toca la pantalla. */
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let glide = 0;
  function cancelGlide() {
    cancelAnimationFrame(glide);
    glide = 0;
    lockProductStep = false;
  }
  ['wheel', 'touchstart'].forEach(ev => addEventListener(ev, cancelGlide, { passive: true }));
  addEventListener('keydown', event => {
    if (!event.defaultPrevented) cancelGlide();
  });
  function glideTo(y, done, keepProductStep = false) {
    cancelGlide();
    lockProductStep = keepProductStep;
    const from = scrollY, dist = y - from;
    const finish = () => {
      glide = 0;
      lockProductStep = false;
      done?.();
    };
    if (reduce || Math.abs(dist) < 2) { scrollTo(0, y); finish(); return; }
    const dur = Math.min(1600, Math.max(600, 450 + Math.abs(dist) * 0.12));
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + dist * easeInOut(t));
      if (t < 1) glide = requestAnimationFrame(step);
      else finish();
    };
    glide = requestAnimationFrame(step);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', ev => {
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : document.documentElement;
    if (!target) return;
    ev.preventDefault();
    const y = id ? target.getBoundingClientRect().top + scrollY : 0;
    glideTo(y, () => {
      if (id) {
        const top = target.getBoundingClientRect().top;
        if (Math.abs(top) > 1) scrollTo(0, scrollY + top);
      }
      history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
      if (id) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  }));

  /* ── 5. FAQ: abrir/cerrar con altura suave, uno por vez ── */
  const items = $$('.qa');
  const DUR = reduce ? 0 : 420, EASE = 'cubic-bezier(.2,.7,.1,1)';
  const faqAnimations = new WeakMap();

  function animateHeight(d, open) {
    const from = d.offsetHeight;
    const previous = faqAnimations.get(d);
    if (previous) {
      previous.onfinish = null;
      previous.cancel();
    }
    if (open) d.open = true;
    d.classList.toggle('is-open', open);
    const to = open ? d.offsetHeight : closedHeight(d);
    const a = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: DUR, easing: EASE });
    faqAnimations.set(d, a);
    d.style.overflow = 'hidden';
    a.onfinish = () => {
      if (faqAnimations.get(d) !== a) return;
      if (!open) d.open = false;
      d.style.overflow = '';
      faqAnimations.delete(d);
    };
  }
  function closedHeight(d) {
    const was = d.open, cls = d.classList.contains('is-open');
    d.open = false; d.classList.remove('is-open');
    const h = d.offsetHeight;
    d.open = was; d.classList.toggle('is-open', cls);
    return h;
  }
  items.forEach(d => {
    if (d.open) d.classList.add('is-open');
    $('summary', d).addEventListener('click', ev => {
      ev.preventDefault();
      const opening = !d.classList.contains('is-open');
      items.forEach(o => o !== d && o.classList.contains('is-open') && animateHeight(o, false));
      animateHeight(d, opening);
    });
  });
})();
