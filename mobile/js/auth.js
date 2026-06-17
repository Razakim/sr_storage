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
    const arr = crypto.getRandomValues(new Uint8Array(16));
    return arr;
  },

  generateId() {
    return crypto.randomUUID();
  },

  generateToken() {
    const arr = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch { return null; }
  },

  setSession(userId, token) {
    const session = {
      userId,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  async getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    const user = await MobileDB.get('users', session.userId);
    if (!user || user.token !== session.token) {
      this.clearSession();
      return null;
    }
    return user;
  },

  isLoggedIn() {
    return !!this.getSession();
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
    const token = this.generateToken();
    const id = this.generateId();

    const user = {
      id,
      name,
      email,
      passwordHash,
      salt: Array.from(salt),
      token,
      createdAt: new Date().toISOString()
    };

    await MobileDB.put('users', user);
    await MobileDB.put('usersByEmail', { email, userId: id });
    this.setSession(id, token);
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

    const token = this.generateToken();
    user.token = token;
    await MobileDB.put('users', user);
    this.setSession(user.id, token);
    return user;
  },

  async logout() {
    const session = this.getSession();
    if (session) {
      const user = await MobileDB.get('users', session.userId);
      if (user) {
        user.token = null;
        await MobileDB.put('users', user);
      }
    }
    this.clearSession();
  }
};

window.Auth = Auth;
