function getAssetPath(path) {
  return window.R_Storage_BASE_PATH ? window.R_Storage_BASE_PATH + path : path;
}

window.openPreview = function (id) {
  const item = R_Storage.find(i => i.id === id);
  if (!item) return;

  const modal = document.getElementById('preview-modal');
  const viewer = document.getElementById('preview-viewer');
  const assetPath = getAssetPath(item.path);

  document.getElementById('preview-title').textContent = item.name;
  document.getElementById('preview-type').textContent = item.type.toUpperCase();
  document.getElementById('preview-size').textContent = item.size;
  document.getElementById('preview-date').textContent = item.date;

  const dlBtn = document.getElementById('preview-download');
  dlBtn.href = assetPath;
  dlBtn.download = item.name;

  viewer.innerHTML = '';
  if (item.type === 'pdf') {
    viewer.innerHTML = `<iframe src="${assetPath}#view=FitH" width="100%" height="100%" frameborder="0"></iframe>`;
  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.type)) {
    viewer.innerHTML = `<img src="${assetPath}" alt="${item.name}" />`;
  } else if (item.type === 'mp4') {
    viewer.innerHTML = `<video src="${assetPath}" controls autoplay></video>`;
  } else {
    viewer.innerHTML = `<div style="color:var(--text); font-family:var(--font-mono)">Preview not available</div>`;
  }

  modal.classList.add('active');
};

window.closePreview = function () {
  const modal = document.getElementById('preview-modal');
  modal.classList.remove('active');
  document.getElementById('preview-viewer').innerHTML = '';
};
