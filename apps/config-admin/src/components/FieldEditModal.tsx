import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { appConfigStore, type AppConfig } from '@breedhub/rxdb-store';

interface FieldEditModalProps {
  field: AppConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({ field, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<AppConfig>>({
    id: '',
    type: 'field',
    caption: '',
    category: '',
    tags: [],
    deps: [],
    self_data: {},
    override_data: {},
    data: {},
    version: 1
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (field) {
      setFormData({
        ...field,
        tags: field.tags || [],
        deps: field.deps || [],
        self_data: field.self_data || {},
        override_data: field.override_data || {}
      });
    } else {
      // Reset for new field
      setFormData({
        id: '',
        type: 'field',
        caption: '',
        category: '',
        tags: [],
        deps: [],
        self_data: {},
        override_data: {},
        data: {},
        version: 1
      });
    }
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.id) {
        setError('Field ID is required');
        return;
      }

      if (field && field.id) {
        // Update existing field
        await appConfigStore.updateConfig(field.id, {
          caption: formData.caption,
          category: formData.category,
          tags: formData.tags,
          deps: formData.deps,
          self_data: formData.self_data,
          override_data: formData.override_data
        });
      } else {
        // Create new field
        await appConfigStore.createConfig({
          ...formData,
          type: 'field',
          _deleted: false
        } as AppConfig);
      }
      
      onSave();
    } catch (error: any) {
      setError(error.message || 'Failed to save field');
    } finally {
      setLoading(false);
    }
  };

  const handleTagsChange = (value: string) => {
    setFormData({
      ...formData,
      tags: value.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  const handleDepsChange = (value: string) => {
    setFormData({
      ...formData,
      deps: value.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {field && field.id ? 'Edit Field' : 'Create New Field'}
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
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Field ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id || ''}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={field && field.id ? true : false}
                placeholder="field_name"
              />
              <p className="text-xs text-gray-500 mt-1">Use prefix "field_" for clarity</p>
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
                placeholder="Human-readable name"
              />
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
                placeholder="e.g., Basic, Advanced"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.self_data?.sortOrder || 0}
                onChange={(e) => updateSelfData({ sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>


          {/* JSON Data */}
          <div>
            <h3 className="text-lg font-semibold mb-3">JSON Configuration</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Self Data (JSON)</label>
                <textarea
                  value={JSON.stringify(formData.self_data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, self_data: parsed});
                    } catch {
                      // Invalid JSON, just update the text
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  rows={8}
                />
                <p className="text-xs text-gray-500 mt-1">Own configuration data in JSON format</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Override Data (JSON)</label>
                <textarea
                  value={JSON.stringify(formData.override_data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, override_data: parsed});
                    } catch {
                      // Invalid JSON, just update the text
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">Override inherited values</p>
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Advanced</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dependencies (Inherit From)</label>
                <input
                  type="text"
                  value={formData.deps?.join(', ') || ''}
                  onChange={(e) => handleDepsChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="field_base, mixin_auditable"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated config IDs to inherit from</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : (field && field.id ? 'Update Field' : 'Create Field')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldEditModal;