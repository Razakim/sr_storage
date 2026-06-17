const DB_NAME = 'R_StorageMobile';
const DB_VERSION = 2;

const MobileDB = {
  db: null,

  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
          db.createObjectStore('usersByEmail', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          const cat = db.createObjectStore('categories', { keyPath: 'id' });
          cat.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('files')) {
          const files = db.createObjectStore('files', { keyPath: 'id' });
          files.createIndex('userId', 'userId', { unique: false });
          files.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const q = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          q.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('catalog_cache')) {
          db.createObjectStore('catalog_cache', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(this.db); };
      req.onerror = () => reject(req.error);
    });
  },

  tx(store, mode) {
    return this.db.transaction(store, mode).objectStore(store);
  },

  getAll(store) {
    return this.open().then(() => new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  get(store, key) {
    return this.open().then(() => new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  put(store, data) {
    return this.open().then(() => new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    }));
  },

  delete(store, key) {
    return this.open().then(() => new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  },

  getByIndex(store, index, value) {
    return this.open().then(() => new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').index(index).getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  saveBlob(key, blob) {
    return this.put('blobs', { key, blob, createdAt: Date.now() });
  },

  getBlob(key) {
    return this.get('blobs', key).then(r => r ? r.blob : null);
  },

  deleteBlob(key) {
    return this.delete('blobs', key);
  }
};

window.MobileDB = MobileDB;
