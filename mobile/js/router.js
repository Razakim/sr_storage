const Router = {
  current: 'welcome',
  history: [],
  listeners: [],

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  resolve() {
    const hash = (location.hash || '#welcome').slice(1);
    const screen = hash.split('/')[0] || 'welcome';
    this.navigate(screen, false);
  },

  navigate(screen, pushHash) {
    if (this.current && this.current !== screen && pushHash !== false) {
      this.history.push(this.current);
    }
    if (pushHash !== false) {
      location.hash = screen;
    }
    this.current = screen;
    this.listeners.forEach(fn => fn(screen));
  },

  back() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.navigate(prev);
    } else {
      this.navigate('home');
    }
  },

  onChange(fn) {
    this.listeners.push(fn);
  },

  titles: {
    welcome: 'R_Storage',
    register: 'Inscription',
    login: 'Connexion',
    home: 'Accueil',
    browse: 'Explorer',
    search: 'Rechercher',
    add: 'Ajouter',
    profile: 'Compte',
    categories: 'Mes catégories'
  }
};

window.Router = Router;
