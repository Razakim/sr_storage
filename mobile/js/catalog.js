const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'Tout', slug: 'all', system: true },
  { id: 'videos', name: 'Vidéos', slug: 'videos', color: '#EF4444', system: true },
  { id: 'certificates', name: 'Certificats', slug: 'certificates', color: '#10B981', system: true },
  { id: 'images', name: 'Images', slug: 'images', color: '#CBD5E1', system: true },
  { id: 'documents', name: 'Documents', slug: 'documents', color: '#3B82F6', system: true }
];

const Catalog = {
  blobUrls: new Map(),

  getBasePath() {
    return '../';
  },

  resolvePath(path) {
    if (path.startsWith('blob:') || path.startsWith('http')) return path;
    return this.getBasePath() + path;
  },

  formatSize(bytes) {
    if (typeof bytes === 'string') return bytes;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  },

  getFileType(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'mp4';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    if (ext === 'pdf') return 'pdf';
    return ext;
  },

  inferCategory(type) {
    if (type === 'mp4') return 'videos';
    if (type === 'pdf') return 'certificates';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(type)) return 'images';
    return 'documents';
  },

  async getStaticItems() {
    if (typeof R_Storage !== 'undefined') {
      return R_Storage.map(item => ({
        ...item,
        source: 'static',
        path: this.resolvePath(item.path)
      }));
    }
    return [];
  },

  async getUserItems(userId) {
    if (!userId) return [];
    const files = await MobileDB.getByIndex('files', 'userId', userId);
    const items = [];

    for (const f of files) {
      let path = f.path;
      if (f.blobKey) {
        if (!this.blobUrls.has(f.blobKey)) {
          const blob = await MobileDB.getBlob(f.blobKey);
          if (blob) this.blobUrls.set(f.blobKey, URL.createObjectURL(blob));
        }
        path = this.blobUrls.get(f.blobKey) || '';
      }
      items.push({
        ...f,
        source: 'user',
        path
      });
    }
    return items;
  },

  async getAllItems(userId) {
    const [staticItems, userItems] = await Promise.all([
      this.getStaticItems(),
      this.getUserItems(userId)
    ]);
    return [...staticItems, ...userItems];
  },

  async getCategories(userId) {
    const custom = userId
      ? await MobileDB.getByIndex('categories', 'userId', userId)
      : [];
    return [...DEFAULT_CATEGORIES, ...custom.map(c => ({ ...c, system: false }))];
  },

  async createCategory(userId, { name, color, icon }) {
    name = name.trim();
    if (!name) throw new Error('Nom de catégorie requis');
    if (name.length > 30) throw new Error('Nom trop long (30 car. max)');

    const existing = await this.getCategories(userId);
    if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Cette catégorie existe déjà');
    }

    const slug = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = {
      id: crypto.randomUUID(),
      userId,
      name,
      slug,
      color: color || '#3B82F6',
      icon: icon || '📁',
      createdAt: new Date().toISOString()
    };
    await MobileDB.put('categories', category);
    return category;
  },

  async deleteCategory(userId, categoryId) {
    const cat = await MobileDB.get('categories', categoryId);
    if (!cat || cat.userId !== userId) throw new Error('Catégorie introuvable');
    await MobileDB.delete('categories', categoryId);
  },

  async addFile(userId, file, meta) {
    const blobKey = 'blob-' + crypto.randomUUID();
    await MobileDB.saveBlob(blobKey, file);

    const type = this.getFileType(file.name);
    const item = {
      id: 'user-' + crypto.randomUUID(),
      userId,
      name: meta.name || file.name.replace(/\.[^.]+$/, ''),
      category: meta.category || this.inferCategory(type),
      subcategory: meta.subcategory || '',
      type,
      size: this.formatSize(file.size),
      sizeBytes: file.size,
      date: new Date().toISOString().slice(0, 10),
      blobKey,
      createdAt: new Date().toISOString()
    };
    await MobileDB.put('files', item);
    return item;
  },

  async deleteFile(userId, fileId) {
    const file = await MobileDB.get('files', fileId);
    if (!file || file.userId !== userId) throw new Error('Fichier introuvable');
    if (file.blobKey) {
      await MobileDB.deleteBlob(file.blobKey);
      if (this.blobUrls.has(file.blobKey)) {
        URL.revokeObjectURL(this.blobUrls.get(file.blobKey));
        this.blobUrls.delete(file.blobKey);
      }
    }
    await MobileDB.delete('files', fileId);
  },

  filterItems(items, { category, subcategory, search, customCategoryId }) {
    let result = items;

    if (category && category !== 'all') {
      result = result.filter(i => i.category === category);
    }

    if (customCategoryId) {
      const cat = customCategoryId;
      result = result.filter(i => i.category === cat || i.customCategory === cat);
    }

    if (subcategory && subcategory !== 'all') {
      result = result.filter(i => i.subcategory === subcategory);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.subcategory && i.subcategory.toLowerCase().includes(q))
      );
    }

    return result;
  },

  getStats(items) {
    const cats = {};
    items.forEach(i => {
      cats[i.category] = (cats[i.category] || 0) + 1;
    });
    return {
      total: items.length,
      videos: cats.videos || 0,
      certificates: cats.certificates || 0,
      images: cats.images || 0,
      documents: cats.documents || 0
    };
  }
};

window.Catalog = Catalog;
