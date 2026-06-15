/**
 * Bounded Map with LRU eviction — prevents unbounded memory growth
 */
export class BoundedMap<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Move to end (most recently used)
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first inserted)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }
}
