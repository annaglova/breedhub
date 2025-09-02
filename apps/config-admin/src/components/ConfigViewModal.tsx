import React from 'react';

interface ConfigViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  title: string;
  config: {
    id: string;
    caption?: string;
    version?: number;
    deps?: string[];
    self_data?: any;
    override_data?: any;
    data?: any;
  };
}

export default function ConfigViewModal({
  isOpen,
  onClose,
  onEdit,
  title,
  config
}: ConfigViewModalProps) {
  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}: {config.id}</h3>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Caption and Version */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50">
                {config.caption || 'No caption'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50">
                {config.version || 1}
              </div>
            </div>
          </div>

          {/* Deps */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dependencies (deps)
            </label>
            <div className="px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm">
              {config.deps && config.deps.length > 0 ? (
                <div className="whitespace-pre-wrap">
                  {JSON.stringify(config.deps, null, 2)}
                </div>
              ) : (
                <span className="text-gray-400">[]</span>
              )}
            </div>
          </div>

          {/* Self Data */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Self Data
            </label>
            <div className="px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(config.self_data || {}, null, 2)}</pre>
            </div>
          </div>

          {/* Override Data */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Override Data
            </label>
            <div className="px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(config.override_data || {}, null, 2)}</pre>
            </div>
          </div>

          {/* Data (computed) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data (Computed)
            </label>
            <div className="px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(config.data || {}, null, 2)}</pre>
            </div>
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
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}