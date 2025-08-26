import React, { useState, useMemo } from 'react';
import { Plus, X, AlertTriangle, Eye, Check } from 'lucide-react';
import { mixinEngine, type PropertyDefinition } from '@breedhub/rxdb-store';

interface MixinComposerProps {
  property: PropertyDefinition;
  onApply?: (updatedProperty: PropertyDefinition) => void;
  onCancel?: () => void;
}

const availableMixins = [
  { name: 'sortable', category: 'Feature', description: 'Makes the property sortable in lists' },
  { name: 'searchable', category: 'Feature', description: 'Adds the property to search fields' },
  { name: 'indexed', category: 'Performance', description: 'Creates a database index' },
  { name: 'required', category: 'Validation', description: 'Makes the field required' },
  { name: 'readonly', category: 'UI', description: 'Makes the field read-only' },
  { name: 'hidden', category: 'UI', description: 'Hides the field from UI' },
  { name: 'cached', category: 'Performance', description: 'Enables caching' },
  { name: 'encrypted', category: 'Security', description: 'Encrypts the value' },
  { name: 'auditable', category: 'Feature', description: 'Tracks changes' },
  { name: 'translatable', category: 'I18n', description: 'Supports multiple languages' }
];

export const MixinComposer: React.FC<MixinComposerProps> = ({ property, onApply, onCancel }) => {
  const [selectedMixins, setSelectedMixins] = useState<string[]>(property.mixins || []);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Group mixins by category
  const mixinsByCategory = useMemo(() => {
    const grouped: Record<string, typeof availableMixins> = {};
    availableMixins.forEach(mixin => {
      if (!grouped[mixin.category]) {
        grouped[mixin.category] = [];
      }
      grouped[mixin.category].push(mixin);
    });
    return grouped;
  }, []);
  
  // Preview the property with selected mixins
  const previewProperty = useMemo(() => {
    if (!previewMode) return property;
    return mixinEngine.applyMixins(property, selectedMixins);
  }, [property, selectedMixins, previewMode]);
  
  // Check for conflicts
  const conflicts = useMemo(() => {
    const allConflicts: string[] = [];
    selectedMixins.forEach(mixin => {
      const mixinConflicts = mixinEngine.analyzeMixinConflicts(
        { ...property, mixins: selectedMixins.filter(m => m !== mixin) },
        mixin
      );
      allConflicts.push(...mixinConflicts);
    });
    return [...new Set(allConflicts)];
  }, [property, selectedMixins]);
  
  const toggleMixin = (mixinName: string) => {
    setSelectedMixins(prev => {
      if (prev.includes(mixinName)) {
        return prev.filter(m => m !== mixinName);
      }
      return [...prev, mixinName];
    });
  };
  
  const handleApply = () => {
    if (onApply) {
      const updatedProperty = {
        ...property,
        mixins: selectedMixins
      };
      onApply(updatedProperty);
    }
  };
  
  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      'Feature': 'blue',
      'Performance': 'green',
      'Validation': 'red',
      'UI': 'purple',
      'Security': 'orange',
      'I18n': 'pink'
    };
    return colorMap[category] || 'gray';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Mixin Composer for "{property.caption}"
        </h3>
        <p className="text-sm text-gray-600">
          Select mixins to apply features and behaviors to this property
        </p>
      </div>
      
      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Potential Conflicts</p>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {conflicts.map((conflict, idx) => (
                  <li key={idx}>{conflict}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Mixin Categories */}
      <div className="space-y-4 mb-6">
        {Object.entries(mixinsByCategory).map(([category, mixins]) => (
          <div key={category}>
            <h4 className={`text-sm font-semibold text-${getCategoryColor(category)}-700 mb-2`}>
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {mixins.map(mixin => (
                <label
                  key={mixin.name}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedMixins.includes(mixin.name)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMixins.includes(mixin.name)}
                    onChange={() => toggleMixin(mixin.name)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{mixin.name}</p>
                    <p className="text-xs text-gray-600">{mixin.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Selected Mixins */}
      {selectedMixins.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Mixins</h4>
          <div className="flex flex-wrap gap-2">
            {selectedMixins.map(mixin => (
              <span
                key={mixin}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
              >
                {mixin}
                <button
                  onClick={() => toggleMixin(mixin)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Preview Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Eye className="w-4 h-4" />
          {previewMode ? 'Hide' : 'Show'} Preview
        </button>
      </div>
      
      {/* Preview Panel */}
      {previewMode && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Property Preview</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-mono">{previewProperty.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-mono">{previewProperty.type}</span>
            </div>
            {previewProperty.config?.isRequired && (
              <div className="flex justify-between">
                <span className="text-gray-600">Required:</span>
                <span className="text-red-600 font-medium">Yes</span>
              </div>
            )}
            {previewProperty.config?.features && (
              <div>
                <span className="text-gray-600">Features:</span>
                <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto">
                  {JSON.stringify(previewProperty.config.features, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={conflicts.length > 0}
        >
          <Check className="w-4 h-4" />
          Apply Mixins
        </button>
      </div>
    </div>
  );
};