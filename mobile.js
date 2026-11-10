(() => {
  const root = document.getElementById('industrial-site-v2');
  const mobile = matchMedia('(max-width: 700px)');
  const nav = root.querySelector('.navrow');
  const tabs = [...nav.querySelectorAll('[data-go]')];
  const topbar = root.querySelector('.topbar');
  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'mobile-menu';
  menu.setAttribute('aria-label', 'Abrir menú');
  menu.setAttribute('aria-expanded', 'false');
  menu.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  topbar.querySelector('.topinner').prepend(menu);
  menu.onclick = () => {
    const open = topbar.classList.toggle('mobile-menu-open');
    menu.setAttribute('aria-expanded', String(open));
  };
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gallery-next';
  next.setAttribute('aria-label', 'Ver siguiente imagen del producto');
  next.textContent = '→';
  const thumbs = document.getElementById('v2-thumbs');
  next.onclick = () => {
    const buttons = [...thumbs.querySelectorAll('.thumb')];
    const selected = buttons.findIndex(button => button.classList.contains('selected'));
    buttons[(selected + 1) % buttons.length]?.click();
  };
  const dots = document.createElement('div');
  dots.className = 'feature-dots';
  dots.setAttribute('aria-label', 'Seleccionar característica');
  root.querySelector('.feature-body').append(dots);
  const pdf = document.getElementById('v2-download-pdf');
  const pdfPosition = document.createComment('Posición de descarga en escritorio');
  pdf.before(pdfPosition);
  const layout = root.querySelector('.parts-layout');
  const parts = document.getElementById('v2-parts-list');
  const tools = document.createElement('div');
  tools.className = 'mobile-drawing-tools';
  for (const [id, label, symbol] of [['in', 'Ampliar despiece', '⊕'], ['out', 'Reducir despiece', '⊖']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.textContent = symbol;
    button.onclick = () => document.getElementById('v2-zoom-' + id).click();
    tools.append(button);
  }
  layout.prepend(tools);
  const back = document.createElement('button');
  back.className = 'back-to-top';
  back.type = 'button';
  back.setAttribute('aria-label', 'Volver al inicio');
  back.onclick = () => window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  root.append(back);
  let activeTab;
  function followTab() {
    const current = nav.querySelector('[aria-current="location"]');
    back.hidden = !mobile.matches || window.scrollY < 300;
    if (!mobile.matches || !current || current === activeTab) return;
    activeTab = current;
    const target = current.offsetLeft - 30;
    nav.scrollTo({left: target, behavior: 'smooth'});
  }
  function refresh() {
    thumbs.append(next);
    next.hidden = thumbs.querySelectorAll('.thumb').length < 2;
    const countText = document.getElementById('v2-feature-count').textContent;
    const [current, total] = countText.split('/').map(Number);
    dots.replaceChildren(...Array.from({length: total || 0}, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Característica ' + (index + 1));
      button.setAttribute('aria-pressed', String(current === index + 1));
      button.onclick = () => root.dispatchEvent(new CustomEvent('feature-select', {detail: index}));
      return button;
    }));
    for (const [index, card] of [...parts.children].entries()) {
      const number = document.createElement('span');
      number.className = 'part-number';
      number.textContent = index;
      number.setAttribute('aria-hidden', 'true');
      card.querySelector('h3')?.prepend(number);
    }
    followTab();
  }
  function resize() {
    activeTab = null;
    if (mobile.matches) parts.before(pdf);
    else {
      pdfPosition.after(pdf);
      topbar.classList.remove('mobile-menu-open');
      menu.setAttribute('aria-expanded', 'false');
    }
    followTab();
  }
  root.addEventListener('product-rendered', refresh);
  let touchStart;
  const featureTrack = root.querySelector('.feature-track');
  featureTrack.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? {x: event.touches[0].clientX, y: event.touches[0].clientY} : null;
  }, {passive: true});
  featureTrack.addEventListener('touchend', event => {
    if (!mobile.matches || !touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      document.getElementById(dx < 0 ? 'v2-next-feature' : 'v2-prev-feature').click();
    }
  }, {passive: true});
  new MutationObserver(followTab).observe(nav, {subtree: true, attributes: true, attributeFilter: ['aria-current']});
  mobile.addEventListener('change', resize);
  window.addEventListener('scroll', followTab, {passive: true});
  resize();
  refresh();
})();
