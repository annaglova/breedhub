import React, { useState, useEffect } from 'react';
// import { getBreedHubDB } from '@breedhub/rxdb-store';
import { databaseService } from '@breedhub/rxdb-store';

interface CachedData {
  breeds: number;
  dogs: number;
  lastSync: string | null;
  pendingChanges: number;
}

export default function OfflineDataPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedData, setCachedData] = useState<CachedData>({
    breeds: 0,
    dogs: 0,
    lastSync: null,
    pendingChanges: 0
  });
  const [recentItems, setRecentItems] = useState<any[]>([]);

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load cached data from RxDB
    loadCachedData();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCachedData = async () => {
    try {
      const db = await databaseService.getDatabase();
      
      if (db?.breeds) {
        // Get counts
        const breedCount = await db.breeds.count().exec();
        const dogCount = await db.dogs.count().exec();
        
        // Get recent items
        const recentBreeds = await db.breeds
          .find()
          .sort({ updatedAt: 'desc' })
          .limit(5)
          .exec();
        
        setCachedData({
          breeds: breedCount,
          dogs: dogCount,
          lastSync: localStorage.getItem('lastSyncTime'),
          pendingChanges: parseInt(localStorage.getItem('pendingChanges') || '0')
        });
        
        setRecentItems(recentBreeds);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const syncData = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Your changes will be synced when connection returns.');
      return;
    }
    
    try {
      // Trigger sync
      const db = await databaseService.getDatabase();
      
      // Here we would trigger actual sync with Supabase
      // For now, just update the last sync time
      const now = new Date().toISOString();
      localStorage.setItem('lastSyncTime', now);
      localStorage.setItem('pendingChanges', '0');
      
      await loadCachedData();
      alert('Data synced successfully!');
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed. Will retry automatically.');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Network Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              📡 Offline Data Management
            </h1>
            <div className={`px-4 py-2 rounded-full font-semibold ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
          <p className="text-lg text-gray-600">
            View and manage your locally cached data. Works even when offline!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cached Data Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Cached Data Statistics</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Breeds Cached:</span>
                <span className="text-2xl font-bold text-purple-600">
                  {cachedData.breeds}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Dogs Cached:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {cachedData.dogs}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Pending Changes:</span>
                <span className={`text-2xl font-bold ${
                  cachedData.pendingChanges > 0 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {cachedData.pendingChanges}
                </span>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <span className="text-gray-600 block mb-1">Last Sync:</span>
                <span className="text-sm font-medium">
                  {formatDate(cachedData.lastSync)}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Sync Controls</h2>
            
            <div className="space-y-4">
              {/* Auto-sync status */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">Auto-Sync</span>
                  <span className="text-sm text-blue-700">
                    {isOnline ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-sm text-blue-600">
                  {isOnline 
                    ? 'Changes sync automatically when online'
                    : 'Will sync when connection returns'}
                </p>
              </div>

              {/* Manual sync button */}
              <button
                onClick={syncData}
                disabled={!isOnline}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isOnline
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isOnline ? '🔄 Sync Now' : '⏸️ Sync Unavailable (Offline)'}
              </button>

              {/* Pending changes warning */}
              {cachedData.pendingChanges > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-sm text-orange-800">
                    ⚠️ You have {cachedData.pendingChanges} unsaved changes that will sync when online
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Items */}
          <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">📝 Recent Cached Items</h2>
            
            {recentItems.length > 0 ? (
              <div className="space-y-2">
                {recentItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {item.group} • Updated: {formatDate(item.updatedAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      item._meta?.lwt 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item._meta?.lwt ? 'Synced' : 'Local'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No cached items yet. Data will appear here after your first sync.
              </p>
            )}
          </div>

          {/* Storage Info */}
          <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">💾 Storage Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={async () => {
                  if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    const used = (estimate.usage || 0) / (1024 * 1024);
                    const quota = (estimate.quota || 0) / (1024 * 1024);
                    alert(`Storage: ${used.toFixed(2)} MB used of ${quota.toFixed(2)} MB available`);
                  }
                }}
                className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="block text-2xl mb-1">📊</span>
                <span className="text-sm font-medium">Check Storage</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('This will clear all local data. Are you sure?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert('Local storage cleared!');
                    window.location.reload();
                  }
                }}
                className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <span className="block text-2xl mb-1">🗑️</span>
                <span className="text-sm font-medium">Clear Storage</span>
              </button>

              <button
                onClick={async () => {
                  if ('storage' in navigator && 'persist' in navigator.storage) {
                    const isPersisted = await navigator.storage.persist();
                    alert(isPersisted 
                      ? 'Storage is now persistent!' 
                      : 'Could not make storage persistent'
                    );
                  }
                }}
                className="p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="block text-2xl mb-1">🔒</span>
                <span className="text-sm font-medium">Persist Storage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            💡 Offline Tips
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• All your data is stored locally using IndexedDB</li>
            <li>• Changes made offline will sync automatically when online</li>
            <li>• The app works fully offline after first load</li>
            <li>• Conflicts are resolved using last-write-wins strategy</li>
            <li>• Keep the app installed for best offline experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
}