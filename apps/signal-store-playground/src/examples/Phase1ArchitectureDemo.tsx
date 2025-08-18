import React, { useEffect, useState } from 'react';
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { addRxPlugin } from 'rxdb';

// Import our new Phase 1.0 services
import { CollectionService } from '../../../../packages/rxdb-store/src/services/collection.service';
import { BreedService } from '../../../../packages/rxdb-store/src/services/breed.service';
import { LazyCollectionLoader, getCollectionLoader } from '../../../../packages/rxdb-store/src/services/lazy-collection-loader';
import { ConfigurationManager } from '../../../../packages/rxdb-store/src/services/configuration-manager';
import { breedSchema, type Breed } from '../../../../packages/rxdb-store/src/schemas/breed.schema';
import { dogSchema, type Dog } from '../../../../packages/rxdb-store/src/schemas/dog.schema';
import { cleanupOldDatabases, cleanAllRxDBDatabases } from '../utils/cleanup-databases';
import { DatabaseStructure } from '../components/DatabaseStructure';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);

// Sample breed data
const sampleBreeds: Partial<Breed>[] = [
  {
    id: 'golden-retriever',
    name: 'Golden Retriever',
    description: 'Friendly and intelligent',
    group: 'Sporting',
    size: 'large',
    traits: ['friendly', 'intelligent', 'loyal'],
    temperament: ['gentle', 'confident'],
    lifeSpan: { min: 10, max: 12 },
    weight: { min: 55, max: 75 },
    colors: ['golden', 'cream']
  },
  {
    id: 'french-bulldog',
    name: 'French Bulldog',
    description: 'Adaptable companion',
    group: 'Non-Sporting',
    size: 'small',
    traits: ['adaptable', 'playful'],
    temperament: ['easygoing', 'sociable'],
    lifeSpan: { min: 10, max: 12 },
    weight: { min: 16, max: 28 },
    colors: ['brindle', 'fawn', 'white']
  },
  {
    id: 'german-shepherd',
    name: 'German Shepherd',
    description: 'Versatile working dog',
    group: 'Herding',
    size: 'large',
    traits: ['intelligent', 'versatile', 'loyal'],
    temperament: ['confident', 'courageous'],
    lifeSpan: { min: 9, max: 13 },
    weight: { min: 50, max: 90 },
    colors: ['black and tan', 'sable']
  }
];

