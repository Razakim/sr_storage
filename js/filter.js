document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  let currentCategory = typeof ACTIVE_FILTER !== 'undefined' ? ACTIVE_FILTER : 'all';
  let currentSearch = '';
  
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.has('cat') && typeof ACTIVE_FILTER === 'undefined') {
    currentCategory = urlParams.get('cat');
  }

  function applyFilters() {
    let filtered = R_Storage;
    
    if (currentCategory !== 'all') {
      filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(item => item.name.toLowerCase().includes(q));
    }
    
    if(window.renderGrid) {
      window.renderGrid(filtered);
    }
    
    document.querySelectorAll('.nav__item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.cat === currentCategory) {
        el.classList.add('active');
      }
    });

    const bc = document.getElementById('breadcrumb-current');
    if (bc) {
        const catMap = {
            'all': 'Tout',
            'videos': 'Vidéos',
            'certificates': 'Certificats',
            'images': 'Images',
            'documents': 'Documents'
        };
        bc.textContent = catMap[currentCategory] || 'Tout';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      applyFilters();
    });
  }

  document.querySelectorAll('.nav__item').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.cat;
      if (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('vault/')) {
        window.location.href = `index.html?cat=${cat}`;
      } else {
        currentCategory = cat;
        const newUrl = cat === 'all' ? window.location.pathname : `?cat=${cat}`;
        window.history.pushState({}, '', newUrl);
        applyFilters();
      }
    });
  });

  applyFilters();
});
