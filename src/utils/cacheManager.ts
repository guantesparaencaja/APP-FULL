/**
 * Video Cache Manager for GUANTES
 * Uses Browser Cache API for video data and localStorage for LRU metadata
 */

const CACHE_NAME = 'guantes-exercise-videos';
const METADATA_KEY = 'video_cache_metadata';
const MAX_ITEMS = 5;

interface CacheMetadata {
  url: string;
  lastUsed: number;
}

/**
 * Prunes the cache to maintain MAX_ITEMS limit using LRU strategy
 */
export async function pruneCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const metadataStr = localStorage.getItem(METADATA_KEY);
    let metadata: CacheMetadata[] = metadataStr ? JSON.parse(metadataStr) : [];

    if (metadata.length <= MAX_ITEMS) return;

    // Sort by lastUsed (ascending) to find oldest items
    metadata.sort((a, b) => a.lastUsed - b.lastUsed);

    const itemsToRemove = metadata.slice(0, metadata.length - MAX_ITEMS);
    const itemsToKeep = metadata.slice(metadata.length - MAX_ITEMS);

    for (const item of itemsToRemove) {
      await cache.delete(item.url);
      console.log(`Pruned from cache: ${item.url}`);
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(itemsToKeep));
  } catch (error) {
    console.error('Error pruning video cache:', error);
  }
}

/**
 * Caches a video URL
 */
export async function cacheVideo(url: string) {
  if (!url) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);

    if (!response) {
      console.log(`Caching video: ${url}`);
      await cache.add(url);
    }

    // Update metadata for LRU
    const metadataStr = localStorage.getItem(METADATA_KEY);
    let metadata: CacheMetadata[] = metadataStr ? JSON.parse(metadataStr) : [];

    const existingIndex = metadata.findIndex((m) => m.url === url);
    if (existingIndex !== -1) {
      metadata[existingIndex].lastUsed = Date.now();
    } else {
      metadata.push({ url, lastUsed: Date.now() });
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    await pruneCache();
  } catch (error) {
    console.error('Error caching video:', error);
  }
}

/**
 * Returns a local Blob URL if the video is cached, otherwise null
 */
export async function getCachedVideo(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);

    if (response) {
      console.log(`Cache hit for: ${url}`);

      // Update metadata for LRU
      const metadataStr = localStorage.getItem(METADATA_KEY);
      let metadata: CacheMetadata[] = metadataStr ? JSON.parse(metadataStr) : [];
      const existingIndex = metadata.findIndex((m) => m.url === url);
      if (existingIndex !== -1) {
        metadata[existingIndex].lastUsed = Date.now();
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error('Error getting cached video:', error);
  }

  return null;
}

/**
 * Checks if the device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
