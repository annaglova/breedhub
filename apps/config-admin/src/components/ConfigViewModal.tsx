import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
    type?: string;
  };
  hideIntermediateData?: boolean; // Hide Self Data and Override Data for cleaner view
}

export default function ConfigViewModal({
  isOpen,
  onClose,
  onEdit,
  title,
  config,
  hideIntermediateData = false,
}: ConfigViewModalProps) {
  const [activeTab, setActiveTab] = useState<"self" | "override" | "data">(
    "data"
  );
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  if (!isOpen || !config) return null;

  // Helper to check if object has data
  const hasData = (obj: any) => {
    return obj && Object.keys(obj).length > 0;
  };

  // Count fields in object
  const countFields = (obj: any) => {
    if (!obj || typeof obj !== "object") return 0;
    return Object.keys(obj).length;
  };

  // Handle copy to clipboard
  const handleCopy = (data: any, tabName: string) => {
    navigator.clipboard.writeText(JSON.stringify(data || {}, null, 2));
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full h-[80vh] flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {title}: {config.id}
          </h3>
        </div>

        {/* Header Section - Always Visible */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Caption
              </label>
              <div className="text-sm text-gray-900">
                {config.caption || (
                  <span className="text-gray-400 italic">No caption</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Version
              </label>
              <div className="text-sm text-gray-900">{config.version || 1}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Dependencies
              </label>
              <div className="text-sm">
                {config.deps && config.deps.length > 0 ? (
                  <span className="text-blue-600 font-medium">
                    {config.deps.length} deps
                  </span>
                ) : (
                  <span className="text-gray-400">No dependencies</span>
                )}
              </div>
            </div>
          </div>

          {/* Show dependencies if any */}
          {config.deps && config.deps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {config.deps.map((dep, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono whitespace-nowrap flex-shrink-0"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        {!hideIntermediateData ? (
          <>
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("self")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "self"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Self Data
                {hasData(config.self_data) && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {countFields(config.self_data)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("override")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "override"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Override Data
                {hasData(config.override_data) && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                    {countFields(config.override_data)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("data")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "data"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Data (Computed)
                {hasData(config.data) && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">
                    {countFields(config.data)}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 px-6 pb-6 pt-4">
              {activeTab === "self" && (
                <div className="h-full flex flex-col">
                  <div className="mb-1 flex items-center justify-between ">
                    <h4 className="text-sm font-medium text-gray-700">
                      Self Data
                    </h4>
                    <button
                      onClick={() => handleCopy(config.self_data, "self")}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedTab === "self" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 border rounded-lg bg-gray-50 overflow-hidden">
                    <div className="h-full p-4 overflow-auto">
                      <pre className="font-mono text-sm">
                        {JSON.stringify(config.self_data || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "override" && (
                <div className="h-full flex flex-col">
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">
                      Override Data
                    </h4>
                    <button
                      onClick={() =>
                        handleCopy(config.override_data, "override")
                      }
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedTab === "override" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 border rounded-lg bg-gray-50 overflow-hidden">
                    <div className="h-full p-4 overflow-auto">
                      <pre className="font-mono text-sm">
                        {JSON.stringify(config.override_data || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "data" && (
                <div className="h-full flex flex-col">
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">
                      Data (Computed)
                    </h4>
                    <button
                      onClick={() => handleCopy(config.data, "data")}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedTab === "data" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 border rounded-lg bg-gray-50 overflow-hidden">
                    <div className="h-full p-4 overflow-auto">
                      <pre className="font-mono text-sm">
                        {JSON.stringify(config.data || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* When hideIntermediateData is true, show only Data */
          <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
            <div className="flex flex-col h-full">
              <div className="mb-2 flex items-center justify-between flex-shrink-0">
                <h4 className="text-sm font-medium text-gray-700">
                  Data (Computed)
                </h4>
                <button
                  onClick={() => handleCopy(config.data, "data-only")}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedTab === "data-only" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex-1 border rounded-lg bg-gray-50 p-4 font-mono text-sm overflow-auto min-h-0">
                <pre>{JSON.stringify(config.data || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
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
