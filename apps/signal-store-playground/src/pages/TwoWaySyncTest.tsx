import React, { useState, useEffect } from 'react';
import { RefreshCw, Cloud, Database, AlertTriangle, Check, X, Zap, Upload, Download } from 'lucide-react';
import { getTempDatabase } from '@breedhub/rxdb-store/src/temp-database';
import { SimpleTwoWaySync } from '@breedhub/rxdb-store/src/supabase/simple-two-way-sync';
import { supabase } from '@breedhub/rxdb-store/src/supabase/client';
import { COLLECTIONS } from '@breedhub/rxdb-store/src/supabase/collections-config';

interface SyncLog {
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export default function TwoWaySyncTest() {
  const [db, setDb] = useState<any>(null);
  const [simpleSync, setSimpleSync] = useState<SimpleTwoWaySync | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [localBreeds, setLocalBreeds] = useState<any[]>([]);
  const [remoteBreeds, setRemoteBreeds] = useState<any[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [autoSync, setAutoSync] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const addLog = (type: SyncLog['type'], message: string) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      type,
      message
    }, ...prev].slice(0, 50));
  };

  // Initialize database
  useEffect(() => {
    initDatabase();
    
    // Cleanup on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (simpleSync) {
        simpleSync.stopAutoSync();
      }
    };
  }, []);

  const initDatabase = async () => {
    try {
      addLog('info', 'Initializing database...');
      const database = await getTempDatabase();
      
      // Add breed collection if not exists
      if (!database.collections.breed) {
        await database.addCollections({
          breed: { schema: COLLECTIONS.breed }
        });
      }
      
      setDb(database);
      addLog('success', 'Database initialized');
      
      // Load initial data
      await loadLocalBreeds(database);
      await loadRemoteBreeds();
    } catch (error: any) {
      addLog('error', `Database init failed: ${error.message}`);
    }
  };

  // Load local breeds from RxDB
  const loadLocalBreeds = async (database?: any) => {
    try {
      const db = database || await getTempDatabase();
      if (db.collections.breed) {
        const docs = await db.collections.breed.find().exec();
        const breeds = docs.map((d: any) => d.toJSON());
        // Sort by modified_on descending (newest first) like remote
        breeds.sort((a: any, b: any) => {
          const dateA = new Date(a.modified_on || a.created_on || 0).getTime();
          const dateB = new Date(b.modified_on || b.created_on || 0).getTime();
          return dateB - dateA; // Descending order
        });
        setLocalBreeds(breeds);
        addLog('info', `Loaded ${breeds.length} local breeds`);
      }
    } catch (error: any) {
      addLog('error', `Failed to load local: ${error.message}`);
    }
  };

  // Load remote breeds from Supabase
  const loadRemoteBreeds = async () => {
    try {
      const { data, error } = await supabase
        .from('breed')
        .select('*')
        .limit(20) // Show more records for better testing
        .order('modified_on', { ascending: false });
      
      if (error) throw error;
      
      setRemoteBreeds(data || []);
      addLog('info', `Loaded ${data?.length || 0} remote breeds`);
    } catch (error: any) {
      addLog('error', `Failed to load remote: ${error.message}`);
    }
  };

  // Initialize sync manager
  useEffect(() => {
    if (db && !simpleSync) {
      const sync = new SimpleTwoWaySync(db);
      setSimpleSync(sync);
      updateSyncStats(sync);
    }
  }, [db]);

  // Update sync stats
  const updateSyncStats = async (sync?: SimpleTwoWaySync) => {
    const s = sync || simpleSync;
    if (s) {
      const stats = await s.getSyncStats('breed', 'breed');
      setSyncStats(stats);
    }
  };

  // Manual push to Supabase
  const pushToSupabase = async () => {
    if (!simpleSync) return;
    
    setSyncStatus('syncing');
    addLog('info', 'Pushing to Supabase...');
    
    const result = await simpleSync.pushToSupabase('breed', 'breed');
    
    if (result.success) {
      addLog('success', `✅ Pushed ${result.pushed} documents`);
      setSyncStatus('synced');
    } else {
      addLog('error', `Push failed: ${result.error}`);
      setSyncStatus('error');
    }
    
    await loadRemoteBreeds();
    await updateSyncStats();
  };

  // Manual pull from Supabase
  const pullFromSupabase = async () => {
    if (!simpleSync) return;
    
    setSyncStatus('syncing');
    addLog('info', 'Pulling from Supabase...');
    
    const result = await simpleSync.pullFromSupabase('breed', 'breed');
    
    if (result.success) {
      addLog('success', `✅ Pulled ${result.pulled} documents`);
      setSyncStatus('synced');
    } else {
      addLog('error', `Pull failed: ${result.error}`);
      setSyncStatus('error');
    }
    
    await loadLocalBreeds();
    await updateSyncStats();
  };

  // Full sync
  const fullSync = async () => {
    if (!simpleSync) return;
    
    setSyncStatus('syncing');
    addLog('info', 'Starting full sync...');
    
    const result = await simpleSync.fullSync('breed', 'breed');
    
    if (result.success) {
      addLog('success', `✅ Sync complete! Pulled: ${result.pulled}, Pushed: ${result.pushed}`);
      setSyncStatus('synced');
    } else {
      addLog('error', 'Sync failed');
      setSyncStatus('error');
    }
    
    await loadLocalBreeds();
    await loadRemoteBreeds();
    await updateSyncStats();
  };

  // Toggle auto sync
  const toggleAutoSync = async () => {
    if (!simpleSync) return;
    
    if (autoSync) {
      // Stop auto sync
      simpleSync.stopAutoSync();
      setAutoSync(false);
      setSyncStatus('idle');
      addLog('info', 'Auto-sync stopped');
      
      // Clear refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } else {
      // Start auto sync with UI updates
      setSyncStatus('syncing');
      addLog('info', 'Starting auto-sync...');
      
      // Wait for initial sync to complete
      await simpleSync.startAutoSync('breed', 'breed', 5000);
      
      setAutoSync(true);
      setSyncStatus('synced');
      addLog('success', 'Auto-sync started (every 5s)');
      
      // Immediately load data after initial sync
      await loadLocalBreeds();
      await loadRemoteBreeds();
      await updateSyncStats();
      
      // Setup UI refresh every 2 seconds when auto-sync is active
      const interval = setInterval(() => {
        loadLocalBreeds();
        loadRemoteBreeds();
        updateSyncStats();
      }, 2000);
      setRefreshInterval(interval);
      
      // Subscribe to collection changes to update UI immediately
      if (db?.collections.breed) {
        db.collections.breed.$.subscribe(() => {
          loadLocalBreeds();
          loadRemoteBreeds();
          updateSyncStats();
        });
      }
    }
  };

  // Create conflict (edit same record locally and remotely)
  const createConflict = async () => {
    if (!db || localBreeds.length === 0) {
      addLog('warning', 'No local breeds to create conflict');
      return;
    }

    const breed = localBreeds[0];
    addLog('warning', `Creating conflict for: ${breed.name}`);

    try {
      // Edit locally
      const localEdit = {
        ...breed,
        name: breed.name + ' (Local Edit)',
        modified_on: new Date().toISOString()
      };
      await db.collections.breed.upsert(localEdit);
      addLog('info', 'Updated locally');

      // Edit remotely with slight delay
      setTimeout(async () => {
        const remoteEdit = {
          ...breed,
          name: breed.name + ' (Remote Edit)',
          modified_on: new Date(Date.now() + 1000).toISOString() // 1 second newer
        };
        
        const { error } = await supabase
          .from('breed')
          .upsert(remoteEdit);
        
        if (!error) {
          addLog('info', 'Updated remotely');
          addLog('warning', '⚠️ Conflict created! Watch resolution...');
        }
      }, 500);
    } catch (error: any) {
      addLog('error', `Failed to create conflict: ${error.message}`);
    }
  };

  // Add new breed locally
  const addLocalBreed = async () => {
    if (!db) return;

    // Generate proper UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const newBreed = {
      id: generateUUID(),
      name: `Test Breed ${Date.now()}`,
      admin_name: 'Test Admin',
      url: 'https://test.com',
      created_on: new Date().toISOString(),
      modified_on: new Date().toISOString()
    };

    try {
      await db.collections.breed.insert(newBreed);
      addLog('success', `Added local breed: ${newBreed.name}`);
      await loadLocalBreeds();
    } catch (error: any) {
      addLog('error', `Failed to add: ${error.message}`);
    }
  };

  // Add new breed remotely
  const addRemoteBreed = async () => {
    // Generate proper UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const newBreed = {
      id: generateUUID(),
      name: `Remote Breed ${Date.now()}`,
      admin_name: 'Remote Admin',
      url: 'https://remote.com',
      created_on: new Date().toISOString(),
      modified_on: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('breed')
        .insert(newBreed);
      
      if (error) throw error;
      
      addLog('success', `Added remote breed: ${newBreed.name}`);
      await loadRemoteBreeds();
    } catch (error: any) {
      addLog('error', `Failed to add remote: ${error.message}`);
    }
  };

  // Delete breed from both local and remote
  const deleteBreed = async (id: string, source: 'local' | 'remote') => {
    if (!simpleSync) return;
    
    try {
      if (source === 'local' || source === 'remote') {
        // Delete from both local and remote
        const result = await simpleSync.deleteEverywhere('breed', 'breed', id);
        
        if (result.success) {
          addLog('success', `Deleted ${id} from both sources`);
        } else {
          addLog('error', `Delete failed: ${result.error}`);
        }
      }
      
      await loadLocalBreeds();
      await loadRemoteBreeds();
      await updateSyncStats();
    } catch (error: any) {
      addLog('error', `Delete operation failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <RefreshCw className="w-8 h-8" />
            Two-Way Sync & Conflict Resolution
          </h1>
          <p className="text-lg text-gray-600">
            Real-time bidirectional sync between RxDB and Supabase with automatic conflict resolution
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
                syncStatus === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
                syncStatus === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {syncStatus === 'synced' ? <Check className="w-4 h-4" /> :
                 syncStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                 syncStatus === 'error' ? <X className="w-4 h-4" /> :
                 <Cloud className="w-4 h-4" />}
                <span className="font-medium">
                  {syncStatus === 'synced' ? 'Synced' :
                   syncStatus === 'syncing' ? 'Syncing...' :
                   syncStatus === 'error' ? 'Error' :
                   'Not Synced'}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                Local: {localBreeds.length} | Remote: {remoteBreeds.length}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={pullFromSupabase}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Pull
              </button>
              
              <button
                onClick={pushToSupabase}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Push
              </button>
              
              <button
                onClick={fullSync}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Full Sync
              </button>
              
              <button
                onClick={toggleAutoSync}
                className={`px-4 py-2 rounded ${
                  autoSync 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                {autoSync ? 'Stop Auto' : 'Start Auto'}
              </button>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={addLocalBreed}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Database className="w-4 h-4 inline mr-2" />
              Add Local
            </button>
            
            <button
              onClick={addRemoteBreed}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Cloud className="w-4 h-4 inline mr-2" />
              Add Remote
            </button>
            
            <button
              onClick={createConflict}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Create Conflict
            </button>
            
            <button
              onClick={() => {
                loadLocalBreeds();
                loadRemoteBreeds();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Data Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Local Data */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Local (RxDB)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {localBreeds.map(breed => (
                <div key={breed.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{breed.name}</div>
                      <div className="text-xs text-gray-600">
                        Modified: {new Date(breed.modified_on).toLocaleString()}
                      </div>
                      {breed._merged && (
                        <span className="text-xs bg-yellow-200 px-2 py-1 rounded mt-1 inline-block">
                          Merged
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBreed(breed.id, 'local')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remote Data */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Remote (Supabase)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {remoteBreeds.map(breed => (
                <div key={breed.id} className="p-3 bg-indigo-50 rounded border border-indigo-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{breed.name}</div>
                      <div className="text-xs text-gray-600">
                        Modified: {new Date(breed.modified_on).toLocaleString()}
                      </div>
                      {breed._sync_source === 'rxdb' && (
                        <span className="text-xs bg-green-200 px-2 py-1 rounded mt-1 inline-block">
                          From RxDB
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBreed(breed.id, 'remote')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Sync Logs:</h3>
          <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-2 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                <span className="text-gray-500">{log.time}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How it works:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Two-way sync:</strong> Changes in RxDB automatically sync to Supabase and vice versa</li>
            <li>• <strong>Real-time updates:</strong> Uses Supabase realtime subscriptions for instant sync</li>
            <li>• <strong>Conflict resolution:</strong> Last-Write-Wins (LWW) strategy with field merging</li>
            <li>• <strong>Offline support:</strong> Changes queue when offline and sync when reconnected</li>
            <li>• <strong>Loop prevention:</strong> Tracks sync source to avoid infinite loops</li>
          </ul>
        </div>
      </div>
    </div>
  );
}