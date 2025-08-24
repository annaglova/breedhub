import React, { useState } from 'react';
import { useBreedsSignals } from '../hooks/useBreedsSignals';
import { BreedDocType } from '../types/breed.types';
import { SyncStatusIndicator } from '../hooks/useReplicationState';

export interface BreedsListWithSignalsProps {
  workspaceId?: string;
  spaceId?: string;
  onBreedSelect?: (breed: BreedDocType) => void;
}

/**
 * Breeds list component using Preact Signals
 * Automatically re-renders when data changes without useState/useEffect
 */
export function BreedsListWithSignals({ 
  workspaceId, 
  spaceId, 
  onBreedSelect
}: BreedsListWithSignalsProps) {
  const {
    breeds,
    breedsCount,
    loading,
    error,
    replicationState,
    addBreed,
    deleteBreed,
    searchBreeds,
    setFilter,
    clearFilter
  } = useBreedsSignals();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBreedData, setNewBreedData] = useState<Partial<BreedDocType>>({
    name: '',
    description: ''
  });
  // No pagination - just show top 20

  const handleAddBreed = async () => {
    try {
      await addBreed({
        ...newBreedData,
        workspaceId,
        spaceId
      });
      setIsAddingNew(false);
      setNewBreedData({ name: '', description: '' });
    } catch (err) {
      console.error('Failed to add breed:', err);
    }
  };

  const handleSearch = () => {
    if (searchQuery) {
      // Set filter for reactive updates
      setFilter({
        selector: {
          name: { $regex: new RegExp(searchQuery, 'i') }
        }
      });
    } else {
      clearFilter();
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading breeds: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with sync status and count */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Dog Breeds</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {breedsCount} breeds
          </span>
        </div>
        {replicationState && (
          <SyncStatusIndicator replicationState={replicationState} />
        )}
      </div>

      {/* Reactive info banner */}
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
        <div className="flex items-center gap-2">
          <span className="text-blue-700 font-semibold">⚡ Signals Active</span>
          <span className="text-blue-600 text-sm">
            UI updates automatically with data changes - no useState needed!
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search breeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                clearFilter();
              }}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        

        <button
          onClick={() => setIsAddingNew(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Breed
        </button>
      </div>

      {/* Add new breed form */}
      {isAddingNew && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-3">Add New Breed</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Breed name"
              value={newBreedData.name}
              onChange={(e) => setNewBreedData({ ...newBreedData, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Description"
              value={newBreedData.description}
              onChange={(e) => setNewBreedData({ ...newBreedData, description: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddBreed}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Showing count */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Showing top {Math.min(20, breeds.length)} of {breeds.length} breeds
        </div>
      </div>

      {/* Breeds grid - automatically updates with signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds
          .slice(0, 20)  // Just show top 20
          .map((breed) => (
          <div
            key={breed.id}
            onClick={() => onBreedSelect?.(breed.toJSON())}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 cursor-pointer"
          >
            <div className="mb-2">
              <h3 className="text-lg font-semibold">
                {breed.name || breed.id.substring(0, 8) + '...'}
              </h3>
            </div>
            
            {breed.description && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {breed.description}
              </p>
            )}
            
            
            {breed.updatedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Updated: {new Date(breed.updatedAt).toLocaleDateString('uk-UA')} {new Date(breed.updatedAt).toLocaleTimeString('uk-UA')}
              </p>
            )}

            {breed.traits && breed.traits.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {breed.traits.slice(0, 3).map((trait, i) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {trait}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBreed(breed.id);
                }}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {breeds.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No breeds found. Add your first breed!
        </div>
      )}
    </div>
  );
}