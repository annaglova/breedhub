import React, { useState } from 'react';
import { useBreeds } from '../hooks/useBreeds';
import { BreedDocType } from '../types/breed.types';
import { SyncStatusIndicator } from '../hooks/useReplicationState';

export interface BreedsListProps {
  workspaceId?: string;
  spaceId?: string;
  onBreedSelect?: (breed: BreedDocType) => void;
  replicationState?: any;
}

export function BreedsList({ 
  workspaceId, 
  spaceId, 
  onBreedSelect,
  replicationState
}: BreedsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  
  const {
    breeds,
    loading,
    error,
    addBreed,
    updateBreed,
    deleteBreed,
    searchBreeds
  } = useBreeds({
    workspaceId,
    spaceId,
    sort: 'name',
    query: selectedSize !== 'all' 
      ? { selector: { size: selectedSize } }
      : undefined
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBreedData, setNewBreedData] = useState<Partial<BreedDocType>>({
    name: '',
    description: '',
    size: 'medium'
  });

  const handleAddBreed = async () => {
    try {
      await addBreed({
        ...newBreedData,
        workspaceId,
        spaceId
      });
      setIsAddingNew(false);
      setNewBreedData({ name: '', description: '', size: 'medium' });
    } catch (err) {
      console.error('Failed to add breed:', err);
    }
  };

  const handleSearch = async () => {
    if (searchQuery) {
      const results = await searchBreeds(searchQuery);
      console.log('Search results:', results);
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
      {/* Header with sync status */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dog Breeds</h2>
        {replicationState && (
          <SyncStatusIndicator replicationState={replicationState} />
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search breeds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sizes</option>
          <option value="toy">Toy</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="giant">Giant</option>
        </select>

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
          <div className="grid grid-cols-3 gap-3">
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
            <select
              value={newBreedData.size}
              onChange={(e) => setNewBreedData({ ...newBreedData, size: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="toy">Toy</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="giant">Giant</option>
            </select>
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

      {/* Breeds list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds.map((breed) => (
          <div
            key={breed.id}
            onClick={() => onBreedSelect?.(breed.toJSON())}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{breed.name}</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {breed.size}
              </span>
            </div>
            
            {breed.description && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {breed.description}
              </p>
            )}
            
            {breed.origin && (
              <p className="text-xs text-gray-500">
                Origin: {breed.origin}
              </p>
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