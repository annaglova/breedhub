import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      setSwRegistration(r);
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    }
  });
  
  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleUpdate = () => {
    updateServiceWorker(true);
  };
  
  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };
  
  const handleDismissOfflineReady = () => {
    setOfflineReady(false);
  };
  
  return (
    <>
      {/* Network Status Indicator */}
      <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-all ${
        isOnline 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-orange-50 border border-orange-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          } animate-pulse`} />
          <span className={`text-sm font-medium ${
            isOnline ? 'text-green-800' : 'text-orange-800'
          }`}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
          {isInstalled && (
            <span className="text-xs text-gray-600 ml-2">PWA</span>
          )}
        </div>
      </div>
      
      {/* Offline Ready Notification */}
      {offlineReady && (
        <div className="fixed bottom-4 left-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Ready for offline!</h4>
              <p className="text-sm text-blue-700 mb-2">
                App is cached and will work offline.
              </p>
              <button
                onClick={handleDismissOfflineReady}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Update Available Notification */}
      {needRefresh && (
        <div className="fixed bottom-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔄</span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">Update available!</h4>
              <p className="text-sm text-yellow-700 mb-3">
                A new version of the app is available.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm font-medium hover:bg-yellow-700"
                >
                  Update Now
                </button>
                <button
                  onClick={handleDismissUpdate}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* PWA Info Panel */}
      <div className="fixed bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-xs">
        <h3 className="font-semibold text-gray-900 mb-3">📱 PWA Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Network:</span>
            <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Service Worker:</span>
            <span className={`font-medium ${swRegistration ? 'text-green-600' : 'text-gray-400'}`}>
              {swRegistration ? 'Active' : 'Not registered'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Installed:</span>
            <span className={`font-medium ${isInstalled ? 'text-green-600' : 'text-gray-400'}`}>
              {isInstalled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Offline Ready:</span>
            <span className={`font-medium ${offlineReady ? 'text-green-600' : 'text-gray-400'}`}>
              {offlineReady ? 'Yes' : 'Not yet'}
            </span>
          </div>
        </div>
        
        {/* Cache Info */}
        {swRegistration && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={async () => {
                if ('caches' in window) {
                  const names = await caches.keys();
                  console.log('Available caches:', names);
                  alert(`Cached: ${names.join(', ')}`);
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              View cached resources
            </button>
          </div>
        )}
      </div>
    </>
  );
}