import React, { useEffect, useState } from 'react';
import { 
  createBreedHubDB,
  RxDBSignalStore,
  type BreedHubDatabase,
  type Breed
} from '@breedhub/rxdb-store';

export function RxDBExample() {
  const [db, setDb] = useState<BreedHubDatabase | null>(null);
  const [breedStore, setBreedStore] = useState<RxDBSignalStore<Breed> | null>(null);
  const [newBreedName, setNewBreedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Initialize database
  useEffect(() => {
    async function initDB() {
      try {
        console.log('🚀 Initializing RxDB...');
        // Use unique database name to avoid conflicts
        const dbName = `breedhub-playground-${Date.now()}`;
        const database = await createBreedHubDB(dbName);
        setDb(database);
        
        // Create breed store
        const store = new RxDBSignalStore(database.breeds);
        setBreedStore(store);
        
        console.log('✅ RxDB initialized successfully!');
      } catch (err) {
        console.error('❌ Failed to initialize RxDB:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    initDB();
    
    // Cleanup on unmount
    return () => {
      if (db) {
        console.log('🧹 Cleaning up RxDB...');
        db.destroy().catch(console.error);
        setDb(null);
        setBreedStore(null);
      }
    };
  }, []);

  // Test data
  const sampleBreeds: Partial<Breed>[] = [
    {
      id: 'labrador',
      name: 'Labrador Retriever',
      description: 'Friendly and outgoing, the Labrador Retriever is one of the most popular dog breeds.',
      traits: ['friendly', 'outgoing', 'active'],
      origin: 'Canada',
      size: 'large',
      temperament: ['friendly', 'loyal', 'energetic'],
      lifeSpan: '10-14 years',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'golden-retriever',
      name: 'Golden Retriever',
      description: 'A Scottish breed of retriever dog of medium size.',
      traits: ['intelligent', 'friendly', 'devoted'],
      origin: 'Scotland',
      size: 'large',
      temperament: ['intelligent', 'friendly', 'devoted'],
      lifeSpan: '10-12 years',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'poodle',
      name: 'Poodle',
      description: 'Poodles are exceptional jumpers, so pet parents should ensure their yards are fenced.',
      traits: ['intelligent', 'active', 'elegant'],
      origin: 'Germany',
      size: 'medium',
      temperament: ['intelligent', 'active', 'alert'],
      lifeSpan: '12-15 years',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  const addSampleData = async () => {
    if (!breedStore) return;
    
    try {
      console.log('📝 Adding sample breeds...');
      const count = await breedStore.bulkInsert(sampleBreeds as Breed[]);
      console.log(`✅ Added ${count} sample breeds`);
    } catch (err) {
      console.error('❌ Failed to add sample data:', err);
    }
  };

  const addNewBreed = async () => {
    if (!breedStore || !newBreedName.trim()) return;
    
    const newBreed: Partial<Breed> = {
      id: newBreedName.toLowerCase().replace(/\s+/g, '-'),
      name: newBreedName,
      traits: ['friendly'],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const success = await breedStore.create(newBreed);
    if (success) {
      setNewBreedName('');
      console.log('✅ Breed added successfully');
    }
  };

  const deleteBreed = async (id: string) => {
    if (!breedStore) return;
    
    const success = await breedStore.delete(id);
    if (success) {
      console.log(`✅ Breed ${id} deleted`);
    }
  };

  const resetDatabase = async () => {
    setIsResetting(true);
    setError(null);
    
    try {
      console.log('🔄 Resetting database...');
      
      // Destroy current database
      if (db) {
        await db.destroy();
        setDb(null);
        setBreedStore(null);
      }
      
      // Clear all IndexedDB databases
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const database of databases) {
          if (database.name?.startsWith('breedhub')) {
            console.log(`🗑️ Deleting: ${database.name}`);
            await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(database.name!);
              deleteReq.onsuccess = () => resolve(undefined);
              deleteReq.onerror = () => reject(deleteReq.error);
            });
          }
        }
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize
      const dbName = `breedhub-playground-${Date.now()}`;
      const database = await createBreedHubDB(dbName);
      setDb(database);
      
      const store = new RxDBSignalStore(database.breeds);
      setBreedStore(store);
      
      console.log('✅ Database reset successfully!');
    } catch (err) {
      console.error('❌ Reset failed:', err);
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">RxDB Error</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!db || !breedStore) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-bold text-blue-800 mb-2">Initializing RxDB...</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-blue-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-blue-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Get reactive data from signals
  const breeds = breedStore.items.value;
  const loading = breedStore.loading.value;
  const storeError = breedStore.error.value;
  const count = breedStore.count.value;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">🗄️ RxDB + Signals Demo</h2>
        
        {/* Status */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-600">Status</div>
            <div className="font-bold text-green-800">Connected</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-600">Total Breeds</div>
            <div className="font-bold text-blue-800">{count}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-sm text-purple-600">Loading</div>
            <div className="font-bold text-purple-800">{loading ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Error display */}
        {storeError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <div className="text-red-800 font-semibold">Error:</div>
            <div className="text-red-700">{storeError.message}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={addSampleData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            Add Sample Data
          </button>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newBreedName}
              onChange={(e) => setNewBreedName(e.target.value)}
              placeholder="Enter breed name"
              className="px-3 py-2 border rounded"
              disabled={loading}
            />
            <button
              onClick={addNewBreed}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={loading || !newBreedName.trim()}
            >
              Add Breed
            </button>
          </div>
        </div>

        {/* Breeds List */}
        <div className="border rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-semibold">Breeds ({count})</h3>
          </div>
          
          {breeds.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No breeds found. Add some sample data to get started!
            </div>
          ) : (
            <div className="divide-y">
              {breeds.map((breed) => (
                <div key={breed.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{breed.name}</h4>
                      {breed.description && (
                        <p className="text-gray-600 mt-1">{breed.description}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {breed.size && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {breed.size}
                          </span>
                        )}
                        {breed.origin && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {breed.origin}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {breed.traits.map((trait, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBreed(breed.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            🔧 Debug Info
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify({
              dbName: db.name,
              collections: Object.keys(db.collections),
              breedsCount: count,
              loading,
              hasError: !!storeError,
              lastUpdated: breedStore.lastUpdated.value
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}