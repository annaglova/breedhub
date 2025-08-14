import React, { useEffect } from 'react';
import { useBreedStore, breedSelectors, generateMockBreeds } from './breed-store';
import { useIndexedDBSync } from '../sync/indexed-db-sync';
import { superStoreFactory } from '../core/super-store';

/**
 * Example component demonstrating SignalStore usage
 */
export function BreedStoreExample() {
  const store = useBreedStore();
  
  // Selectors
  const allBreeds = breedSelectors.useAllEntities();
  const filteredBreeds = breedSelectors.useFilteredEntities();
  const selectedBreed = breedSelectors.useSelectedEntity();
  const isLoading = breedSelectors.useIsLoading();
  const error = breedSelectors.useError();
  const totalCount = breedSelectors.useTotalCount();
  const filteredCount = breedSelectors.useFilteredCount();
  
  // IndexedDB sync
  const { syncState, syncNow } = useIndexedDBSync(
    {
      dbName: 'BreedHub',
      storeName: 'breeds',
      version: 1,
      indexes: [
        { name: 'by_origin', keyPath: 'origin' },
        { name: 'by_popularity', keyPath: 'popularity' },
      ],
    },
    allBreeds,
    (breeds) => {
      store.setAllEntities(breeds);
    }
  );
  
  // Initialize with mock data
  useEffect(() => {
    if (allBreeds.length === 0) {
      const mockBreeds = generateMockBreeds(20);
      store.setAllEntities(mockBreeds);
    }
  }, []);
  
  // Create hierarchical stores example
  useEffect(() => {
    // Create root store for all breeds
    const rootStore = superStoreFactory.createStore({
      id: 'breeds-root',
      entityName: 'Breed',
      children: [
        {
          id: 'breeds-popular',
          entityName: 'Breed',
        },
        {
          id: 'breeds-recent',
          entityName: 'Breed',
        },
      ],
    });
    
    // Update child stores based on filters
    superStoreFactory.updateStore('breeds-popular', (state) => {
      state.filters = [{
        field: 'popularity',
        operator: 'gte',
        value: 80,
        active: true,
      }];
    });
    
    return () => {
      superStoreFactory.destroyStore('breeds-root');
    };
  }, []);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.searchBreeds(e.target.value);
  };
  
  const handleFilterByOrigin = (origin: string) => {
    store.filterByOrigin(origin);
  };
  
  const handleCreateBreed = async () => {
    try {
      await store.createBreed({
        name: 'New Breed',
        description: 'A new breed created for testing',
        origin: 'Test Land',
        temperament: ['Friendly', 'Test'],
        lifeSpan: '10-15 years',
        weight: { min: 30, max: 50 },
        height: { min: 50, max: 70 },
        colors: ['Test Color'],
        popularity: 50,
      });
    } catch (error) {
      console.error('Failed to create breed:', error);
    }
  };
  
  const handleSync = async () => {
    await syncNow(
      // Remote fetch
      async () => {
        const response = await fetch('/api/breeds');
        return response.json();
      },
      // Remote push
      async (changes) => {
        await fetch('/api/breeds/sync', {
          method: 'POST',
          body: JSON.stringify(changes),
        });
      }
    );
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">React SignalStore Example - Breeds</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">Total Breeds</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">Filtered</div>
            <div className="text-2xl font-bold">{filteredCount}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">Sync Status</div>
            <div className="text-sm font-medium">{syncState.syncStatus}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">Pending Changes</div>
            <div className="text-2xl font-bold">{syncState.pendingChanges}</div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search breeds..."
            onChange={handleSearch}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <select
            onChange={(e) => handleFilterByOrigin(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Origins</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="England">England</option>
            <option value="USA">USA</option>
          </select>
          <button
            onClick={handleCreateBreed}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add Breed
          </button>
          <button
            onClick={handleSync}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Sync with Server
          </button>
          <button
            onClick={() => store.clearFilters()}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className="mt-2 text-gray-600">Loading breeds...</div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error.message}
          </div>
        )}
        
        {/* Breeds Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBreeds.map((breed) => (
              <div
                key={breed.id}
                onClick={() => store.selectEntity(breed.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedBreed?.id === breed.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {breed.imageUrl && (
                  <img
                    src={breed.imageUrl}
                    alt={breed.name}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg">{breed.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{breed.origin}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{breed.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {breed.temperament.slice(0, 3).map((temp) => (
                    <span
                      key={temp}
                      className="px-2 py-1 bg-gray-100 text-xs rounded"
                    >
                      {temp}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Popularity: {breed.popularity}%
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Selected Breed Details */}
        {selectedBreed && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Selected: {selectedBreed.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Origin:</strong> {selectedBreed.origin}
              </div>
              <div>
                <strong>Life Span:</strong> {selectedBreed.lifeSpan}
              </div>
              <div>
                <strong>Weight:</strong> {selectedBreed.weight.min}-{selectedBreed.weight.max} kg
              </div>
              <div>
                <strong>Height:</strong> {selectedBreed.height.min}-{selectedBreed.height.max} cm
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}