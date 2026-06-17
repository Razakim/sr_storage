const App = {
  state: {
    user: null,
    items: [],
    categories: [],
    filter: { category: 'all', subcategory: 'all', search: '' },
    viewMode: 'grid'
  },

  deferredInstall: null,

  async init() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    Render.initLazyObserver();
    this.bindGlobalEvents();
    this.bindAuthForms();
    this.bindAddForm();
    this.bindNav();
    this.bindPreview();
    this.bindInstallPrompt();

    Router.onChange((screen) => this.showScreen(screen));

    const user = await Auth.getCurrentUser();
    this.state.user = user;

    await this.refreshCatalog();
    this.updateNavAuth();

    const startScreen = user ? 'home' : (localStorage.getItem('r_storage_guest') ? 'home' : 'welcome');
    if (!location.hash || location.hash === '#welcome') {
      Router.navigate(startScreen, true);
    } else {
      Router.resolve();
    }

    this.registerSW();
  },

  updateNavAuth() {
    const logged = !!this.state.user;
    ['nav-add', 'nav-profile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('bottom-nav__item--locked', !logged);
    });
  },

  async refreshCatalog() {
    const userId = this.state.user?.id;
    this.state.items = await Catalog.getAllItems(userId);
    this.state.categories = await Catalog.getCategories(userId);
  },

  getFilteredItems() {
    const cat = this.state.filter.category;
    const isCustom = cat.startsWith('custom-') || this.state.categories.find(c => c.id === cat && !c.system);
    const filterCat = isCustom ? null : cat;
    const customId = isCustom ? cat : null;

    return Catalog.filterItems(this.state.items, {
      category: filterCat,
      subcategory: this.state.filter.subcategory,
      search: this.state.filter.search,
      customCategoryId: customId
    });
  },

  showScreen(screen) {
    const authScreens = ['welcome', 'register', 'login'];
    const protectedScreens = ['add', 'categories'];
    const navScreens = ['home', 'browse', 'search', 'add', 'profile'];

    if (protectedScreens.includes(screen) && !this.state.user) {
      Router.navigate('login', true);
      return;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');

    const header = document.getElementById('app-header');
    const nav = document.getElementById('bottom-nav');
    const main = document.getElementById('app-main');
    const isAuth = authScreens.includes(screen);

    header.classList.toggle('hidden', isAuth && screen === 'welcome');
    nav.classList.toggle('hidden', isAuth);
    main.classList.toggle('app-main--with-nav', !isAuth);
    main.classList.toggle('app-main--auth', isAuth);

    document.getElementById('header-back').classList.toggle('hidden', isAuth || screen === 'home' || screen === 'welcome');
    document.getElementById('header-title').textContent = Router.titles[screen] || 'R_Storage';

    if (!isAuth) {
      nav.querySelectorAll('.bottom-nav__item').forEach(item => {
        item.classList.toggle('active', item.dataset.screen === screen);
      });
    }

    this.renderScreen(screen);
  },

  renderScreen(screen) {
    switch (screen) {
      case 'home': this.renderHome(); break;
      case 'browse': this.renderBrowse(); break;
      case 'search': this.renderSearch(); break;
      case 'add': this.renderAdd(); break;
      case 'profile': this.renderProfile(); break;
      case 'categories': this.renderCategories(); break;
    }
  },

  renderHome() {
    const items = this.state.items;
    const stats = Catalog.getStats(items);
    const recent = [...items].reverse().slice(0, 8);

    const greeting = document.getElementById('home-greeting');
    if (this.state.user) {
      greeting.innerHTML = `<div class="home-greeting__hello">Bonjour</div><div class="home-greeting__name">${Render.escape(this.state.user.name)}</div>`;
    } else {
      greeting.innerHTML = `<div class="home-greeting__hello">Bienvenue sur</div><div class="home-greeting__name">R_Storage</div>`;
    }

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-certs').textContent = stats.certificates;
    document.getElementById('stat-videos').textContent = stats.videos;

    const recentEl = document.getElementById('home-recent');
    recentEl.innerHTML = '';
    if (recent.length === 0) {
      recentEl.innerHTML = '<div class="empty-state" style="padding:24px"><p class="empty-state__text">Aucun fichier pour le moment</p></div>';
    } else {
      recent.forEach(item => recentEl.appendChild(Render.recentCard(item)));
    }

    Render.renderChips(document.getElementById('home-chips'), this.state.categories, 'all', (cat) => {
      this.state.filter.category = cat.system ? cat.slug : cat.id;
      this.state.filter.subcategory = 'all';
      Router.navigate('browse', true);
      this.renderBrowse();
    });
  },

  renderBrowse() {
    const filtered = this.getFilteredItems();
    const catItems = this.state.filter.category === 'all'
      ? this.state.items
      : this.state.items.filter(i => {
          const cat = this.state.filter.category;
          return i.category === cat || i.category === cat.replace('custom-', '') || i.customCategory === cat;
        });

    Render.renderChips(document.getElementById('browse-chips'), this.state.categories, this.state.filter.category, (cat) => {
      this.state.filter.category = cat.system ? cat.slug : cat.id;
      this.state.filter.subcategory = 'all';
      this.renderBrowse();
    });

    Render.renderSubchips(document.getElementById('browse-subchips'), catItems, this.state.filter.subcategory, (sub) => {
      this.state.filter.subcategory = sub;
      this.renderBrowse();
    });

    const container = document.getElementById('browse-results');
    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📂</div><div class="empty-state__title">Aucun résultat</div><div class="empty-state__text">Essayez un autre filtre ou ajoutez des fichiers.</div></div>`;
      return;
    }

    if (this.state.viewMode === 'list') {
      Render.renderList(container, filtered);
    } else {
      Render.renderGrid(container, filtered);
    }

    document.getElementById('browse-count').textContent = filtered.length + ' fichier' + (filtered.length > 1 ? 's' : '');
  },

  renderSearch() {
    const input = document.getElementById('search-input');
    if (document.activeElement !== input) {
      input.value = this.state.filter.search;
    }

    const filtered = Catalog.filterItems(this.state.items, { search: this.state.filter.search, category: 'all' });
    const container = document.getElementById('search-results');

    if (!this.state.filter.search) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><div class="empty-state__title">Rechercher</div><div class="empty-state__text">Tapez un nom de fichier, certificat ou catégorie.</div></div>`;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__title">Aucun résultat</div><div class="empty-state__text">Aucun fichier ne correspond à « ${Render.escape(this.state.filter.search)} »</div></div>`;
      return;
    }

    Render.renderList(container, filtered);
  },

  renderAdd() {
    const select = document.getElementById('add-category');
    select.innerHTML = '';
    this.state.categories.filter(c => c.slug !== 'all').forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.system ? cat.slug : cat.id;
      opt.textContent = cat.system ? cat.name : `${cat.icon || ''} ${cat.name}`.trim();
      select.appendChild(opt);
    });
  },

  renderProfile() {
    const user = this.state.user;
    if (!user) return;

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();

    const installBanner = document.getElementById('install-banner');
    installBanner.classList.toggle('hidden', !this.deferredInstall);
  },

  async renderCategories() {
    const user = this.state.user;
    if (!user) return;

    const custom = this.state.categories.filter(c => !c.system);
    const container = document.getElementById('categories-list');
    container.innerHTML = '';

    if (custom.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-state__text">Créez votre première catégorie depuis l'onglet Ajouter.</div></div>`;
      return;
    }

    custom.forEach(cat => {
      const count = this.state.items.filter(i => i.category === cat.id || i.customCategory === cat.id).length;
      const row = document.createElement('div');
      row.className = 'category-list__item';
      row.innerHTML = `
        <span class="category-list__dot" style="background:${cat.color}"></span>
        <span class="category-list__name">${cat.icon || ''} ${Render.escape(cat.name)}</span>
        <span class="category-list__count">${count}</span>
        <button class="category-list__delete" data-id="${cat.id}">Suppr.</button>`;
      row.querySelector('.category-list__delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Supprimer cette catégorie ?')) {
          await Catalog.deleteCategory(user.id, cat.id);
          await this.refreshCatalog();
          this.renderCategories();
          this.toast('Catégorie supprimée', 'success');
        }
      });
      container.appendChild(row);
    });
  },

  bindGlobalEvents() {
    document.getElementById('header-back').addEventListener('click', () => Router.back());

    document.getElementById('browse-view-grid').addEventListener('click', () => {
      this.state.viewMode = 'grid';
      document.getElementById('browse-view-grid').classList.add('active');
      document.getElementById('browse-view-list').classList.remove('active');
      this.renderBrowse();
    });
    document.getElementById('browse-view-list').addEventListener('click', () => {
      this.state.viewMode = 'list';
      document.getElementById('browse-view-list').classList.add('active');
      document.getElementById('browse-view-grid').classList.remove('active');
      this.renderBrowse();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      this.state.filter.search = e.target.value;
      this.renderSearch();
    });

    document.getElementById('btn-desktop').addEventListener('click', () => {
      sessionStorage.setItem('r_storage_prefer_desktop', '1');
      window.location.href = '/?desktop=1';
    });
  },

  bindAuthForms() {
    document.getElementById('btn-go-register').addEventListener('click', () => Router.navigate('register', true));
    document.getElementById('btn-go-login').addEventListener('click', () => Router.navigate('login', true));
    document.getElementById('btn-guest').addEventListener('click', () => {
      localStorage.setItem('r_storage_guest', '1');
      Router.navigate('home', true);
    });
    document.getElementById('btn-switch-login').addEventListener('click', () => Router.navigate('login', true));
    document.getElementById('btn-switch-register').addEventListener('click', () => Router.navigate('register', true));

    document.getElementById('form-register').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('register-error');
      err.classList.remove('show');
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-confirm').value;

      if (password !== confirm) {
        err.textContent = 'Les mots de passe ne correspondent pas';
        err.classList.add('show');
        return;
      }

      try {
        this.state.user = await Auth.register({ name, email, password });
        await this.refreshCatalog();
        this.updateNavAuth();
        this.toast('Compte créé avec succès', 'success');
        Router.navigate('home', true);
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.add('show');
      }
    });

    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('login-error');
      err.classList.remove('show');
      try {
        this.state.user = await Auth.login({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        });
        await this.refreshCatalog();
        this.updateNavAuth();
        this.toast('Connexion réussie', 'success');
        Router.navigate('home', true);
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.add('show');
      }
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await Auth.logout();
      this.state.user = null;
      this.updateNavAuth();
      localStorage.removeItem('r_storage_guest');
      Router.navigate('welcome', true);
      this.toast('Déconnecté');
    });
  },

  bindAddForm() {
    let selectedFile = null;
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');
    const preview = document.getElementById('upload-preview');

    document.getElementById('btn-pick-file').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      if (input.files[0]) this.setUploadFile(input.files[0]);
    });

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.setUploadFile(e.dataTransfer.files[0]);
    });

    this.setUploadFile = (file) => {
      selectedFile = file;
      preview.classList.add('show');
      document.getElementById('upload-filename').textContent = file.name;
      document.getElementById('upload-filesize').textContent = Catalog.formatSize(file.size);
      const icons = { pdf: '📄', mp4: '🎬', jpg: '🖼️', png: '🖼️' };
      const ext = Catalog.getFileType(file.name);
      document.getElementById('upload-fileicon').textContent = icons[ext] || '📎';
    };

    document.getElementById('upload-remove').addEventListener('click', () => {
      selectedFile = null;
      input.value = '';
      preview.classList.remove('show');
    });

    document.getElementById('add-tabs-file').addEventListener('click', () => {
      document.getElementById('add-panel-file').classList.remove('hidden');
      document.getElementById('add-panel-category').classList.add('hidden');
      document.getElementById('add-tabs-file').classList.add('active');
      document.getElementById('add-tabs-category').classList.remove('active');
    });
    document.getElementById('add-tabs-category').addEventListener('click', () => {
      document.getElementById('add-panel-category').classList.remove('hidden');
      document.getElementById('add-panel-file').classList.add('hidden');
      document.getElementById('add-tabs-category').classList.add('active');
      document.getElementById('add-tabs-file').classList.remove('active');
    });

    let selectedColor = '#3B82F6';
    let selectedIcon = '📁';
    document.querySelectorAll('.color-picker__swatch').forEach(s => {
      s.addEventListener('click', () => {
        document.querySelectorAll('.color-picker__swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        selectedColor = s.dataset.color;
      });
    });
    document.querySelectorAll('.icon-picker__btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.icon-picker__btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        selectedIcon = b.dataset.icon;
      });
    });

    document.getElementById('form-add-file').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.state.user) { Router.navigate('login', true); return; }
      if (!selectedFile) { this.toast('Sélectionnez un fichier', 'error'); return; }

      const btn = document.getElementById('btn-upload');
      const progress = document.getElementById('upload-progress');
      btn.disabled = true;
      progress.classList.add('show');

      try {
        await Catalog.addFile(this.state.user.id, selectedFile, {
          name: document.getElementById('add-name').value.trim(),
          category: document.getElementById('add-category').value,
          subcategory: document.getElementById('add-subcategory').value.trim()
        });
        await this.refreshCatalog();
        selectedFile = null;
        input.value = '';
        preview.classList.remove('show');
        document.getElementById('add-name').value = '';
        document.getElementById('add-subcategory').value = '';
        this.toast('Fichier ajouté', 'success');
        Router.navigate('browse', true);
      } catch (ex) {
        this.toast(ex.message, 'error');
      } finally {
        btn.disabled = false;
        progress.classList.remove('show');
      }
    });

    document.getElementById('form-add-category').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.state.user) { Router.navigate('login', true); return; }
      try {
        await Catalog.createCategory(this.state.user.id, {
          name: document.getElementById('cat-name').value,
          color: selectedColor,
          icon: selectedIcon
        });
        await this.refreshCatalog();
        document.getElementById('cat-name').value = '';
        this.toast('Catégorie créée', 'success');
        Router.navigate('categories', true);
      } catch (ex) {
        this.toast(ex.message, 'error');
      }
    });
  },

  bindNav() {
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        if (item.classList.contains('bottom-nav__item--locked')) {
          Router.navigate('login', true);
          return;
        }
        Router.navigate(screen, true);
      });
    });

    document.getElementById('btn-my-categories').addEventListener('click', () => Router.navigate('categories', true));
    document.getElementById('btn-install').addEventListener('click', () => this.promptInstall());
  },

  bindPreview() {
    document.getElementById('preview-close').addEventListener('click', () => Preview.close());
    document.getElementById('preview-backdrop').addEventListener('click', () => Preview.close());
    document.getElementById('preview-fullscreen').addEventListener('click', () => Preview.openFullscreen());
    document.getElementById('fullscreen-close').addEventListener('click', () => Preview.closeFullscreen());
  },

  bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstall = e;
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    });
  },

  async promptInstall() {
    if (!this.deferredInstall) {
      this.toast('Utilisez « Ajouter à l\'écran d\'accueil » depuis le menu du navigateur');
      return;
    }
    this.deferredInstall.prompt();
    await this.deferredInstall.userChoice;
    this.deferredInstall = null;
    document.getElementById('install-banner').classList.add('hidden');
  },

  toast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast toast--' + (type || 'info');
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => t.classList.remove('show'), 3000);
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;
