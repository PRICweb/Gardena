(() => {
  const root = document.getElementById('industrial-site-v2');
  const byId = name => document.getElementById('v2-' + name);
  const key = 'pric-ficha-prototipo';
  const loading = document.getElementById('page-loading');
  async function revealPage() {
    const urls = new Set([...root.querySelectorAll('img')].map(image => image.getAttribute('src')).filter(Boolean));
    for (const url of data.images) if (url) urls.add(url);
    for (const node of root.querySelectorAll('.leaf, .service-photo, .related-photo, .account-icon')) {
      const background = getComputedStyle(node).backgroundImage;
      const match = background.match(/^url\(["']?(.*?)["']?\)$/);
      if (match) urls.add(match[1]);
    }
    await Promise.all([...urls].map(url => new Promise(resolve => {
      const image = new Image();
      const timeout = setTimeout(resolve, 20000);
      const done = () => { clearTimeout(timeout); resolve(); };
      image.onload = () => image.decode().catch(() => {}).then(done);
      image.onerror = done;
      image.src = url;
    })));
    root.removeAttribute('aria-busy');
    loading.hidden = true;
  }
  const seed = defaults();
  const initial = {
    ...seed, metric1: seed.stats[0][0], value1: seed.stats[0][1],
    metric2: seed.stats[1][0], value2: seed.stats[1][1],
    specs: seed.rows.map(([label, value]) => ({label, value})),
    features: [], accessories: [], parts: [], drawing: ''
  };
  let data = structuredClone(initial);
  try {
    data = {...data, ...JSON.parse(localStorage.getItem(key))};
  } catch (error) {
    console.warn('No se pudieron cargar los datos locales', error);
  }
  let photoIndex = 0;
  let featureIndex = 0;
  let readMore = false;
  let expanded = false;
  let zoom = 1;
  const fields = {
    specs: {label: 'Nombre', value: 'Valor'},
    features: {title: 'Título', subtitle: 'Subtítulo', image: 'Imagen'},
    accessories: {title: 'Nombre', code: 'Número de artículo', image: 'Imagen'},
    parts: {title: 'Nombre', code: 'Número de repuesto', image: 'Imagen'}
  };
  const el = (tag, content = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = content;
    node.className = className;
    return node;
  };
  const setText = (name, value) => { byId(name).textContent = value; };
  function setImage(node, url) {
    node.hidden = !url;
    if (url) node.src = url;
    else node.removeAttribute('src');
  }
  function render() {
    setText('crumbs', data.crumbs.split('>').map(value => value.trim()).join(' › '));
    setText('product-title', data.title);
    setText('product-code', data.code);
    setText('commercial', data.code);
    setText('spare-title', data.title);
    document.title = data.title || 'Ficha de producto';
    byId('metrics').replaceChildren(...[1, 2].map(index => {
      const row = el('div', '', 'metric');
      row.append(el('span', data['metric' + index]), el('strong', data['value' + index]));
      return row;
    }));
    setImage(byId('main-photo'), data.images[photoIndex]);
    setImage(byId('description-photo'), data.detail || data.images[0]);
    byId('thumbs').replaceChildren(...data.images.map((url, index) => {
      const button = el('button', '', index === photoIndex ? 'thumb selected' : 'thumb');
      const image = el('img');
      image.alt = 'Vista del producto ' + (index + 1);
      setImage(image, url);
      button.append(image);
      button.onclick = () => { photoIndex = index; render(); };
      return button;
    }));
    setText('description-title', data.descTitle);
    const long = data.desc.length > 350;
    setText('description', long && !readMore ? data.desc.slice(0, 350).trimEnd() + '…' : data.desc);
    byId('read-more').hidden = !long;
    setText('read-more', readMore ? 'Leer menos ﹀' : 'Leer más ﹀');
    byId('specrows').replaceChildren(...(expanded ? data.specs : data.specs.slice(0, 4)).map(item => {
      const row = el('div', '', 'specrow');
      row.append(el('span', item.label), el('strong', item.value));
      return row;
    }));
    byId('expand').hidden = data.specs.length <= 4;
    setText('expand', expanded ? 'Mostrar menos ﹀' : 'Expandir más ﹀');
    const count = data.features.length;
    featureIndex = count ? Math.min(featureIndex, count - 1) : 0;
    const feature = data.features[featureIndex];
    setText('feature-count', count ? (featureIndex + 1) + '/' + count : '0/0');
    setText('feature-title', feature?.title || '');
    setText('feature-subtitle', feature?.subtitle || '');
    setImage(byId('feature-current'), feature?.image);
    setImage(byId('feature-prev'), count > 1 && data.features[(featureIndex + count - 1) % count].image);
    setImage(byId('feature-next'), count > 1 && data.features[(featureIndex + 1) % count].image);
    byId('prev-feature').disabled = byId('next-feature').disabled = count < 2;
    renderCards('acc-list', data.accessories);
    renderCards('parts-list', data.parts);
    setImage(byId('drawing'), data.drawing);
    byId('download-pdf').disabled = !data.drawing;
    root.dispatchEvent(new Event('product-rendered'));
    requestAnimationFrame(updateNavigation);
  }
  function renderCards(name, items) {
    const list = byId(name);
    const left = list.scrollLeft;
    const top = list.scrollTop;
    list.replaceChildren(...items.map(item => {
      const card = el('article', '', 'p-card');
      const image = el('img');
      image.alt = item.title;
      setImage(image, item.image);
      card.append(image, el('h3', item.title), el('p', item.code));
      return card;
    }));
    list.scrollTo(left, top);
    byId('acc-arrows').hidden = byId('acc-list').scrollWidth <= byId('acc-list').clientWidth;
  }
  function save() {
    render();
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setText('local-status', 'Cambios guardados en este navegador.');
    } catch {
      setText('local-status', 'El navegador no pudo guardar los cambios. Probá con imágenes más pequeñas.');
    }
  }
  function upload(input, apply) {
    input.onchange = async () => {
      if (!input.files.length) return;
      input.disabled = true;
      setText('local-status', 'Optimizando imágenes…');
      try {
        const {optimizeImage} = await import('./image-upload.js');
        const urls = [];
        for (const file of input.files) urls.push(await optimizeImage(file));
        apply(urls);
        save();
      } catch (error) {
        setText('local-status', error.message || 'No se pudo leer la imagen seleccionada.');
      } finally {
        input.disabled = false;
        input.value = '';
      }
    };
  }
  const editor = byId('editor');
  const status = el('p', 'Guardado local de demostración.');
  status.id = 'v2-local-status';
  status.setAttribute('role', 'status');
  editor.querySelector('.editor-scroll').prepend(status);
  if (location.protocol === 'https:') {
    const publish = el('button', 'Publicar cambios', 'add');
    publish.disabled = true;
    status.after(publish);
    import('./cloud.js?v=storage').then(async cloud => {
      const published = await cloud.loadProduct();
      if (published) {
        data = {...structuredClone(initial), ...published};
        photoIndex = featureIndex = 0;
        if (editor.classList.contains('open')) editorFields();
        render();
      } else throw new Error('No se encontró la ficha publicada.');
      await revealPage();
      publish.disabled = false;
      publish.onclick = async () => {
        publish.disabled = true;
        try {
          data = await cloud.publishProduct(data);
          render();
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } catch (error) {
            console.warn('La ficha está publicada, pero no se pudo actualizar la copia local.', error);
          }
          setText('local-status', 'Ficha publicada.');
        } catch (error) {
          setText('local-status', error.message);
        } finally {
          publish.disabled = false;
        }
      };
    }).catch(() => {
      loading.querySelector('p').textContent = 'No se pudo cargar la ficha. Revisá la conexión y recargá la página.';
      loading.querySelector('button').hidden = false;
    });
  }
  loading.querySelector('button').onclick = () => location.reload();
  function editorFields() {
    for (const input of editor.querySelectorAll('[data-main]')) {
      const field = input.dataset.main;
      input.value = data[field];
      input.oninput = () => { data[field] = input.value; save(); };
    }
    for (const [group, schema] of Object.entries(fields)) {
      byId('edit-' + group).replaceChildren(...data[group].map((item, index) => {
        const card = el('div', '', 'editcard');
        for (const [field, label] of Object.entries(schema)) {
          const wrapper = el('label', label);
          const input = el('input');
          if (field === 'image') {
            input.type = 'file';
            input.accept = 'image/*';
            upload(input, ([url]) => { item.image = url; });
          } else {
            input.value = item[field];
            input.oninput = () => { item[field] = input.value; save(); };
          }
          wrapper.append(input);
          card.append(wrapper);
        }
        const remove = el('button', 'Quitar', 'remove');
        remove.onclick = () => { data[group].splice(index, 1); editorFields(); save(); };
        card.append(remove);
        return card;
      }));
    }
  }
  for (const button of editor.querySelectorAll('[data-add]')) {
    button.onclick = () => {
      const group = button.dataset.add;
      data[group].push(Object.fromEntries(Object.keys(fields[group]).map(field => [field, ''])));
      editorFields();
      save();
    };
  }
  function showEditor(open) {
    editor.classList.toggle('open', open);
    byId('overlay').classList.toggle('open', open);
    if (open) editorFields();
    byId(open ? 'editor-close' : 'admin-open').focus();
  }
  const login = byId('admin-login');
  const password = byId('admin-password');
  const loginForm = login.querySelector('form');
  const loginButton = loginForm.querySelector('[type="submit"]');
  const verifyButton = el('button', 'Enviar correo de verificación');
  verifyButton.type = 'submit';
  verifyButton.hidden = true;
  loginButton.after(verifyButton);
  byId('admin-open').onclick = () => {
    login.showModal();
    password.focus();
  };
  byId('login-cancel').onclick = () => login.close();
  login.addEventListener('close', () => {
    password.value = '';
    verifyButton.hidden = true;
    setText('admin-error', '');
  });
  loginForm.onsubmit = async event => {
    event.preventDefault();
    loginButton.disabled = true;
    verifyButton.disabled = true;
    setText('admin-error', 'Verificando contraseña…');
    try {
      const cloud = await import('./cloud.js?v=storage');
      const sendVerification = event.submitter === verifyButton;
      if (!await cloud.unlockAdmin(password.value, sendVerification)) {
        verifyButton.hidden = sendVerification;
        setText('admin-error', sendVerification
          ? 'Revisá el correo de PRIC, abrí el enlace de verificación y volvé a ingresar.'
          : 'El correo de PRIC todavía no está verificado.');
        return;
      }
      if (login.open) {
        login.close();
        showEditor(true);
      }
    } catch (error) {
      const rejected = ['auth/invalid-credential', 'auth/wrong-password'].includes(error.code);
      setText('admin-error', rejected ? 'Contraseña incorrecta.' : 'El acceso de administrador todavía no está disponible.');
    } finally {
      loginButton.disabled = false;
      verifyButton.disabled = false;
    }
  };
  byId('editor-close').onclick = byId('overlay').onclick = () => showEditor(false);
  upload(byId('gallery-upload'), urls => { data.images = urls; photoIndex = 0; });
  upload(byId('description-upload'), ([url]) => { data.detail = url; });
  upload(byId('drawing-upload'), ([url]) => { data.drawing = url; });
  byId('reset').onclick = () => {
    if (!confirm('¿Restablecer los datos de demostración?')) return;
    data = structuredClone(initial);
    photoIndex = featureIndex = 0;
    editorFields();
    save();
  };
  byId('read-more').onclick = () => { readMore = !readMore; render(); };
  byId('expand').onclick = () => { expanded = !expanded; render(); };
  const gallery = root.querySelector('.hero-photo');
  gallery.tabIndex = 0;
  gallery.setAttribute('aria-label', 'Galería del producto. Deslizá o usá las flechas para cambiar de imagen.');
  let galleryStart;
  function movePhoto(step) {
    if (data.images.length < 2) return;
    photoIndex = (photoIndex + step + data.images.length) % data.images.length;
    render();
  }
  gallery.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    galleryStart = {id: event.pointerId, x: event.clientX, y: event.clientY};
    gallery.setPointerCapture(event.pointerId);
  });
  gallery.addEventListener('pointerup', event => {
    if (!galleryStart || event.pointerId !== galleryStart.id) return;
    const dx = event.clientX - galleryStart.x;
    const dy = event.clientY - galleryStart.y;
    galleryStart = null;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) movePhoto(dx < 0 ? 1 : -1);
  });
  gallery.addEventListener('pointercancel', () => { galleryStart = null; });
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    movePhoto(event.key === 'ArrowRight' ? 1 : -1);
  });
  root.addEventListener('feature-select', event => {
    const index = event.detail;
    if (Number.isInteger(index) && index >= 0 && index < data.features.length) {
      featureIndex = index;
      render();
    }
  });
  for (const [name, step] of [['prev', -1], ['next', 1]]) {
    byId(name + '-feature').onclick = () => {
      const count = data.features.length;
      featureIndex = (featureIndex + count + step) % count;
      render();
    };
    byId('acc-' + name).onclick = () => byId('acc-list').scrollBy({left: step * 242, behavior: 'smooth'});
  }
  for (const [name, step] of [['in', 0.25], ['out', -0.25]]) {
    byId('zoom-' + name).onclick = () => {
      zoom = Math.max(1, Math.min(3, zoom + step));
      byId('drawing').style.transform = 'scale(' + zoom + ')';
    };
  }
  byId('download-pdf').onclick = () => {
    const link = el('a');
    link.href = data.drawing;
    link.download = 'despiece';
    link.click();
  };
  const nav = root.querySelector('.stickynav');
  const store = nav.querySelector('.nav-store');
  const tabs = Array.from(nav.querySelectorAll('[data-go]'));
  const sections = tabs.map(tab => document.getElementById(tab.dataset.go));
  function updateNavigation() {
    const stuck = nav.getBoundingClientRect().top <= 0;
    nav.classList.toggle('is-stuck', stuck);
    store.hidden = !stuck;
    let active = 0;
    for (const [index, section] of sections.entries()) {
      if (section.getBoundingClientRect().top <= nav.offsetHeight + 2) active = index;
    }
    tabs.forEach((tab, index) => {
      tab.classList.toggle('on', index === active);
      if (index === active) tab.setAttribute('aria-current', 'location');
      else tab.removeAttribute('aria-current');
    });
  }
  tabs.forEach((tab, index) => {
    tab.onclick = () => window.scrollTo({
      top: window.scrollY + sections[index].getBoundingClientRect().top - nav.offsetHeight,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  });
  window.addEventListener('scroll', updateNavigation, {passive: true});
  window.addEventListener('resize', () => {
    updateNavigation();
    byId('acc-arrows').hidden = byId('acc-list').scrollWidth <= byId('acc-list').clientWidth;
  });
  if (location.protocol !== 'https:') {
    render();
    revealPage();
  }
})();
