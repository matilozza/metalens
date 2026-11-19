(() => {
  'use strict';
  const sizes = [[320,568],[360,640],[375,667],[390,844],[402,874],[414,896],[430,932],[480,800],[568,320],[599,800],[600,800],[640,360],[667,375],[740,360],[768,1024],[820,1180],[844,390],[912,1368],[1023,768],[1024,600],[1024,768],[1180,820],[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080],[2560,1440],[767,1024],[599,517],[599,518],[600,607],[600,608],[320,480]];
  const groups = { mobile: 'Mobile', tablet: 'Tablet / compacto', desktop: 'Desktop', landscape: 'Horizontal', custom: 'Personalizadas' };
  const presets = sizes.map(([width, height]) => ({ id: `${width}x${height}`, width, height, group: width >= 1024 ? 'desktop' : width > height ? 'landscape' : width < 600 ? 'mobile' : 'tablet' }));
  const mainIds = ['390x844', '768x1024', '1440x900'];
  const sections = { hero: '.hero', intro: '#intro', person: '.person', product: '#product', migration: '#migration', pricing: '#pricing', faq: '#faq', demo: '#demo' };
  const $ = selector => document.querySelector(selector);
  const storageKey = 'metalens-responsive-tester-v1';
  const siteUrl = new URL('../', location.href).href;
  let state = { mode: 'compare', selected: mainIds, focus: '390x844', custom: { width: 390, height: 844 }, extras: [], section: 'hero', sync: true, zoom: 'fit' };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) state = { ...state, ...saved };
  } catch { /* El tester también funciona sin almacenamiento local. */ }
  const validSize = size => size && Number.isInteger(size.width) && Number.isInteger(size.height) && size.width >= 200 && size.width <= 3840 && size.height >= 200 && size.height <= 3840;
  state.extras = Array.isArray(state.extras) ? state.extras.filter(validSize).map(size => ({ ...size, id: `${size.width}x${size.height}`, group: 'custom' })) : [];
  state.custom = validSize(state.custom) ? state.custom : { width: 390, height: 844 };
  state.mode = state.mode === 'single' ? 'single' : 'compare';
  state.zoom = ['fit','0.5','0.75','1'].includes(state.zoom) ? state.zoom : 'fit';
  state.section = sections[state.section] ? state.section : 'hero';
  const allPresets = () => [...presets, ...state.extras.filter(extra => !presets.some(p => p.id === extra.id))];
  state.selected = Array.isArray(state.selected) ? [...new Set(state.selected)].filter(id => allPresets().some(p => p.id === id)) : mainIds;
  const focused = () => state.focus === 'custom' ? { id: 'custom', group: 'custom', ...state.custom } : allPresets().find(p => p.id === state.focus) || presets.find(p => p.id === '390x844');
  const records = new Map();
  let activeSource = null;
  let lastPosition = { key: state.section, ratio: 0 };
  let syncing = false;
  let scrollScheduled = false;

  function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }
  function announce(text) { $('#announcement').textContent = text; }
  function label(size) { return `${size.width} × ${size.height}`; }
  function renderPresets() {
    $('#preset-list').replaceChildren();
    const options = [];
    for (const [group, name] of Object.entries(groups)) {
      const items = allPresets().filter(p => p.group === group);
      if (!items.length) continue;
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'preset-group';
      const legend = document.createElement('legend');
      legend.textContent = name;
      fieldset.append(legend);
      const optionGroup = document.createElement('optgroup');
      optionGroup.label = name;
      for (const preset of items) {
        const choice = document.createElement('label');
        choice.className = 'preset-option';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.value = preset.id; input.checked = state.selected.includes(preset.id);
        input.addEventListener('change', () => {
          state.selected = input.checked ? [...state.selected, preset.id] : state.selected.filter(id => id !== preset.id);
          state.mode = 'compare'; render();
        });
        const text = document.createElement('span'); text.textContent = label(preset);
        choice.append(input, text); fieldset.append(choice);
        const option = new Option(label(preset), preset.id); optionGroup.append(option);
      }
      $('#preset-list').append(fieldset); options.push(optionGroup);
    }
    $('#device-select').replaceChildren(...options, new Option('Medida personalizada', 'custom'));
  }

  function positionOf(record) {
    const win = record.frame.contentWindow;
    let key = 'hero', node = null;
    for (const [name, selector] of Object.entries(sections)) {
      const element = win.document.querySelector(selector);
      if (element && element.getBoundingClientRect().top <= 2) { key = name; node = element; }
    }
    node ||= win.document.querySelector(sections[key]);
    if (!node) return lastPosition;
    const top = node.getBoundingClientRect().top;
    return { key, ratio: Math.max(0, Math.min(1, -top / Math.max(1, node.offsetHeight))) };
  }

  function moveTo(record, position) {
    if (!record.ready) return;
    const win = record.frame.contentWindow;
    const node = win.document.querySelector(sections[position.key]);
    if (!node) return;
    win.dispatchEvent(new win.Event('wheel'));
    const top = node.getBoundingClientRect().top + win.scrollY + position.ratio * node.offsetHeight;
    win.scrollTo({ top, behavior: 'instant' });
  }

  function navigateAll(key) {
    lastPosition = { key, ratio: 0 }; state.section = key; activeSource = null;
    syncing = true;
    records.forEach(record => moveTo(record, lastPosition));
    requestAnimationFrame(() => { syncing = false; });
    save();
  }

  function synchronize(record) {
    if (!state.sync || syncing || activeSource !== record.key || scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      if (!records.has(record.key) || !record.ready) return;
      lastPosition = positionOf(record);
      state.section = lastPosition.key;
      $('#section-select').value = state.section;
      records.forEach(other => { if (other.key !== record.key) moveTo(other, lastPosition); });
    });
  }

  function fit(record) {
    const available = Math.max(160, record.stage.clientWidth - 32);
    const maxHeight = state.mode === 'single' ? Math.max(360, innerHeight - 310) : 540;
    const scale = state.mode === 'single' && state.zoom !== 'fit' ? Number(state.zoom) : Math.min(1, available / record.size.width, maxHeight / record.size.height);
    const displayedWidth = record.size.width * scale, displayedHeight = record.size.height * scale;
    record.canvas.style.width = `${displayedWidth}px`;
    record.canvas.style.height = `${displayedHeight}px`;
    record.stage.style.maxHeight = `${maxHeight + 32}px`;
    record.frame.style.transform = `scale(${scale})`;
    record.scale.textContent = `Escala ${Math.round(scale * 100)}%`;
  }

  const observer = new ResizeObserver(entries => entries.forEach(entry => {
    const record = records.get(entry.target.dataset.key);
    if (record) fit(record);
  }));

  function createPreview(size, key) {
    const card = document.createElement('article'); card.className = 'screen-card'; card.dataset.preset = size.id;
    card.innerHTML = '<header class="screen-header"><div><span class="screen-category"></span><h2></h2></div><div class="screen-actions"></div></header><div class="viewport-stage"><div class="viewport-canvas"></div></div><footer class="screen-footer"><span class="scale-label"></span><span class="frame-status">Cargando…</span></footer>';
    card.querySelector('.screen-category').textContent = groups[size.group];
    card.querySelector('h2').textContent = label(size);
    const actions = card.querySelector('.screen-actions');
    if (state.mode === 'compare') {
      const expand = document.createElement('button'); expand.type = 'button'; expand.textContent = 'Ampliar'; expand.setAttribute('aria-label', `Ampliar ${label(size)}`);
      expand.addEventListener('click', () => { state.focus = size.id; state.mode = 'single'; render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-view'; remove.textContent = '×'; remove.setAttribute('aria-label', `Quitar ${label(size)}`);
      remove.addEventListener('click', () => { state.selected = state.selected.filter(id => id !== size.id); render(); });
      actions.append(expand, remove);
    }
    const stage = card.querySelector('.viewport-stage'); stage.dataset.key = key;
    const canvas = card.querySelector('.viewport-canvas');
    const frame = document.createElement('iframe');
    frame.title = `Metalens en ${label(size)} píxeles`; frame.dataset.resolution = `${size.width}x${size.height}`;
    frame.width = size.width; frame.height = size.height;
    frame.style.width = `${size.width}px`; frame.style.height = `${size.height}px`;
    frame.loading = 'lazy';
    const record = { key, size, card, stage, canvas, frame, scale: card.querySelector('.scale-label'), status: card.querySelector('.frame-status'), ready: false };
    frame.addEventListener('load', () => {
      record.ready = false;
      try {
        const win = frame.contentWindow, doc = win.document;
        if (!doc.querySelector('.hero')) throw new Error('Página fuera del sitio');
        record.ready = true;
        record.status.textContent = 'En vivo'; record.status.classList.add('is-ready');
        const activate = () => { activeSource = record.key; };
        ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => doc.addEventListener(event, activate, { passive: true, capture: true }));
        win.addEventListener('scroll', () => synchronize(record), { passive: true });
        doc.addEventListener('click', event => {
          const link = event.target.closest('a[href]');
          if (!link) return;
          const url = new URL(link.href);
          if (url.origin !== location.origin) { event.preventDefault(); window.open(url.href, '_blank', 'noopener'); }
        });
        moveTo(record, lastPosition);
        doc.fonts.ready.then(() => { if (records.get(key) === record && activeSource !== key) moveTo(record, lastPosition); });
      } catch {
        record.status.textContent = 'Recargá para volver al sitio'; record.status.classList.remove('is-ready');
      }
    });
    canvas.append(frame); frame.src = siteUrl;
    records.set(key, record); observer.observe(stage);
    return record;
  }

  function render() {
    $('#compare-mode').setAttribute('aria-pressed', String(state.mode === 'compare'));
    $('#single-mode').setAttribute('aria-pressed', String(state.mode === 'single'));
    $('#size-controls').hidden = state.mode !== 'single';
    $('#sync-scroll').checked = state.sync;
    $('#sync-scroll').disabled = state.mode === 'single';
    $('#section-select').value = state.section;
    $('#zoom-select').value = state.zoom;
    $('#selection-count').textContent = state.selected.length;
    for (const checkbox of $('#preset-list').querySelectorAll('input')) checkbox.checked = state.selected.includes(checkbox.value);
    const current = focused();
    $('#device-select').value = state.focus === 'custom' ? 'custom' : current.id;
    $('#custom-width').value = current.width; $('#custom-height').value = current.height;
    const visible = state.mode === 'single' ? [current] : allPresets().filter(p => state.selected.includes(p.id));
    const keys = new Set(visible.map(size => `${state.mode}-${size.id}-${size.width}x${size.height}`));
    for (const [key, record] of records) {
      if (!keys.has(key)) { observer.unobserve(record.stage); record.card.remove(); records.delete(key); }
    }
    const grid = $('#preview-grid'); grid.classList.toggle('is-single', state.mode === 'single');
    for (const size of visible) {
      const key = `${state.mode}-${size.id}-${size.width}x${size.height}`;
      const record = records.get(key) || createPreview(size, key);
      if (!record.card.isConnected) grid.append(record.card);
      fit(record);
    }
    $('#empty-state').hidden = visible.length > 0;
    $('#view-description').textContent = state.mode === 'single' ? `Vista individual · ${label(current)} px` : `${visible.length} ${visible.length === 1 ? 'vista en comparación' : 'vistas en comparación'}`;
    $('#scale-help').textContent = state.mode === 'single' ? 'Usá 100% para inspeccionar el tamaño real.' : 'Ampliá una para verla en detalle.';
    save();
  }

  document.querySelectorAll('[data-set]').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.set;
    state.selected = type === 'main' ? [...mainIds] : presets.filter(p => type === 'all' || (type === 'breakpoints' ? [599,600,767,768,1023,1024].includes(p.width) : p.group === type)).map(p => p.id);
    state.mode = 'compare'; render(); announce(`${state.selected.length} resoluciones seleccionadas`);
  }));
  $('#compare-mode').addEventListener('click', () => { state.mode = 'compare'; render(); });
  $('#single-mode').addEventListener('click', () => { state.mode = 'single'; render(); });
  $('#device-select').addEventListener('change', event => { state.focus = event.target.value; render(); });
  $('#section-select').addEventListener('change', event => navigateAll(event.target.value));
  $('#sync-scroll').addEventListener('change', event => { state.sync = event.target.checked; if (state.sync) navigateAll(state.section); save(); });
  $('#zoom-select').addEventListener('change', event => { state.zoom = event.target.value; records.forEach(fit); save(); });
  $('#size-controls').addEventListener('submit', event => {
    event.preventDefault();
    const size = { width: Number($('#custom-width').value), height: Number($('#custom-height').value) };
    if (!validSize(size)) return;
    state.custom = size;
    state.focus = 'custom'; render(); announce(`Vista personalizada de ${label(state.custom)} píxeles`);
  });
  $('#rotate-size').addEventListener('click', () => {
    const size = focused();
    const rotated = { width: size.height, height: size.width };
    if (!validSize(rotated)) { announce('El ancho y el alto deben estar entre 200 y 3840 píxeles.'); return; }
    state.custom = rotated;
    state.focus = 'custom'; render();
  });
  $('#add-comparison').addEventListener('click', () => {
    const size = focused(), id = `${size.width}x${size.height}`;
    if (!allPresets().some(p => p.id === id)) state.extras.push({ ...size, id, group: 'custom' });
    if (!state.selected.includes(id)) state.selected.push(id);
    state.mode = 'compare'; renderPresets(); render();
  });
  $('#reload-previews').addEventListener('click', () => {
    activeSource = null;
    lastPosition = { key: state.section, ratio: 0 };
    records.forEach(record => {
      record.ready = false; record.status.textContent = 'Cargando…'; record.status.classList.remove('is-ready');
      record.frame.src = siteUrl;
    });
    announce('Vistas recargadas con los últimos cambios locales');
  });
  window.addEventListener('resize', () => records.forEach(fit));
  if (matchMedia('(max-width: 900px)').matches) $('#presets-panel').open = false;
  renderPresets(); render();
})();