export function Phase1ArchitectureDemo() {
  const [status, setStatus] = useState('Initializing...');
  const [db, setDb] = useState<any>(null);
  const [breedService, setBreedService] = useState<BreedService | null>(null);
  const [loader, setLoader] = useState<LazyCollectionLoader | null>(null);
  const [configManager, setConfigManager] = useState<ConfigurationManager | null>(null);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [loadingStates, setLoadingStates] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    initializePhase1();
  }, []);

  async function initializePhase1() {
    try {
      setStatus('Cleaning up old databases...');
      
      // Clean up old test databases first
      await cleanupOldDatabases('phase1-stable');
      
      setStatus('Setting up Configuration Manager...');
      
      // 1. Configuration Manager
      const config = ConfigurationManager.forEnvironment('development');
      setConfigManager(config);
      
      // 2. Create database with configuration
      setStatus('Creating database...');
      // Use stable name for persistent database
      const dbName = 'phase1-stable-demo';
      const dbConfig = config.getDatabaseConfig();
      
      // Check if database already exists
      let database;
      try {
        database = await createRxDatabase({
          ...dbConfig,
          name: dbName,
          ignoreDuplicate: true // Reuse existing database
        });
      } catch (error: any) {
        // If DB exists error, try to remove and recreate
        console.log('Database exists, removing and recreating...');
        const { removeRxDatabase } = await import('rxdb');
        await removeRxDatabase(dbName, getRxStorageDexie());
        
        database = await createRxDatabase({
          ...dbConfig,
          name: dbName
        });
      }
      setDb(database);
      
      // 3. Lazy Collection Loader
      setStatus('Setting up Lazy Collection Loader...');
      const collectionLoader = getCollectionLoader(database);
      setLoader(collectionLoader);
      
      // Register breed collection configuration
      collectionLoader.registerCollection({
        name: 'breeds',
        schema: breedSchema,
        autoLoad: true // Auto-load since it's our main collection
      });
      
      // Register dogs collection (lazy load)
      collectionLoader.registerCollection({
        name: 'dogs',
        schema: dogSchema,
        autoLoad: false // Will be loaded on demand
      });
      
      // Subscribe to loading states
      const interval = setInterval(() => {
        if (collectionLoader) {
          setLoadingStates(new Map(collectionLoader.loadingStates.value));
        }
      }, 100);
      
      // 4. Load breed collection
      setStatus('Loading breed collection...');
      const breedCollection = await collectionLoader.loadCollection<Breed>('breeds');
      
      // 5. Create Breed Service
      setStatus('Creating Breed Service...');
      const service = new BreedService(breedCollection);
      setBreedService(service);
      
      // Add sample data
      const timestamp = new Date().toISOString();
      const breedsWithTimestamps = sampleBreeds.map(breed => ({
        ...breed,
        createdAt: timestamp,
        updatedAt: timestamp
      })) as Breed[];
      
      await service.insert(breedsWithTimestamps);
      
      // Subscribe to breed changes
      service.items.subscribe(items => {
        setBreeds(items);
      });
      
      setStatus('✅ Phase 1.0 Architecture Ready!');
      
      return () => {
        clearInterval(interval);
        service?.destroy();
        database?.destroy();
      };
      
    } catch (error: any) {
      console.error('Phase 1.0 setup error:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  }

  const handleSearch = async () => {
    if (!breedService || !searchQuery) return;
    
    const results = await breedService.searchBreeds(searchQuery);
    setBreeds(results);
  };

  const handleSizeFilter = async (size: string) => {
    if (!breedService) return;
    
    setSelectedSize(size);
    
    if (size) {
      const results = await breedService.findBySize(size as any);
      setBreeds(results);
    } else {
      // Reset to all breeds
      const allBreeds = await breedService.find();
      setBreeds(allBreeds);
    }
  };

  const addRandomBreed = async () => {
    if (!breedService) return;
    
    const randomBreed: Breed = {
      id: `breed-${Date.now()}`,
      name: `Test Breed ${Date.now()}`,
      description: 'A test breed for demo',
      size: ['small', 'medium', 'large', 'giant'][Math.floor(Math.random() * 4)] as any,
      group: 'Miscellaneous',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await breedService.insert(randomBreed);
  };

  const preloadCollections = async (route: string) => {
    if (!loader) return;
    await loader.preloadForRoute(route);
  };

  const handleCleanupDatabases = async () => {
    if (confirm('This will delete ALL RxDB databases. Are you sure?')) {
      setStatus('Cleaning all databases...');
      const cleaned = await cleanAllRxDBDatabases();
      setStatus(`Cleaned ${cleaned} databases. Please refresh the page.`);
      
      // Reset state
      setDb(null);
      setBreedService(null);
      setLoader(null);
      setBreeds([]);
    }
  };
  
  const handleCleanDogsCollection = async () => {
    if (db && confirm('This will delete the dogs collection. Continue?')) {
      try {
        // Remove just the dogs collection database
        const dogsDbName = db.name + '--0--dogs';
        await indexedDB.deleteDatabase(dogsDbName);
        setStatus('Dogs collection cleared. Try preloading again.');
        
        // Reset loader to re-register collections
        if (loader) {
          loader.unloadCollection('dogs');
        }
      } catch (error) {
        console.error('Error cleaning dogs collection:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">🏗️ Phase 1.0: Architecture Improvements</h2>
      
      {/* Status */}
      <div className="mb-6 p-3 bg-gray-100 rounded flex justify-between items-center">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <button
          onClick={handleCleanupDatabases}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          title="Delete ALL RxDB databases"
        >
          🗑️ Clean All DBs
        </button>
      </div>
      
      {/* Database Structure Visualization */}
      {db && (
        <DatabaseStructure dbName={db.name} />
      )}
      
      {/* Configuration Manager Info */}
      {configManager && db && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">📋 Configuration Manager</h3>
          <div className="text-sm space-y-1">
            <div>Environment: {configManager.getEnvironment()}</div>
            <div>Debug Mode: {configManager.isDebugMode() ? 'Yes' : 'No'}</div>
            <div>Database: {configManager.getConfig().database.name}</div>
            <div>Storage: {configManager.getConfig().database.storage}</div>
            <div className="mt-2 pt-2 border-t">
              <strong>RxDB Info:</strong>
              <div>Database Name: {db.name}</div>
              <div>Collections: {Object.keys(db.collections).join(', ') || 'none'}</div>
              <div className="text-xs text-gray-600 mt-1">
                Note: RxDB creates separate IndexedDB for each collection for performance
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lazy Loading States */}
      {loadingStates.size > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded">
          <h3 className="font-bold mb-2">📦 Lazy Collection Loader</h3>
          <div className="text-sm space-y-1">
            {Array.from(loadingStates.entries()).map(([name, state]) => (
              <div key={name} className="flex items-center gap-2">
                <span>{name}:</span>
                {state.loading && <span className="text-yellow-600">Loading...</span>}
                {state.loaded && <span className="text-green-600">✅ Loaded</span>}
                {state.error && <span className="text-red-600">❌ Error</span>}
              </div>
            ))}
          </div>
          
          {/* Route Preloading */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => preloadCollections('/breeds')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Preload /breeds
            </button>
            <button
              onClick={() => preloadCollections('/dogs')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Preload /dogs
            </button>
            <button
              onClick={handleCleanDogsCollection}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
              title="Clear dogs collection if there's an error"
            >
              Clear Dogs DB
            </button>
          </div>
        </div>
      )}
      
      {/* Breed Service Demo */}
      {breedService && (
        <div className="space-y-4">
          <h3 className="font-bold">🐕 Breed Service Demo</h3>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <span>Total: {breedService.count.value}</span>
            <span>Groups: {breedService.breedsByGroup.value.size}</span>
            <span>Loading: {breedService.loading.value ? 'Yes' : 'No'}</span>
          </div>
          
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search breeds..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Search
            </button>
          </div>
          
          {/* Size Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSizeFilter('')}
              className={`px-3 py-1 rounded ${!selectedSize ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            {['small', 'medium', 'large', 'giant'].map(size => (
              <button
                key={size}
                onClick={() => handleSizeFilter(size)}
                className={`px-3 py-1 rounded ${selectedSize === size ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {size}
              </button>
            ))}
          </div>
          
          {/* Actions */}
          <button
            onClick={addRandomBreed}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Add Random Breed
          </button>
          
          {/* Breed List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {breeds.map(breed => (
              <div key={breed.id} className="p-3 bg-gray-50 rounded">
                <div className="font-semibold">{breed.name}</div>
                <div className="text-sm text-gray-600">
                  {breed.group} • {breed.size} • {breed.traits?.join(', ')}
                </div>
                <div className="text-xs text-gray-400">
                  {breed.updatedAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}