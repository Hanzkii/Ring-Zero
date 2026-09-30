/**
 * Ring Zero - High-Performance Generic Object Pool
 * Preallocates reusable entities to eliminate garbage collection pauses in hot loops.
 */

export class ObjectPool {
  /**
   * @param {Object} options
   * @param {function(): Object} options.factory - Instantiation factory function
   * @param {function(Object): void} [options.reset] - Cleanup/reset function called on release
   * @param {number} [options.initialCapacity=512] - Number of preallocated objects
   * @param {number} [options.maxCapacity=4096] - Ceiling limit
   */
  constructor({ factory, reset = null, initialCapacity = 512, maxCapacity = 4096 }) {
    this.factory = factory;
    this.reset = reset;
    this.maxCapacity = maxCapacity;

    /** @type {Object[]} */
    this.pool = [];
    /** @type {Object[]} */
    this.active = [];

    // Pre-allocate instances
    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquires an instance from the pool or creates one if under capacity
   * @returns {Object|null}
   */
  obtain() {
    let item;
    if (this.pool.length > 0) {
      item = this.pool.pop();
    } else if (this.active.length < this.maxCapacity) {
      item = this.factory();
    } else {
      // Over capacity: reclaim oldest active item
      item = this.active.shift();
      if (this.reset) this.reset(item);
    }

    this.active.push(item);
    return item;
  }

  /**
   * Releases an active item back into the available pool
   * @param {Object} item
   */
  release(item) {
    const idx = this.active.indexOf(item);
    if (idx !== -1) {
      // Fast swap-pop removal
      const last = this.active.pop();
      if (idx < this.active.length) {
        this.active[idx] = last;
      }
      if (this.reset) {
        this.reset(item);
      }
      this.pool.push(item);
    }
  }

  /**
   * Releases all currently active objects back to the pool
   */
  releaseAll() {
    while (this.active.length > 0) {
      const item = this.active.pop();
      if (this.reset) {
        this.reset(item);
      }
      this.pool.push(item);
    }
  }

  /**
   * Iterates through all active items without allocating temporary arrays
   * @param {function(Object, number): void} callback
   */
  forEachActive(callback) {
    for (let i = 0; i < this.active.length; i++) {
      callback(this.active[i], i);
    }
  }

  /**
   * Iterates backwards so items can safely be released during the loop
   * @param {function(Object, number): boolean|void} callback - Return false to break
   */
  forEachActiveReverse(callback) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const result = callback(this.active[i], i);
      if (result === false) break;
    }
  }

  get activeCount() {
    return this.active.length;
  }

  get availableCount() {
    return this.pool.length;
  }

  get totalCount() {
    return this.active.length + this.pool.length;
  }
}
