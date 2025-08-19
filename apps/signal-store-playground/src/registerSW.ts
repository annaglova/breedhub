// Manual Service Worker registration
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Wait for window load
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(true);
        } else {
          window.addEventListener('load', resolve);
        }
      });

      // In development, Vite PWA uses dev-sw.js
      const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
      
      // Register the service worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        type: import.meta.env.DEV ? 'module' : 'classic',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registered successfully:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('📦 New service worker available! Reload to update.');
              // You can show a notification to the user here
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker updated, reloading...');
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Service Workers are not supported in this browser');
    return null;
  }
}

// Auto-register on import
if (typeof window !== 'undefined') {
  registerServiceWorker().catch(console.error);
}