document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const chicFiltersContainer = document.getElementById('chic-filters');
  
  let currentCategory = typeof ACTIVE_FILTER !== 'undefined' ? ACTIVE_FILTER : 'all';
  let currentSubcategory = 'all';
  let currentSearch = '';
  
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.has('cat') && typeof ACTIVE_FILTER === 'undefined') {
    currentCategory = urlParams.get('cat');
  }

  function renderSubFilters(filteredItems) {
    if (!chicFiltersContainer) return;
    
    // If we are in 'all' category, or if there are no subcategories, maybe don't show subfilters
    // But let's show them based on what's available in the current Category.
    // First, find all items that match the currentCategory
    let categoryItems = R_Storage;
    if (currentCategory !== 'all') {
      categoryItems = categoryItems.filter(i => i.category === currentCategory);
    }
    
    // Extract unique subcategories
    const subcats = [...new Set(categoryItems.filter(i => i.subcategory).map(i => i.subcategory))];
    
    chicFiltersContainer.innerHTML = '';
    
    if (subcats.length > 0) {
      // Add 'Tout' pill
      const btnAll = document.createElement('button');
      btnAll.className = `filter-pill ${currentSubcategory === 'all' ? 'active' : ''}`;
      btnAll.textContent = 'Tout';
      btnAll.addEventListener('click', () => {
        currentSubcategory = 'all';
        applyFilters();
      });
      chicFiltersContainer.appendChild(btnAll);
      
      // Add a pill for each subcategory
      subcats.forEach(subcat => {
        const btn = document.createElement('button');
        btn.className = `filter-pill ${currentSubcategory === subcat ? 'active' : ''}`;
        btn.textContent = subcat;
        btn.addEventListener('click', () => {
          currentSubcategory = subcat;
          applyFilters();
        });
        chicFiltersContainer.appendChild(btn);
      });
      
      chicFiltersContainer.style.display = 'flex';
    } else {
      chicFiltersContainer.style.display = 'none';
    }
  }

  function applyFilters() {
    let filtered = R_Storage;
    
    // 1. Filter by Main Category
    if (currentCategory !== 'all') {
      filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    // 2. Render Sub-filters BEFORE filtering by subcategory (so pills don't disappear)
    renderSubFilters(filtered);
    
    // 3. Filter by Subcategory
    if (currentSubcategory !== 'all') {
      filtered = filtered.filter(item => item.subcategory === currentSubcategory);
    }
    
    // 4. Filter by Search Query
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(item => item.name.toLowerCase().includes(q));
    }
    
    // 5. Render Grid
    if(window.renderGrid) {
      window.renderGrid(filtered);
    }
    
    // Update active nav state in Sidebar
    document.querySelectorAll('.nav__item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.cat === currentCategory) {
        el.classList.add('active');
      }
    });

    // Update breadcrumb
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

  // Event listeners for Sidebar only
  document.querySelectorAll('.nav__item').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.cat;
      if (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('vault/')) {
        window.location.href = `../index.html?cat=${cat}`;
      } else {
        currentCategory = cat;
        currentSubcategory = 'all'; // Reset subcategory when changing main category
        const newUrl = cat === 'all' ? window.location.pathname : `?cat=${cat}`;
        window.history.pushState({}, '', newUrl);
        applyFilters();
      }
    });
  });

  // Initial render
  applyFilters();
});
