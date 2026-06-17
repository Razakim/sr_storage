const Preview = {
  currentItem: null,

  open(item) {
    this.currentItem = item;
    const sheet = document.getElementById('preview-sheet');
    const viewer = document.getElementById('preview-viewer');
    const path = item.path;

    document.getElementById('preview-title').textContent = item.name;
    document.getElementById('preview-meta').textContent = `${item.type.toUpperCase()} · ${item.size}`;
    document.getElementById('detail-type').textContent = item.type.toUpperCase();
    document.getElementById('detail-size').textContent = item.size;
    document.getElementById('detail-date').textContent = item.date || '—';
    document.getElementById('detail-cat').textContent = item.subcategory || item.category || '—';

    const dl = document.getElementById('preview-download');
    dl.href = path;
    dl.download = item.name;

    viewer.innerHTML = '<div class="spinner"></div>';

    if (item.type === 'pdf') {
      viewer.innerHTML = `<iframe src="${path}#view=FitH" title="${item.name}"></iframe>`;
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.type)) {
      viewer.innerHTML = `<img src="${path}" alt="${item.name}" />`;
    } else if (item.type === 'mp4') {
      viewer.innerHTML = `<video src="${path}" controls playsinline></video>`;
    } else {
      viewer.innerHTML = '<div style="color:var(--muted);padding:24px;text-align:center">Aperçu non disponible</div>';
    }

    sheet.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('preview-sheet').classList.remove('active');
    document.getElementById('preview-viewer').innerHTML = '';
    document.body.style.overflow = '';
    this.currentItem = null;
  },

  openFullscreen() {
    if (!this.currentItem) return;
    const item = this.currentItem;
    const fs = document.getElementById('fullscreen-preview');
    const body = document.getElementById('fullscreen-body');
    const path = item.path;

    document.getElementById('fullscreen-title').textContent = item.name;

    if (item.type === 'pdf') {
      body.innerHTML = `<iframe src="${path}#view=FitH" title="${item.name}"></iframe>`;
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.type)) {
      body.innerHTML = `<img src="${path}" alt="${item.name}" />`;
    } else if (item.type === 'mp4') {
      body.innerHTML = `<video src="${path}" controls autoplay playsinline></video>`;
    }

    fs.classList.add('active');
  },

  closeFullscreen() {
    document.getElementById('fullscreen-preview').classList.remove('active');
    document.getElementById('fullscreen-body').innerHTML = '';
  }
};

window.Preview = Preview;
