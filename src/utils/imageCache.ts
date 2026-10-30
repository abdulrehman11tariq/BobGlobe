/**
 * Bounded image cache to avoid redundant network requests and memory leaks (Max 100 items)
 */
const MAX_CACHE_SIZE = 100;
const imageCache = new Map<string, HTMLImageElement>();

export function preloadImage(url: string): Promise<boolean> {
  if (!url || typeof window === 'undefined') return Promise.resolve(false);
  if (imageCache.has(url)) return Promise.resolve(true);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      if (imageCache.size >= MAX_CACHE_SIZE) {
        // Evict oldest entry
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) imageCache.delete(oldestKey);
      }
      imageCache.set(url, img);
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
  });
}
