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
  const [replicationService, setReplicationService] = useState<SupabaseReplicationService | null>(null);
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
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initDatabase();
  }, []);

  // Setup replication when sync is enabled
  useEffect(() => {
    if (!dbInitialized || !syncEnabled) return;

    const setupReplication = async () => {
      try {
        console.log('Setting up Supabase replication...');
        
        const service = new SupabaseReplicationService({
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_KEY,
          batchSize: 5,
          pullInterval: 10000 // 10 seconds
        });

        const db = await databaseService.getDatabase();
        const state = await service.setupBreedsReplication(db.breeds);
        
        setReplicationService(service);
        setReplicationState(state);
        
        console.log('Replication setup complete');
      } catch (error) {
        console.error('Failed to setup replication:', error);
      }
    };

    setupReplication();

    // Cleanup
    return () => {
      if (replicationService) {
        replicationService.stopAllReplications();
      }
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
          description: 'Friendly and outgoing, Labs play well with others',
          origin: 'Canada',
          size: 'large' as const,
          lifespan: { min: 10, max: 12 },
          traits: ['Friendly', 'Active', 'Outgoing'],
          colors: ['Yellow', 'Black', 'Chocolate']
        },
        {
          id: `breed_${Date.now()}_2`,
          name: 'German Shepherd',
          description: 'Large, muscular dog with noble character and high intelligence',
          origin: 'Germany',
          size: 'large' as const,
          lifespan: { min: 9, max: 13 },
          traits: ['Confident', 'Courageous', 'Smart'],
          colors: ['Black and Tan', 'Sable', 'Black']
        },
        {
          id: `breed_${Date.now()}_3`,
          name: 'Yorkshire Terrier',
          description: 'Small in size but big in personality',
          origin: 'England',
          size: 'toy' as const,
          lifespan: { min: 13, max: 16 },
          traits: ['Affectionate', 'Sprightly', 'Tomboyish'],
          colors: ['Blue and Tan', 'Black and Tan']
        }
      ];

      for (const breed of testBreeds) {
        await db.breeds.insert({
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
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Database: IndexedDB (via Dexie)</p>
          <p>Sync: {syncEnabled ? 'Supabase Replication' : 'Local Only'}</p>
          <p>Offline: ✅ Full offline support with automatic sync</p>
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