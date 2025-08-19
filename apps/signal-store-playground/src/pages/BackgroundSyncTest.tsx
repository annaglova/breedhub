import React, { useState, useEffect } from 'react';
import { backgroundSync } from '../services/background-sync';
import { CacheManager } from '../services/cache-strategies';

export default function BackgroundSyncTest() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(backgroundSync.getSyncStatus());
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [testData, setTestData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      updateSyncStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateSyncStatus();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for sync completed events
    const handleSyncCompleted = (event: any) => {
      updateSyncStatus();
      alert(`Sync completed! Synced: ${event.detail.synced}, Failed: ${event.detail.failed}`);
    };
    
    window.addEventListener('sync-completed', handleSyncCompleted);
    
    // Initial load
    updateSyncStatus();
    loadCacheStats();
    
    // Periodic updates
    const interval = setInterval(() => {
      updateSyncStatus();
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncCompleted);
      clearInterval(interval);
    };
  }, []);

  const updateSyncStatus = () => {
    setSyncStatus(backgroundSync.getSyncStatus());
  };

  const loadCacheStats = async () => {
    const stats = await CacheManager.getCacheStats();
    const storage = await CacheManager.getStorageEstimate();
    setCacheStats({ ...stats, storage });
  };

  const simulateOfflineOperation = async (type: 'CREATE' | 'UPDATE' | 'DELETE') => {
    const opId = await backgroundSync.addPendingOperation({
      type,
      collection: 'breeds',
      data: {
        ...testData,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
    
    alert(`Operation queued with ID: ${opId}\nIt will sync when online.`);
    updateSyncStatus();
    setTestData({ name: '', description: '' });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔄 Background Sync Testing
          </h1>
          <p className="text-lg text-gray-600">
            Test offline operations and background synchronization
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sync Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Sync Status</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Network Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isOnline 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sync in Progress:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  syncStatus.syncInProgress 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {syncStatus.syncInProgress ? '⏳ Syncing...' : '✅ Idle'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Operations:</span>
                <span className={`text-2xl font-bold ${
                  syncStatus.pendingCount > 0 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {syncStatus.pendingCount}
                </span>
              </div>
              
              <div className="pt-3 border-t">
                <span className="text-gray-600 text-sm">Last Sync:</span>
                <p className="text-sm font-medium mt-1">
                  {syncStatus.lastSync 
                    ? new Date(syncStatus.lastSync).toLocaleString()
                    : 'Never synced'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => backgroundSync.syncPendingOperations()}
                disabled={!isOnline || syncStatus.syncInProgress}
                className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                  isOnline && !syncStatus.syncInProgress
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Force Sync Now
              </button>
              
              <button
                onClick={() => {
                  backgroundSync.clearPendingOperations();
                  updateSyncStatus();
                  alert('Pending operations cleared!');
                }}
                disabled={syncStatus.pendingCount === 0}
                className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                  syncStatus.pendingCount > 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Clear Pending Operations
              </button>
            </div>
          </div>

          {/* Test Operations */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 Test Offline Operations</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={testData.name}
                  onChange={(e) => setTestData({ ...testData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter breed name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={testData.description}
                  onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => simulateOfflineOperation('CREATE')}
                  disabled={!testData.name}
                  className="py-2 px-4 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => simulateOfflineOperation('UPDATE')}
                  disabled={!testData.name}
                  className="py-2 px-4 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Update
                </button>
                <button
                  onClick={() => simulateOfflineOperation('DELETE')}
                  disabled={!testData.name}
                  className="py-2 px-4 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Try going offline (DevTools → Network → Offline), create some operations, then go back online to see them sync!
                </p>
              </div>
            </div>
          </div>

          {/* Cache Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">💾 Cache Statistics</h2>
              <button
                onClick={loadCacheStats}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              >
                Refresh Stats
              </button>
            </div>
            
            {cacheStats ? (
              <div>
                {/* Storage Overview */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Storage Usage</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium">{formatBytes(cacheStats.storage.usage)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Quota:</span>
                    <span className="font-medium">{formatBytes(cacheStats.storage.quota)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(cacheStats.storage.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {cacheStats.storage.percentage.toFixed(2)}% used
                  </p>
                </div>
                
                {/* Cache Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold mb-2">Active Caches</h3>
                  {cacheStats.caches.map((cache: any) => (
                    <div key={cache.name} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{cache.name}</p>
                        <p className="text-sm text-gray-600">
                          {cache.count} items • {formatBytes(cache.size)}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await CacheManager.clearCache(cache.name);
                          loadCacheStats();
                          alert(`Cache "${cache.name}" cleared!`);
                        }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      await CacheManager.clearAllCaches();
                      loadCacheStats();
                      alert('All caches cleared!');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
                  >
                    Clear All Caches
                  </button>
                  
                  <button
                    onClick={async () => {
                      const isPersistent = await navigator.storage.persist();
                      alert(isPersistent 
                        ? 'Storage is persistent!' 
                        : 'Could not persist storage');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
                  >
                    Request Persistent Storage
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading cache statistics...</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            📖 How Background Sync Works
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• When offline, operations are queued locally in IndexedDB</li>
            <li>• Once back online, queued operations sync automatically</li>
            <li>• Failed operations retry up to 3 times with exponential backoff</li>
            <li>• Periodic sync runs every 12 hours when the app is installed</li>
            <li>• All data is encrypted and stored securely on device</li>
          </ul>
        </div>
      </div>
    </div>
  );
}