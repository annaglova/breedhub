/**
 * Example React component using RxDB hooks
 * Demonstrates best practices from official RxDB examples
 */

import React, { useState } from 'react';
import { useBreeds, useBreedSearch, useBreedStats } from '@breedhub/rxdb-store/hooks/useBreeds';
import { useOfflineQueue, useReplicationState } from '@breedhub/rxdb-store/hooks/useRxCollection';

export function RxDBReactExample() {
  const [showStats, setShowStats] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  
  // Use breed hooks
  const {
    breeds,
    loading,
    error,
    addBreed,
    updateBreed,
    deleteBreed,
    origins,
    allTraits
  } = useBreeds({
    origin: selectedOrigin || undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // Search functionality
  const {
    breeds: searchResults,
    searchTerm,
    setSearchTerm,
    isSearching
  } = useBreedSearch();
  
  // Statistics
  const { stats } = useBreedStats();
  
  // Offline/Online status
  const { isOnline, hasOfflineChanges, queueSize } = useOfflineQueue();
  
  // Handle breed creation
  const handleAddBreed = async () => {
    const name = prompt('Enter breed name:');
    if (!name) return;
    
    try {
      await addBreed({
        name,
        description: `Description for ${name}`,
        origin: 'Unknown',
        traits: ['friendly', 'loyal']
      });
      console.log('Breed added successfully');
    } catch (err) {
      console.error('Failed to add breed:', err);
    }
  };
  
  // Handle breed update
  const handleUpdateBreed = async (breedId: string, currentName: string) => {
    const newName = prompt('Enter new name:', currentName);
    if (!newName || newName === currentName) return;
    
    try {
      await updateBreed(breedId, { name: newName });
      console.log('Breed updated successfully');
    } catch (err) {
      console.error('Failed to update breed:', err);
    }
  };
  
  // Handle breed deletion
  const handleDeleteBreed = async (breedId: string, breedName: string) => {
    if (!confirm(`Delete breed "${breedName}"?`)) return;
    
    try {
      await deleteBreed(breedId);
      console.log('Breed deleted successfully');
    } catch (err) {
      console.error('Failed to delete breed:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Status Bar */}
      <div className="mb-4 flex items-center justify-between bg-gray-100 p-3 rounded">
        <div className="flex items-center gap-4">
          <span className={`px-2 py-1 rounded text-sm ${
            isOnline ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
          }`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          
          {hasOfflineChanges && (
            <span className="text-orange-600 text-sm">
              {queueSize} changes pending sync
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowStats(!showStats)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showStats ? 'Hide' : 'Show'} Stats
        </button>
      </div>
      
      {/* Statistics Panel */}
      {showStats && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">📊 Breed Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.totalBreeds}</div>
              <div className="text-sm text-gray-600">Total Breeds</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.avgTraitsPerBreed}</div>
              <div className="text-sm text-gray-600">Avg Traits/Breed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.mostCommonOrigin || 'N/A'}</div>
              <div className="text-sm text-gray-600">Most Common Origin</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{origins.length}</div>
              <div className="text-sm text-gray-600">Unique Origins</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search breeds..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={selectedOrigin}
          onChange={(e) => setSelectedOrigin(e.target.value)}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Origins</option>
          {origins.map(origin => (
            <option key={origin} value={origin}>{origin}</option>
          ))}
        </select>
        
        <button
          onClick={handleAddBreed}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + Add Breed
        </button>
      </div>
      
      {/* Search indicator */}
      {isSearching && (
        <div className="mb-2 text-sm text-gray-500">Searching...</div>
      )}
      
      {/* Breeds List */}
      <div className="space-y-2">
        {(searchTerm ? searchResults : breeds).map((breed) => (
          <div
            key={breed.id}
            className="p-4 bg-white border rounded hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{breed.name}</h3>
                <p className="text-gray-600 text-sm mb-1">
                  Origin: {breed.origin || 'Unknown'}
                </p>
                {breed.description && (
                  <p className="text-gray-700 mb-2">{breed.description}</p>
                )}
                {breed.traits && breed.traits.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {breed.traits.map((trait, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Updated: {new Date(breed.updated_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleUpdateBreed(breed.id, breed.name)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteBreed(breed.id, breed.name)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {breeds.length === 0 && !searchTerm && (
          <div className="text-center py-8 text-gray-500">
            No breeds found. Add your first breed!
          </div>
        )}
        
        {searchTerm && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No breeds found matching "{searchTerm}"
          </div>
        )}
      </div>
      
      {/* All Traits Cloud */}
      {allTraits.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-3">All Traits</h3>
          <div className="flex gap-2 flex-wrap">
            {allTraits.map(trait => (
              <span
                key={trait}
                className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-100 cursor-pointer"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export for playground
export default RxDBReactExample;