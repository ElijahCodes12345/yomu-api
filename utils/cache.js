class Cache {
  constructor(timeout = 5 * 60 * 1000) { // 5 minutes default
    this.store = new Map();
    this.timeout = timeout;
  }

  set(key, data) {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.store.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp >= this.timeout) {
      this.store.delete(key);
      return null;
    }

    return cached.data;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now - value.timestamp >= this.timeout) {
        this.store.delete(key);
      }
    }
  }

  // Wrapper for async operations with automatic caching
  async wrap(key, fetchFunction, ...args) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction(...args);
    this.set(key, data);
    return data;
  }
}

module.exports = Cache;