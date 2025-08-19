import React, { useState, useEffect } from 'react';

export function SWRegisterButton() {
  const [swStatus, setSwStatus] = useState<'checking' | 'registered' | 'not-registered'>('checking');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    checkSWStatus();
  }, []);

  const checkSWStatus = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        setSwStatus('registered');
        setRegistration(registrations[0]);
      } else {
        setSwStatus('not-registered');
      }
    }
  };

  const registerSW = async () => {
    try {
      // Try to register the Vite PWA service worker
      const reg = await navigator.serviceWorker.register('/dev-sw.js?dev-sw', {
        scope: '/',
        type: 'module'
      });
      
      console.log('✅ Service Worker manually registered:', reg);
      setRegistration(reg);
      setSwStatus('registered');
      
      // Force update
      await reg.update();
      
      alert('Service Worker registered successfully! Check DevTools.');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Try fallback to generated sw.js
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('✅ Fallback SW registered:', reg);
        setRegistration(reg);
        setSwStatus('registered');
        alert('Service Worker registered (fallback)!');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert(`Failed to register SW: ${error.message}`);
      }
    }
  };

  const unregisterSW = async () => {
    if (registration) {
      await registration.unregister();
      setRegistration(null);
      setSwStatus('not-registered');
      alert('Service Worker unregistered!');
    }
  };

  if (swStatus === 'checking') {
    return <div className="text-sm text-gray-500">Checking SW status...</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
      <div className="text-sm font-semibold mb-2">
        Service Worker: {swStatus === 'registered' ? '✅ Active' : '❌ Not Active'}
      </div>
      
      {swStatus === 'not-registered' ? (
        <button
          onClick={registerSW}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Register Service Worker
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => checkSWStatus()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            Refresh Status
          </button>
          <button
            onClick={unregisterSW}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Unregister
          </button>
        </div>
      )}
    </div>
  );
}