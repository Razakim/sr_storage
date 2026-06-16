pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function getAssetPath(path) {
  return window.R_Storage_BASE_PATH ? window.R_Storage_BASE_PATH + path : path;
}

async function renderCardPreview(item, previewContainer) {
  const assetPath = getAssetPath(item.path);
  if (item.type === 'pdf') {
    try {
      const loadingTask = pdfjsLib.getDocument(assetPath);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const scale = 1; 
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.className = 'card__preview_canvas';
      
      const desiredWidth = 350;
      const actualScale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: actualScale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      await page.render(renderContext).promise;
      previewContainer.innerHTML = '';
      previewContainer.appendChild(canvas);
    } catch (e) {
      console.error('Error rendering PDF:', e);
      // Fallback si l'erreur de PDF JS survient (CORS ou autre)
      previewContainer.innerHTML = `<div class="card__icon">📄</div>`;
    }
  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.type)) {
    previewContainer.innerHTML = `<img src="${assetPath}" class="card__preview" alt="preview" />`;
  } else if (item.type === 'mp4') {
    previewContainer.innerHTML = `<video src="${assetPath}#t=1" class="card__preview" preload="metadata"></video>`;
  } else {
    previewContainer.innerHTML = `<div class="card__icon">📄</div>`;
  }
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = item.id;
  card.dataset.category = item.category;
  
  const previewDiv = document.createElement('div');
  previewDiv.className = 'card__preview-container';
  
  const overlay = document.createElement('div');
  overlay.className = 'card__overlay';
  
  const name = document.createElement('div');
  name.className = 'card__name';
  name.textContent = item.name;
  
  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.innerHTML = `<span>${item.type.toUpperCase()} · ${item.size}</span><span>${item.date}</span>`;
  
  const assetPath = getAssetPath(item.path);
  const actions = document.createElement('div');
  actions.className = 'card__actions';
  actions.innerHTML = `<button onclick="event.stopPropagation(); window.openPreview('${item.id}')">Ouvrir</button><a href="${assetPath}" download style="flex:1"><button style="width:100%">Télécharger</button></a>`;
  
  overlay.appendChild(name);
  overlay.appendChild(meta);
  overlay.appendChild(actions);
  
  card.appendChild(previewDiv);
  card.appendChild(overlay);
  
  renderCardPreview(item, previewDiv);
  
  card.addEventListener('click', () => {
    if(window.openPreview) window.openPreview(item.id);
  });
  
  return card;
}

window.renderGrid = function(items) {
  const grid = document.getElementById('grid');
  if(!grid) return;
  grid.innerHTML = '';
  
  const span = document.getElementById('file-count');
  if(span) span.textContent = `${items.length} fichier${items.length > 1 ? 's' : ''}`;
  
  items.forEach(item => {
    grid.appendChild(createCard(item));
  });
};
