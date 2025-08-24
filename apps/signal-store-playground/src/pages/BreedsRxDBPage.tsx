import React, { useState, useEffect } from 'react';
import { 
  databaseService,
  SupabaseReplicationService,
  BreedsList,
  BreedsListWithSignals,
  BreedDetail,
  useBreeds,
  breedsStore
} from '@breedhub/rxdb-store';
import { BreedDocType } from '@breedhub/rxdb-store';

// Supabase config (should be in env vars)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dev.dogarray.com:8020';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export function BreedsRxDBPage() {
  const [selectedBreed, setSelectedBreed] = useState<BreedDocType | null>(null);
  const [replicationState, setReplicationState] = useState<any>(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [useSignals, setUseSignals] = useState(true);

  const { updateBreed, deleteBreed } = useBreeds();

  // Initialize database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing RxDB database...');
        const db = await databaseService.getDatabase();
        console.log('Database initialized:', db);
        setDbInitialized(true);
      } catch (error: any) {
        console.error('Failed to initialize database:', error);
        
        // Auto-clear database on DXE1 error
        if (error.code === 'DXE1' || error.code === 'DB6') {
          console.log('Schema conflict detected, clearing database...');
          try {
            // First try using the databases() API if available
            if (indexedDB.databases) {
              const dbs = await indexedDB.databases();
              for (const db of dbs) {
                if (db.name && (db.name.includes('breedhub') || db.name.includes('rxdb'))) {
                  await indexedDB.deleteDatabase(db.name);
                  console.log('Deleted database:', db.name);
                }
              }
            } else {
              // Fallback: directly delete known database names
              const dbNames = [
                'rxdb-dexie-breedhub--0--_rxdb_internal',
                'rxdb-dexie-breedhub--1--breeds',
                'breedhub',
                '_rxdb_internal'
              ];
              for (const dbName of dbNames) {
                try {
                  await indexedDB.deleteDatabase(dbName);
                  console.log('Deleted database:', dbName);
                } catch (e) {
                  // Ignore if doesn't exist
                }
              }
            }
            // Reload page to start fresh
            window.location.reload();
          } catch (clearError) {
            console.error('Failed to clear database:', clearError);
            alert('Please manually clear browser data (IndexedDB) and reload the page.');
          }
        }
      }
    };

    initDatabase();
  }, []);

  // Setup replication when sync is enabled
  useEffect(() => {
    if (!dbInitialized || !syncEnabled) return;

    const setupReplication = async () => {
      try {
        console.log('[BreedsRxDBPage] Setting up Supabase replication...');
        
        // Use the store's enableSync method instead of creating service directly
        const state = await breedsStore.enableSync(SUPABASE_URL, SUPABASE_KEY);
        
        setReplicationState(state);
        
        console.log('[BreedsRxDBPage] Replication setup complete with auto-sync enabled.');
        
        // Wait a bit for sync to complete
        setTimeout(async () => {
          const db = await databaseService.getDatabase();
          const count = await db.breeds.count().exec();
          console.log('[BreedsRxDBPage] After sync delay, total breeds in RxDB:', count);
        }, 2000);
      } catch (error) {
        console.error('[BreedsRxDBPage] Failed to setup replication:', error);
      }
    };

    setupReplication();

    // Cleanup
    return () => {
      // Use store's disableSync method
      breedsStore.disableSync();
    };
  }, [dbInitialized, syncEnabled]);

  // Add test data
  const addTestData = async () => {
    try {
      const db = await databaseService.getDatabase();
      
      const testBreeds = [
        {
          id: `breed_${Date.now()}_1`,
          name: 'Labrador Retriever',
          description: 'Friendly and outgoing, Labs play well with others'
        },
        {
          id: `breed_${Date.now()}_2`,
          name: 'German Shepherd',
          description: 'Large, muscular dog with noble character and high intelligence'
        },
        {
          id: `breed_${Date.now()}_3`,
          name: 'Yorkshire Terrier',
          description: 'Small in size but big in personality'
        },
        {
          id: `breed_${Date.now()}_4`,
          name: 'Bulldog',
          description: 'Calm, courageous, and friendly'
        },
        {
          id: `breed_${Date.now()}_5`,
          name: 'Poodle',
          description: 'Intelligent and active'
        }
      ];

      for (const breed of testBreeds) {
        await db.breeds.upsert({
          ...breed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _deleted: false
        });
      }

      console.log('Test data added successfully');
    } catch (error) {
      console.error('Failed to add test data:', error);
    }
  };

  // Clear all data
  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all breeds data?')) {
      try {
        await databaseService.clearAllData();
        console.log('All data cleared');
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };

  // Remove database completely (for schema conflicts)
  const removeDatabase = async () => {
    if (window.confirm('This will completely remove the database. Are you sure?')) {
      try {
        // Try to remove via service
        await databaseService.removeDatabase();
        
        // Also directly clear all IndexedDB databases
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          console.log('Found databases:', dbs);
          
          // Delete ALL databases to clean up
          for (const db of dbs) {
            try {
              await indexedDB.deleteDatabase(db.name);
              console.log('Deleted database:', db.name);
            } catch (e) {
              console.error('Failed to delete:', db.name, e);
            }
          }
        } else {
          // Fallback - try to delete all possible versions
          console.log('Using fallback deletion method...');
          
          // Delete all possible version combinations
          for (let version = 0; version <= 10; version++) {
            const dbNames = [
              `rxdb-dexie-breedhub--${version}--_rxdb_internal`,
              `rxdb-dexie-breedhub--${version}--breeds`,
              `breedhub--${version}`,
              `_rxdb_internal--${version}`
            ];
            
            for (const dbName of dbNames) {
              try {
                await indexedDB.deleteDatabase(dbName);
                console.log('Deleted:', dbName);
              } catch (e) {
                // Ignore - database might not exist
              }
            }
          }
          
          // Also try base names without versions
          const baseNames = ['breedhub', '_rxdb_internal', 'rxdb-dexie-breedhub'];
          for (const name of baseNames) {
            try {
              await indexedDB.deleteDatabase(name);
              console.log('Deleted:', name);
            } catch (e) {
              // Ignore
            }
          }
        }
        
        console.log('All databases removed');
        alert('All databases have been cleared! The page will now reload.');
        window.location.reload();
      } catch (error) {
        console.error('Failed to remove database:', error);
      }
    }
  };

  // Diagnose empty breeds issue
  const diagnoseEmptyBreeds = async () => {
    try {
      const service = new SupabaseReplicationService({
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        batchSize: 5,
        pullInterval: 10000
      });
      
      await service.diagnoseEmptyBreeds();
      alert('Check console for diagnostic results');
    } catch (error) {
      console.error('Diagnose failed:', error);
      alert('Diagnose failed: ' + error.message);
    }
  };

  // Clean empty breeds from Supabase
  const cleanEmptyBreedsFromSupabase = async () => {
    if (window.confirm('Delete all empty breeds from Supabase?')) {
      try {
        const service = new SupabaseReplicationService({
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_KEY,
          batchSize: 5,
          pullInterval: 10000
        });
        
        const count = await service.deleteEmptyBreeds();
        alert(`Deleted ${count} empty breeds from Supabase`);
      } catch (error) {
        console.error('Failed to delete empty breeds:', error);
        alert('Error: ' + error.message);
      }
    }
  };


  // Clean ALL IndexedDB databases (aggressive cleanup)
  const cleanAllIndexedDB = async () => {
    if (window.confirm('This will delete ALL IndexedDB databases! Are you sure?')) {
      try {
        let deletedCount = 0;
        
        if (indexedDB.databases) {
          // Modern approach - get all databases
          const dbs = await indexedDB.databases();
          console.log(`Found ${dbs.length} databases to delete`);
          
          for (const db of dbs) {
            if (db.name) {
              try {
                await indexedDB.deleteDatabase(db.name);
                console.log('Deleted:', db.name);
                deletedCount++;
              } catch (e) {
                console.error('Failed to delete:', db.name, e);
              }
            }
          }
        } else {
          // Fallback for browsers without databases() support
          alert('Your browser does not support listing all databases. Using fallback method...');
          
          // Try to delete common RxDB patterns
          const patterns = [
            'rxdb-dexie-',
            'breedhub',
            '_rxdb_internal',
            'rxdb-',
            'dexie-'
          ];
          
          for (let i = 0; i <= 100; i++) {
            for (const pattern of patterns) {
              const dbName = `${pattern}${i}`;
              try {
                const deleteReq = indexedDB.deleteDatabase(dbName);
                await new Promise((resolve, reject) => {
                  deleteReq.onsuccess = resolve;
                  deleteReq.onerror = reject;
                });
                console.log('Deleted:', dbName);
                deletedCount++;
              } catch (e) {
                // Ignore - database doesn't exist
              }
            }
          }
        }
        
        alert(`Deleted ${deletedCount} databases. The page will now reload.`);
        window.location.reload();
      } catch (error) {
        console.error('Failed to clean IndexedDB:', error);
        alert('Error cleaning databases: ' + error.message);
      }
    }
  };

  if (!dbInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing RxDB database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">RxDB Breeds Demo</h1>
      
      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(e) => setSyncEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Enable Supabase Sync</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useSignals}
                onChange={(e) => setUseSignals(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-blue-600 font-semibold">⚡ Use Preact Signals</span>
            </label>
            
            {syncEnabled && (
              <div className="text-sm text-gray-600">
                {replicationState ? '✅ Sync Active' : '⏳ Connecting...'}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addTestData}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add Test Data
            </button>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All Data
            </button>
            <button
              onClick={removeDatabase}
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              title="Use this if you get schema errors"
            >
              Reset DB
            </button>
            <button
              onClick={cleanAllIndexedDB}
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-bold"
              title="Delete ALL IndexedDB databases"
            >
              🗑️ Clean ALL DBs
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Database: IndexedDB (via Dexie)</p>
          <p>Sync: {syncEnabled ? 'Supabase Replication' : 'Local Only'}</p>
          <p>Offline: ✅ Full offline support with automatic sync</p>
        </div>
        
        {/* Supabase cleanup buttons */}
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs font-bold text-yellow-800 mb-2">⚠️ Supabase Cleanup (Use with caution!)</p>
          <div className="flex gap-2">
            <button
              onClick={diagnoseEmptyBreeds}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            >
              Diagnose Issue
            </button>
            <button
              onClick={cleanEmptyBreedsFromSupabase}
              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
            >
              Delete Empty Breeds (Batch)
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breeds list */}
        <div>
          {useSignals ? (
            <BreedsListWithSignals
              onBreedSelect={setSelectedBreed}
            />
          ) : (
            <BreedsList
              onBreedSelect={setSelectedBreed}
              replicationState={replicationState}
            />
          )}
        </div>

        {/* Breed detail */}
        <div>
          {selectedBreed ? (
            <BreedDetail
              breed={selectedBreed}
              onUpdate={updateBreed}
              onDelete={deleteBreed}
              onClose={() => setSelectedBreed(null)}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              Select a breed to view details
            </div>
          )}
        </div>
      </div>

      {/* Features showcase */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🚀 RxDB Features Demonstrated:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Reactive data with automatic UI updates</li>
          <li>✅ Full offline support with IndexedDB</li>
          <li>✅ Two-way Supabase synchronization</li>
          <li>✅ Real-time updates via Supabase channels</li>
          <li>✅ Conflict resolution (last-write-wins)</li>
          <li>✅ Soft delete with _deleted field</li>
          <li>✅ TypeScript support throughout</li>
          <li>✅ React hooks for easy integration</li>
          <li className="text-blue-700 font-semibold">⚡ Preact Signals for fine-grained reactivity</li>
        </ul>
      </div>
    </div>
  );
}