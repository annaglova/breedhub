// Initialize cache manually for development
export async function initializeCache() {
  if (!('caches' in window)) {
    console.warn('Cache API not supported');
    return;
  }

  try {
    // Essential resources to cache
    const CACHE_NAME = 'breedhub-essential-v1';
    const urlsToCache = [
      '/',
      '/offline.html',
      '/index.html',
      '/src/main.tsx',
      '/src/App.tsx',
      '/src/index.css',
      '/icon.svg',
      '/manifest.webmanifest'
    ];

    // Open cache
    const cache = await caches.open(CACHE_NAME);
    console.log('📦 Cache opened:', CACHE_NAME);

    // Try to add all URLs
    for (const url of urlsToCache) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log('✅ Cached:', url);
        }
      } catch (error) {
        console.log('⚠️ Could not cache:', url);
      }
    }

    // Create additional caches for organization
    const staticCache = await caches.open('static-assets-v1');
    const imageCache = await caches.open('images-v1');
    const apiCache = await caches.open('api-cache-v1');
    
    console.log('✅ All caches initialized');
    
    // List all caches
    const cacheNames = await caches.keys();
    console.log('📋 Available caches:', cacheNames);
    
    return cacheNames;
  } catch (error) {
    console.error('❌ Cache initialization failed:', error);
  }
}

// Function to manually cache a resource
export async function cacheResource(url: string, cacheName = 'breedhub-essential-v1') {
  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log(`✅ Manually cached: ${url} in ${cacheName}`);
      return true;
    }
  } catch (error) {
    console.error(`Failed to cache ${url}:`, error);
    return false;
  }
}

// Function to pre-cache all app resources
export async function preCacheAppResources() {
  console.log('🚀 Starting pre-cache of app resources...');
  
  const resources = {
    'static-assets-v1': [
      '/src/index.css',
      '/src/main.tsx',
      '/src/App.tsx'
    ],
    'images-v1': [
      '/icon.svg',
      '/vite.svg'
    ],
    'pages-v1': [
      '/',
      '/pwa',
      '/offline-data',
      '/background-sync',
      '/offline.html'
    ]
  };

  for (const [cacheName, urls] of Object.entries(resources)) {
    const cache = await caches.open(cacheName);
    let cached = 0;
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          cached++;
        }
      } catch (error) {
        // Ignore errors for missing resources
      }
    }
    
    console.log(`📦 ${cacheName}: cached ${cached}/${urls.length} resources`);
  }
  
  // Show cache statistics
  await showCacheStats();
}

// Function to show cache statistics
export async function showCacheStats() {
  const cacheNames = await caches.keys();
  console.log('\n📊 Cache Statistics:');
  console.log('===================');
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    console.log(`📦 ${name}: ${requests.length} items`);
    
    // Show first 3 items as preview
    requests.slice(0, 3).forEach(req => {
      console.log(`  - ${req.url.replace(window.location.origin, '')}`);
    });
    if (requests.length > 3) {
      console.log(`  ... and ${requests.length - 3} more`);
    }
  }
  console.log('===================\n');
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Wait a bit for service worker to be ready
    setTimeout(() => {
      initializeCache();
    }, 1000);
  });
}