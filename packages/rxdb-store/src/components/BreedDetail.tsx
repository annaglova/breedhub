import React, { useState } from 'react';
import { BreedDocType } from '../types/breed.types';

interface BreedDetailProps {
  breed: BreedDocType;
  onUpdate: (breed: BreedDocType) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BreedDetail({ breed, onUpdate, onDelete, onClose }: BreedDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBreed, setEditedBreed] = useState<BreedDocType>(breed);

  const handleSave = () => {
    // Only update name and description
    const updatedBreed = {
      ...breed,
      name: editedBreed.name,
      description: editedBreed.description,
      updatedAt: new Date().toISOString()
    };
    
    onUpdate(updatedBreed);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this breed?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Breed Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedBreed.name}
              onChange={(e) => setEditedBreed({ ...editedBreed, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter breed name"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-800">{breed.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editedBreed.description || ''}
              onChange={(e) => setEditedBreed({ ...editedBreed, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter breed description..."
            />
          ) : (
            <p className="text-gray-600 whitespace-pre-wrap">
              {breed.description || 'No description available'}
            </p>
          )}
        </div>


        {/* Timestamps */}
        <div className="border-t pt-4 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Created: {new Date(breed.createdAt).toLocaleString('uk-UA')}</span>
            <span>Updated: {new Date(breed.updatedAt).toLocaleString('uk-UA')}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Delete Breed
        </button>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditedBreed(breed);
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}