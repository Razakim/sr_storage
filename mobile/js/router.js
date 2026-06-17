const Router = {
  current: 'home',
  history: [],
  listeners: [],

  init() {
    window.addEventListener('hashchange', () => this.resolve());
  },

  resolve() {
    const hash = (location.hash || '#home').slice(1);
    const screen = hash.split('/')[0] || 'home';
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
    const from = this.current;
    if (from === 'register') {
      this.history = [];
      this.navigate('profile', true);
      return;
    }
    if (from === 'categories') {
      this.history = [];
      this.navigate('profile', true);
      return;
    }
    if (this.history.length > 0) {
      this.navigate(this.history.pop(), true);
    } else {
      this.navigate('home', true);
    }
  },

  onChange(fn) {
    this.listeners.push(fn);
  }
};

window.Router = Router;
