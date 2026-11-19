/* Metalens — motion
   Todo en vanilla. Si el sistema pide menos movimiento, se muestra el estado final. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

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
  let closingTimer;
  function setMenuOpen(open) {
    if (open) {   // la X queda exactamente donde estaba la hamburguesa, aunque la página esté un poco scrolleada
      const r = menuToggle.getBoundingClientRect();
      nav.style.setProperty('--tg-top', r.top + 'px');
      nav.style.setProperty('--tg-right', (document.documentElement.clientWidth - r.right) + 'px');
    }
    const wasOpen = nav.classList.contains('is-open');
    clearTimeout(closingTimer);
    nav.classList.toggle('is-closing', wasOpen && !open);   // textos salen hacia arriba
    if (wasOpen && !open) closingTimer = setTimeout(() => nav.classList.remove('is-closing'), 900);
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

  /* ── 2. Intro: palabras que se encienden con el scroll ── */
  const intro = $('.intro__text');
  intro.querySelectorAll(':scope > span').forEach(group => {
    group.innerHTML = group.textContent.trim().split(/\s+/)
      .map(w => `<span class="w">${w}</span>`).join(' ');
  });
  const words = $$('.w', intro);

  /* ── 3. Fades genéricos ── */
  $$('.tag, .migration__lead, .person__copy, .label-mako, .label-supreme, .form, .cols, .demo__note, .demo__logo-mask')
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
  const editor = $('.product__editor');
  const stage  = $('.product__stage');
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

    // editor: sube y crece
    {
      const r = stage.getBoundingClientRect();
      const e = easeOut(clamp((vh - r.top) / (vh * 0.85)));
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
      editor.style.transform = `translate3d(0, ${(1 - e) * 160 * u}px, 0) scale(${0.9 + 0.1 * e})`;
    }

    // pasos: la zona queda fija y las cards se disparan de a una; cada una se apoya sobre la anterior
    {
      const r = steps.getBoundingClientRect();
      const pinTop = parseFloat(getComputedStyle(pin).top);
      const track = r.height - pin.offsetHeight;    // recorrido de scroll disponible
      const p = (pinTop - r.top) / track;           // 0 → 1 mientras está fija (negativo antes)
      // disparadores: al pasar cada umbral la card entra sola y completa (CSS); al volver a subir, sale
      const triggers = [-0.3, 0.2, 0.55];             // 01 al llegar, 02 y 03 mientras la zona está fija
      cards.forEach((c, i) => c.classList.toggle('is-in', p > triggers[i]));
    }
  }

  /* ── Steps del producto: se pintan con el scroll o con clic ── */
  const product = $('.product');
  const productPin = $('.product__pin');
  const ptabs = $$('.ptab');
  let current = -1;
  function setStep(n) {
    if (n === current) return;
    current = n;
    ptabs.forEach((t, i) => {
      const was = t.classList.contains('is-on'), on = i <= n;
      t.classList.toggle('is-on', on);               // se van sumando: 01, 01+02, 01+02+03
      t.classList.remove('is-new');
      if (on && !was) { void t.offsetWidth; t.classList.add('is-new'); }   // el que recién se pinta: su texto sube
      t.setAttribute('aria-selected', i === n);
    });
  }
  function productProgress() {
    const r = product.getBoundingClientRect();
    const pinTop = parseFloat(getComputedStyle(productPin).top);
    return (pinTop - r.top) / (r.height - productPin.offsetHeight);       // 0 → 1 mientras está fijo
  }
  // mientras la página se desplaza sola después de un clic, manda el clic: el scroll no repinta los steps
  let clickLock = false, lockTimer = 0;
  function unlock() { clickLock = false; clearTimeout(lockTimer); }
  function stepFromScroll() {
    if (clickLock) return;
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
    if (track > 1) {
      clickLock = true;
      clearTimeout(lockTimer);
      addEventListener('scrollend', unlock, { once: true });
      lockTimer = setTimeout(unlock, 1500);          // por si el navegador no avisa el fin del scroll
      scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    }
  }));


  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ── Links internos: desplazamiento suave en vez de salto ──
     Duración según la distancia; se cancela si la persona mueve la rueda o toca la pantalla. */
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let glide = 0;
  function cancelGlide() { cancelAnimationFrame(glide); glide = 0; }
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, cancelGlide, { passive: true }));
  function glideTo(y, done) {
    cancelGlide();
    const from = scrollY, dist = y - from;
    if (reduce || Math.abs(dist) < 2) { scrollTo(0, y); done && done(); return; }
    const dur = Math.min(1600, Math.max(600, 450 + Math.abs(dist) * 0.12));
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + dist * easeInOut(t));
      if (t < 1) glide = requestAnimationFrame(step);
      else { glide = 0; done && done(); }
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
      history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
      if (id) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  }));

  /* ── 5. FAQ: abrir/cerrar con altura suave, uno por vez ── */
  const items = $$('.qa');
  const DUR = reduce ? 0 : 420, EASE = 'cubic-bezier(.2,.7,.1,1)';

  function animateHeight(d, open) {
    const from = d.offsetHeight;
    if (open) d.open = true;
    d.classList.toggle('is-open', open);
    const to = open ? d.offsetHeight : closedHeight(d);
    const a = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: DUR, easing: EASE });
    d.style.overflow = 'hidden';
    a.onfinish = () => { if (!open) d.open = false; d.style.overflow = ''; };
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
