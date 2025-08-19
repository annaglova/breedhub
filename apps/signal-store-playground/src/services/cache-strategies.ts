// Advanced Cache Strategies for PWA

export interface CacheConfig {
  name: string;
  version: number;
  maxAge?: number; // in seconds
  maxEntries?: number;
  strategies: CacheStrategy[];
}

export interface CacheStrategy {
  urlPattern: RegExp | string;
  handler: 'CacheFirst' | 'NetworkFirst' | 'NetworkOnly' | 'CacheOnly' | 'StaleWhileRevalidate';
  options?: {
    cacheName?: string;
    expiration?: {
      maxEntries?: number;
      maxAgeSeconds?: number;
      purgeOnQuotaError?: boolean;
    };
    cacheableResponse?: {
      statuses?: number[];
      headers?: Record<string, string>;
    };
    backgroundSync?: {
      name: string;
      options?: {
        maxRetentionTime?: number; // in minutes
      };
    };
  };
}

// Pre-configured cache strategies
export const cacheStrategies: CacheStrategy[] = [
  // Static assets - Cache First
  {
    urlPattern: /\.(js|css|woff2?|ttf|otf|eot)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets-v1',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      }
    }
  },
  
  // Images - Cache First with size limit
  {
    urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images-v1',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  },
  
  // API calls - Network First with timeout
  {
    urlPattern: /\/api\//,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache-v1',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      },
      cacheableResponse: {
        statuses: [200]
      }
    }
  },
  
  // Supabase API - Stale While Revalidate
  {
    urlPattern: /supabase\.co\/rest\/v1/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'supabase-api-v1',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 // 1 hour
      },
      backgroundSync: {
        name: 'supabase-sync',
        options: {
          maxRetentionTime: 24 * 60 // 24 hours
        }
      }
    }
  },
  
  // HTML pages - Network First
  {
    urlPattern: /\.html$/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'pages-v1',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60 // 1 day
      }
    }
  },
  
  // Google Fonts - Cache First (long cache)
  {
    urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-v1',
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  }
];

// Cache management utilities
export class CacheManager {
  // Get cache statistics
  static async getCacheStats(): Promise<{
    caches: Array<{
      name: string;
      count: number;
      size: number;
    }>;
    totalSize: number;
  }> {
    if (!('caches' in window)) {
      return { caches: [], totalSize: 0 };
    }

    const cacheNames = await caches.keys();
    const stats = [];
    let totalSize = 0;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      let cacheSize = 0;

      // Estimate size (this is approximate)
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          cacheSize += blob.size;
        }
      }

      stats.push({
        name,
        count: requests.length,
        size: cacheSize
      });
      
      totalSize += cacheSize;
    }

    return { caches: stats, totalSize };
  }

  // Clear specific cache
  static async clearCache(cacheName: string): Promise<boolean> {
    if ('caches' in window) {
      return await caches.delete(cacheName);
    }
    return false;
  }

  // Clear all caches
  static async clearAllCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  // Precache essential resources
  static async precacheResources(urls: string[]): Promise<void> {
    if (!('caches' in window)) return;

    const cache = await caches.open('precache-v1');
    
    // Filter out already cached resources
    const uncachedUrls = [];
    for (const url of urls) {
      const response = await cache.match(url);
      if (!response) {
        uncachedUrls.push(url);
      }
    }

    if (uncachedUrls.length > 0) {
      await cache.addAll(uncachedUrls);
    }
  }

  // Update specific cached resource
  static async updateCachedResource(url: string): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) {
        // Find which cache contains this resource
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            await cache.put(url, response.clone());
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to update cached resource:', error);
    }
  }

  // Check if resource is cached
  static async isResourceCached(url: string): Promise<boolean> {
    if (!('caches' in window)) return false;

    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const response = await cache.match(url);
      if (response) return true;
    }
    return false;
  }

  // Get cache storage estimate
  static async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
      };
    }
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

// Essential resources to precache
export const essentialResources = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg'
];

// Initialize cache strategies
export async function initializeCacheStrategies() {
  // Precache essential resources
  await CacheManager.precacheResources(essentialResources);
  
  // Clean up old caches
  const cacheNames = await caches.keys();
  const currentCaches = new Set([
    'static-assets-v1',
    'images-v1',
    'api-cache-v1',
    'supabase-api-v1',
    'pages-v1',
    'google-fonts-v1',
    'precache-v1'
  ]);
  
  // Delete old version caches
  for (const cacheName of cacheNames) {
    if (!currentCaches.has(cacheName)) {
      console.log(`Deleting old cache: ${cacheName}`);
      await caches.delete(cacheName);
    }
  }
}