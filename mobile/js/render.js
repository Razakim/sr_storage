const Render = {
  pdfQueue: new Set(),
  observer: null,

  initLazyObserver() {
    if (this.observer) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const id = el.dataset.lazyId;
          if (id && el.dataset.lazyLoaded !== '1') {
            el.dataset.lazyLoaded = '1';
            const item = App.state.items.find(i => i.id === id);
            if (item) this.loadPreview(item, el.querySelector('.file-card__preview, .file-row__thumb, .recent-card__preview'));
          }
          this.observer.unobserve(el);
        }
      });
    }, { rootMargin: '100px', threshold: 0.01 });
  },

  async loadPreview(item, container) {
    if (!container) return;
    const path = item.path;

    if (item.type === 'pdf' && typeof pdfjsLib !== 'undefined') {
      try {
        const pdf = await pdfjsLib.getDocument(path).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = (container.clientWidth || 200) / viewport.width;
        const scaled = page.getViewport({ scale: Math.max(scale, 0.5) });
        const canvas = document.createElement('canvas');
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise;
        container.innerHTML = '';
        container.appendChild(canvas);
      } catch {
        container.innerHTML = '<span class="file-card__icon">📄</span>';
      }
      return;
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.type)) {
      container.innerHTML = `<img src="${path}" alt="" loading="lazy" />`;
      return;
    }

    if (item.type === 'mp4') {
      container.innerHTML = `<video src="${path}#t=0.5" preload="metadata" muted playsinline></video>`;
      return;
    }

    container.innerHTML = '<span class="file-card__icon">📄</span>';
  },

  fileCard(item) {
    const el = document.createElement('article');
    el.className = 'file-card animate-in';
    el.dataset.lazyId = item.id;
    el.innerHTML = `
      <div class="file-card__preview">
        <div class="skeleton" style="width:100%;height:100%;position:absolute;inset:0"></div>
        <span class="file-card__type-badge">${item.type}</span>
      </div>
      <div class="file-card__body">
        <div class="file-card__name">${this.escape(item.name)}</div>
        <div class="file-card__meta">
          <span>${item.size}</span>
          <span>${item.date || ''}</span>
        </div>
      </div>`;
    el.addEventListener('click', () => Preview.open(item));
    this.observer.observe(el);
    return el;
  },

  fileRow(item) {
    const el = document.createElement('article');
    el.className = 'file-row animate-in';
    el.dataset.lazyId = item.id;
    el.innerHTML = `
      <div class="file-row__thumb"><div class="skeleton" style="width:100%;height:100%"></div></div>
      <div class="file-row__info">
        <div class="file-row__name">${this.escape(item.name)}</div>
        <div class="file-row__meta">${item.type.toUpperCase()} · ${item.size}</div>
      </div>`;
    el.addEventListener('click', () => Preview.open(item));
    this.observer.observe(el);
    return el;
  },

  recentCard(item) {
    const el = document.createElement('article');
    el.className = 'recent-card';
    el.dataset.lazyId = item.id;
    el.innerHTML = `
      <div class="recent-card__preview"><div class="skeleton" style="width:100%;height:100%"></div></div>
      <div class="recent-card__body">
        <div class="recent-card__name">${this.escape(item.name)}</div>
      </div>`;
    el.addEventListener('click', () => Preview.open(item));
    this.observer.observe(el);
    return el;
  },

  renderGrid(container, items) {
    if (!container) return;
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'file-grid';
    items.forEach(item => grid.appendChild(this.fileCard(item)));
    container.appendChild(grid);
  },

  renderList(container, items) {
    if (!container) return;
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'file-list';
    items.forEach(item => list.appendChild(this.fileRow(item)));
    container.appendChild(list);
  },

  renderChips(container, categories, activeId, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (cat.id === activeId || cat.slug === activeId ? ' active' : '') + (cat.system === false ? ' chip--custom' : '');
      btn.textContent = cat.system === false ? `${cat.icon || ''} ${cat.name}`.trim() : cat.name;
      btn.addEventListener('click', () => onSelect(cat));
      container.appendChild(btn);
    });
  },

  renderSubchips(container, items, activeSub, onSelect) {
    if (!container) return;
    const subcats = [...new Set(items.filter(i => i.subcategory).map(i => i.subcategory))];
    container.innerHTML = '';
    if (subcats.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    const all = document.createElement('button');
    all.className = 'subchip' + (activeSub === 'all' ? ' active' : '');
    all.textContent = 'Tout';
    all.addEventListener('click', () => onSelect('all'));
    container.appendChild(all);

    subcats.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subchip' + (activeSub === sub ? ' active' : '');
      btn.textContent = sub;
      btn.addEventListener('click', () => onSelect(sub));
      container.appendChild(btn);
    });
  },

  escape(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

window.Render = Render;
