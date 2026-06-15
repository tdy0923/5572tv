/**
 * Bounded Set with LRU eviction for loaded image URLs
 */
class BoundedImageSet {
  private set = new Set<string>();
  private maxSize: number;

  constructor(maxSize: number = 5000) {
    this.maxSize = maxSize;
  }

  add(url: string): void {
    if (this.set.has(url)) {
      // Move to end (most recently used)
      this.set.delete(url);
    } else if (this.set.size >= this.maxSize) {
      // Evict oldest
      const firstValue = this.set.values().next().value;
      if (firstValue !== undefined) {
        this.set.delete(firstValue);
      }
    }
    this.set.add(url);
  }

  has(url: string): boolean {
    return this.set.has(url);
  }

  get size(): number {
    return this.set.size;
  }
}

export const loadedImageUrls = new BoundedImageSet();
