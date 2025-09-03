import React from 'react';

interface ConfigEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  configId: string;
  caption: string;
  version: number;
  overrideData: string;
  onCaptionChange: (value: string) => void;
  onVersionChange: (value: number) => void;
  onOverrideDataChange: (value: string) => void;
  onConfigIdChange?: (value: string) => void;
  allowEditId?: boolean;
  dataFieldLabel?: string; // Label for data field (default: "Override Data")
  dataFieldPlaceholder?: string; // Placeholder for data field
}

export default function ConfigEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  configId,
  caption,
  version,
  overrideData,
  onCaptionChange,
  onVersionChange,
  onOverrideDataChange,
  onConfigIdChange,
  allowEditId = false,
  dataFieldLabel = "Override Data (JSON)",
  dataFieldPlaceholder = "{}"
}: ConfigEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Config ID (if editable) */}
          {allowEditId && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Config ID
              </label>
              <input
                type="text"
                value={configId}
                onChange={(e) => onConfigIdChange?.(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="property_"
              />
            </div>
          )}

          {/* Caption and Version */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Caption"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="number"
                value={version}
                onChange={(e) => onVersionChange(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>

          {/* Data Field (Override Data or Self Data) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dataFieldLabel}
            </label>
            <textarea
              value={overrideData}
              onChange={(e) => onOverrideDataChange(e.target.value)}
              className="w-full h-64 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder={dataFieldPlaceholder}
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}