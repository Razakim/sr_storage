const Sync = {
  STATUS: { LOCAL: 'local', PENDING: 'pending', SYNCED: 'synced', CONFLICT: 'conflict' },

  meta(localId) {
    return {
      localId: localId || crypto.randomUUID(),
      status: this.STATUS.PENDING,
      updatedAt: new Date().toISOString(),
      remoteId: null
    };
  },

  async queue(entity, action, payload) {
    await MobileDB.put('sync_queue', {
      entity,
      action,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    });
  },

  async getPending() {
    const all = await MobileDB.getAll('sync_queue');
    return all.filter(r => r.status === 'pending');
  },

  async markSynced(queueId, remoteId) {
    const item = await MobileDB.get('sync_queue', queueId);
    if (!item) return;
    item.status = 'synced';
    item.remoteId = remoteId;
    await MobileDB.put('sync_queue', item);
  },

  async pushToRemote() {
    const pending = await this.getPending();
    if (!pending.length || typeof window.supabase === 'undefined') return { pushed: 0 };
    return { pushed: 0, note: 'Supabase non configuré — données en attente localement' };
  },

  async pullFromRemote() {
    if (typeof window.supabase === 'undefined') return { pulled: 0 };
    return { pulled: 0 };
  },

  async sync() {
    await this.pushToRemote();
    await this.pullFromRemote();
  }
};

window.Sync = Sync;
