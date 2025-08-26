import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { propertyRegistryStore, type PropertyDefinition } from '@breedhub/rxdb-store';

interface PropertyEditModalProps {
  property: PropertyDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const PropertyEditModal: React.FC<PropertyEditModalProps> = ({ 
  property, 
  isOpen, 
  onClose,
  onSave 
}) => {
  const [formData, setFormData] = useState<Partial<PropertyDefinition>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        type: property.type,
        caption: property.caption,
        component: property.component,
        category: property.category || '',
        data_type: property.data_type || '',
        config: property.config || {},
        mixins: property.mixins || [],
        tags: property.tags || []
      });
      setGeneratedId(property.id || null);
    } else {
      // New property - generate UUID
      const newId = crypto.randomUUID();
      setGeneratedId(newId);
      setFormData({
        id: newId,
        name: '',
        type: 'string',
        caption: '',
        component: 10, // Default to text input
        category: '',
        data_type: '',
        config: {},
        mixins: [],
        tags: []
      });
    }
  }, [property]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (property?.id) {
        // Update existing
        await propertyRegistryStore.updateProperty(property.id, formData);
      } else {
        // Create new - pass data without id (store will generate it)
        // But we can pass our pre-generated id as part of formData
        await propertyRegistryStore.createProperty({
          ...formData,
          id: generatedId!  // Pass the pre-generated ID
        } as any);
      }
      
      onSave?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  const componentOptions = [
    { value: 0, label: 'Entity Select' },
    { value: 3, label: 'Date Picker' },
    { value: 4, label: 'Number Input' },
    { value: 5, label: 'Checkbox' },
    { value: 10, label: 'Text Input' }
  ];

  const typeOptions = [
    'string',
    'number',
    'boolean',
    'date',
    'datetime',
    'json',
    'array',
    'reference'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {property ? 'Edit Property' : 'New Property'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={property?.is_system}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Caption <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.caption || ''}
                onChange={(e) => setFormData({...formData, caption: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type || 'string'}
                onChange={(e) => setFormData({...formData, type: e.target.value as PropertyDefinition['type']})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={property?.is_system}
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Component <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.component || 10}
                onChange={(e) => setFormData({...formData, component: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {componentOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., General, Advanced"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Type</label>
              <input
                type="text"
                value={formData.data_type || ''}
                onChange={(e) => setFormData({...formData, data_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., varchar(255)"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
              })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Comma-separated tags"
            />
          </div>

          {/* Mixins */}
          <div>
            <label className="block text-sm font-medium mb-1">Mixins</label>
            <input
              type="text"
              value={formData.mixins?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData, 
                mixins: e.target.value.split(',').map(m => m.trim()).filter(m => m)
              })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Comma-separated mixins"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyEditModal;