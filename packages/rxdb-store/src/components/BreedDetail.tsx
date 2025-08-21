import React, { useState } from 'react';
import { BreedDocType } from '../types/breed.types';

export interface BreedDetailProps {
  breed: BreedDocType;
  onUpdate: (id: string, updates: Partial<BreedDocType>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function BreedDetail({ breed, onUpdate, onDelete, onClose }: BreedDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBreed, setEditedBreed] = useState<BreedDocType>(breed);
  const [traits, setTraits] = useState<string>(breed.traits?.join(', ') || '');
  const [colors, setColors] = useState<string>(breed.colors?.join(', ') || '');

  const handleSave = async () => {
    try {
      await onUpdate(breed.id, {
        ...editedBreed,
        traits: traits.split(',').map(t => t.trim()).filter(Boolean),
        colors: colors.split(',').map(c => c.trim()).filter(Boolean)
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update breed:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${breed.name}?`)) {
      try {
        await onDelete(breed.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete breed:', err);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">
          {isEditing ? (
            <input
              type="text"
              value={editedBreed.name}
              onChange={(e) => setEditedBreed({ ...editedBreed, name: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded-md"
            />
          ) : (
            breed.name
          )}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editedBreed.description || ''}
              onChange={(e) => setEditedBreed({ ...editedBreed, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          ) : (
            <p className="text-gray-600">
              {breed.description || 'No description available'}
            </p>
          )}
        </div>

        {/* Origin and Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origin
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedBreed.origin || ''}
                onChange={(e) => setEditedBreed({ ...editedBreed, origin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            ) : (
              <p className="text-gray-600">{breed.origin || 'Unknown'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size
            </label>
            {isEditing ? (
              <select
                value={editedBreed.size}
                onChange={(e) => setEditedBreed({ ...editedBreed, size: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="toy">Toy</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="giant">Giant</option>
              </select>
            ) : (
              <p className="text-gray-600 capitalize">{breed.size}</p>
            )}
          </div>
        </div>

        {/* Lifespan */}
        {(breed.lifespan || isEditing) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lifespan (years)
            </label>
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={editedBreed.lifespan?.min || ''}
                  onChange={(e) => setEditedBreed({
                    ...editedBreed,
                    lifespan: {
                      ...editedBreed.lifespan,
                      min: parseInt(e.target.value) || 0,
                      max: editedBreed.lifespan?.max || 0
                    }
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  value={editedBreed.lifespan?.max || ''}
                  onChange={(e) => setEditedBreed({
                    ...editedBreed,
                    lifespan: {
                      min: editedBreed.lifespan?.min || 0,
                      ...editedBreed.lifespan,
                      max: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                  placeholder="Max"
                />
              </div>
            ) : (
              <p className="text-gray-600">
                {breed.lifespan ? `${breed.lifespan.min}-${breed.lifespan.max} years` : 'Unknown'}
              </p>
            )}
          </div>
        )}

        {/* Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Traits
          </label>
          {isEditing ? (
            <input
              type="text"
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Friendly, Energetic, Loyal (comma separated)"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {breed.traits?.map((trait, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                >
                  {trait}
                </span>
              )) || <span className="text-gray-500">No traits listed</span>}
            </div>
          )}
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Colors
          </label>
          {isEditing ? (
            <input
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Black, White, Brown (comma separated)"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {breed.colors?.map((color, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                >
                  {color}
                </span>
              )) || <span className="text-gray-500">No colors listed</span>}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p>Created: {new Date(breed.createdAt || '').toLocaleDateString()}</p>
          <p>Updated: {new Date(breed.updatedAt || '').toLocaleDateString()}</p>
          {breed.workspaceId && <p>Workspace: {breed.workspaceId}</p>}
          {breed.spaceId && <p>Space: {breed.spaceId}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Delete Breed
        </button>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}