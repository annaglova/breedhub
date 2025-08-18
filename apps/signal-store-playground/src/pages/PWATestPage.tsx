import React, { useState } from 'react';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { PWAStatus } from '../components/PWAStatus';

export default function PWATestPage() {
  const [showStatus, setShowStatus] = useState(true);
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📱 PWA Testing - Phase 1.1
          </h1>
          <p className="text-lg text-gray-600">
            Test Progressive Web App features: Service Worker, Manifest, Install Prompt
          </p>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PWA Features Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🚀 PWA Features</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900">✅ Service Worker</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Caches app resources for offline access
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900">✅ Web App Manifest</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Makes app installable on devices
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-gray-900">✅ Install Prompt</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Custom UI for app installation
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-gray-900">✅ Offline Support</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Works without internet connection
                </p>
              </div>
            </div>
          </div>
          
          {/* Test Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 How to Test</h2>
            
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold text-purple-600">1.</span>
                <div>
                  <strong>Check Service Worker:</strong>
                  <p className="text-gray-600 mt-1">
                    Open DevTools → Application → Service Workers
                  </p>
                </div>
              </li>
              
              <li className="flex gap-2">
                <span className="font-semibold text-purple-600">2.</span>
                <div>
                  <strong>Test Install:</strong>
                  <p className="text-gray-600 mt-1">
                    Look for install prompt in bottom-right corner
                  </p>
                </div>
              </li>
              
              <li className="flex gap-2">
                <span className="font-semibold text-purple-600">3.</span>
                <div>
                  <strong>Go Offline:</strong>
                  <p className="text-gray-600 mt-1">
                    DevTools → Network → Set to "Offline"
                  </p>
                </div>
              </li>
              
              <li className="flex gap-2">
                <span className="font-semibold text-purple-600">4.</span>
                <div>
                  <strong>Check Cache:</strong>
                  <p className="text-gray-600 mt-1">
                    DevTools → Application → Cache Storage
                  </p>
                </div>
              </li>
              
              <li className="flex gap-2">
                <span className="font-semibold text-purple-600">5.</span>
                <div>
                  <strong>Lighthouse Audit:</strong>
                  <p className="text-gray-600 mt-1">
                    DevTools → Lighthouse → Settings (⚙️) → Check "Progressive Web App" → Analyze
                  </p>
                </div>
              </li>
            </ol>
          </div>
          
          {/* Manual Install */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📲 Manual Install Test</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Check if browser supports beforeinstallprompt
                  if ('BeforeInstallPromptEvent' in window) {
                    alert('Install prompt is supported! It will appear automatically when conditions are met.');
                  } else {
                    alert('Install prompt not supported in this browser. Try Chrome/Edge.');
                  }
                }}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                🔍 Check Install Support
              </button>
              
              <button
                onClick={() => {
                  // Check if already installed
                  if (window.matchMedia('(display-mode: standalone)').matches) {
                    alert('App is already installed!');
                  } else {
                    alert('App not installed. In Chrome: Menu (⋮) → "Install BreedHub..."');
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📱 Check Install Status
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <strong>Manual Install:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Chrome: Menu (⋮) → "Install BreedHub..."</li>
                <li>• Edge: Menu (⋯) → "Apps" → "Install this site"</li>
                <li>• Safari: Share → "Add to Home Screen"</li>
              </ul>
            </div>
          </div>
          
          {/* Cache Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🗄️ Cache Management</h2>
            
            <div className="space-y-3">
              <button
                onClick={async () => {
                  if ('caches' in window) {
                    const names = await caches.keys();
                    console.log('Cache names:', names);
                    
                    for (const name of names) {
                      const cache = await caches.open(name);
                      const requests = await cache.keys();
                      console.log(`Cache ${name}:`, requests.length, 'items');
                    }
                    
                    alert(`Found ${names.length} cache(s). Check console for details.`);
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📊 View Cache Status
              </button>
              
              <button
                onClick={async () => {
                  if (confirm('This will clear all cached data. Continue?')) {
                    if ('caches' in window) {
                      const names = await caches.keys();
                      await Promise.all(names.map(name => caches.delete(name)));
                      alert('All caches cleared! Reload to re-cache.');
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                🗑️ Clear All Caches
              </button>
              
              <button
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(registration => {
                        registration.update();
                      });
                      alert('Service Worker update triggered!');
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                🔄 Update Service Worker
              </button>
            </div>
          </div>
          
          {/* Manifest Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Manifest Info</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">BreedHub Playground</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Theme Color:</span>
                <span className="font-medium">#6B3AB7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Display:</span>
                <span className="font-medium">Standalone</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Orientation:</span>
                <span className="font-medium">Portrait</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <a
                href="/manifest.webmanifest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                View full manifest →
              </a>
            </div>
          </div>
        </div>
        
        {/* Toggle Status Display */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowStatus(!showStatus)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {showStatus ? 'Hide' : 'Show'} PWA Status Panel
          </button>
        </div>
        
        {/* Lighthouse PWA Guide */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            🔍 How to Enable PWA in Lighthouse
          </h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li><strong>1.</strong> Open DevTools (F12)</li>
            <li><strong>2.</strong> Go to Lighthouse tab</li>
            <li><strong>3.</strong> Click Settings icon (⚙️) at top</li>
            <li><strong>4.</strong> In Categories section, check ✅ "Progressive Web App"</li>
            <li><strong>5.</strong> Click "Analyze page load"</li>
            <li className="mt-2 font-semibold">👉 The PWA score will now appear!</li>
          </ol>
        </div>
        
        {/* Expected Behavior */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            🎯 Expected Behavior
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• Service Worker should be registered and active</li>
            <li>• Install prompt should appear (if not already installed)</li>
            <li>• App should work when offline (after first visit)</li>
            <li>• Network status indicator should update in real-time</li>
            <li>• Update notifications should appear when app is updated</li>
            <li>• Lighthouse PWA score should be above 90</li>
          </ul>
        </div>
      </div>
      
      {/* PWA Components */}
      <PWAInstallPrompt />
      {showStatus && <PWAStatus />}
    </div>
  );
}