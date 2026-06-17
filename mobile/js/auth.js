const Auth = {
  SESSION_KEY: 'r_storage_session',

  async hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  },

  generateId() {
    return crypto.randomUUID();
  },

  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  setSession(userId) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ userId }));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  async getCurrentUser() {
    const session = this.getSession();
    if (!session?.userId) return null;
    return MobileDB.get('users', session.userId);
  },

  isLoggedIn() {
    return !!this.getSession()?.userId;
  },

  async ensureSeedUser() {
    const email = 'srazakim@gmail.com';
    const existing = await MobileDB.get('usersByEmail', email);
    if (existing) return;

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword('Razakim2007', salt);
    const id = '00000000-0000-4000-8000-000000000001';

    const user = {
      id,
      name: 'Srazakim',
      email,
      passwordHash,
      salt: Array.from(salt),
      createdAt: new Date().toISOString(),
      _sync: Sync.meta(id)
    };

    await MobileDB.put('users', user);
    await MobileDB.put('usersByEmail', { email, userId: id });
  },

  async register({ name, email, password }) {
    email = email.trim().toLowerCase();
    name = name.trim();

    if (!name || name.length < 2) throw new Error('Nom requis (2 caractères min.)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide');
    if (!password || password.length < 6) throw new Error('Mot de passe : 6 caractères min.');

    const existing = await MobileDB.get('usersByEmail', email);
    if (existing) throw new Error('Cet email est déjà utilisé');

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);
    const id = this.generateId();

    const user = {
      id,
      name,
      email,
      passwordHash,
      salt: Array.from(salt),
      createdAt: new Date().toISOString(),
      _sync: Sync.meta(id)
    };

    await MobileDB.put('users', user);
    await MobileDB.put('usersByEmail', { email, userId: id });
    await Sync.queue('users', 'insert', { id, name, email });
    this.setSession(id);
    return user;
  },

  async login({ email, password }) {
    email = email.trim().toLowerCase();
    const ref = await MobileDB.get('usersByEmail', email);
    if (!ref) throw new Error('Email ou mot de passe incorrect');

    const user = await MobileDB.get('users', ref.userId);
    if (!user) throw new Error('Email ou mot de passe incorrect');

    const salt = new Uint8Array(user.salt);
    const hash = await this.hashPassword(password, salt);
    if (hash !== user.passwordHash) throw new Error('Email ou mot de passe incorrect');

    this.setSession(user.id);
    return user;
  },

  async logout() {
    this.clearSession();
  }
};

window.Auth = Auth;
