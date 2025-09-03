import { appConfigStore } from "@breedhub/rxdb-store";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Edit2,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import WorkspaceHeader from "../components/WorkspaceHeader";
import ConfigEditModal from "../components/ConfigEditModal";

interface Property {
  id: string;
  type: string;
  self_data: any;
  override_data?: any;
  data: any;
  deps: string[];
  caption?: string;
  category?: string;
  tags?: string[];
  version?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
  _deleted?: boolean;
}

const Properties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNewId, setEditingNewId] = useState<string>("");
  const [editingData, setEditingData] = useState<string>("");
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [editingVersion, setEditingVersion] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load properties from store
  useEffect(() => {
    const loadProperties = () => {
      const allConfigs = appConfigStore.configsList.value || [];
      const props = allConfigs.filter(
        (c) => c.type === "property" && !c._deleted
      );
      setProperties(props);
    };

    loadProperties();

    // Refresh every second
    const interval = setInterval(loadProperties, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter properties based on search
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = properties.filter(
        (p) =>
          p.id.toLowerCase().includes(query) ||
          JSON.stringify(p.self_data).toLowerCase().includes(query)
      );
      setFilteredProperties(filtered);
      // Reset to first page only when search changes
      setCurrentPage(1);
    } else {
      setFilteredProperties(properties);
    }
  }, [searchQuery, properties]);

  // Start editing a property
  const startEdit = (property: Property) => {
    setEditingId(property.id);
    setEditingNewId(property.id);
    setEditingData(JSON.stringify(property.self_data || {}, null, 2));
    setEditingCaption(property.caption || "");
    setEditingVersion(property.version || 1);
  };

  // Start creating new property
  const startCreate = () => {
    setIsCreating(true);
    setEditingNewId("property_");
    setEditingData("{}");
    setEditingCaption("");
    setEditingVersion(1);
  };

  // Save edited property
  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const selfData = JSON.parse(editingData);

      const result = await appConfigStore.updatePropertyWithIdChange(
        editingId,
        editingNewId,
        selfData
      );

      if (!result.success) {
        alert(result.error || "Failed to update property");
        return;
      }

      setEditingId(null);
      setEditingNewId("");
      setEditingData("");
      // Don't reset page when saving edits
    } catch (error: any) {
      console.error("Error saving property:", error);
      if (error instanceof SyntaxError) {
        alert(`Invalid JSON format: ${error.message}`);
      } else {
        alert(`Error saving property: ${error.message || error}`);
      }
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingNewId("");
    setEditingData("");
  };

  // Delete property
  const deleteProperty = async (id: string) => {
    if (confirm(`Delete property ${id}?`)) {
      const result = await appConfigStore.deleteProperty(id);
      if (!result.success) {
        alert(result.error || "Failed to delete property");
      }
    }
  };

  // Create or save property
  const saveProperty = async () => {
    if (isCreating) {
      // Creating new property
      if (!editingNewId || !editingNewId.startsWith("property_")) {
        alert("Property ID must start with 'property_'");
        return;
      }

      try {
        const selfData = JSON.parse(editingData);

        const result = await appConfigStore.createProperty(
          editingNewId,
          selfData
        );

        if (!result.success) {
          alert(result.error || "Failed to create property");
          return;
        }

        setIsCreating(false);
        setEditingNewId("");
        setEditingData("");
        setEditingCaption("");
        setEditingVersion(1);
        // Reset to first page to see the new property
        setCurrentPage(1);
      } catch (error: any) {
        console.error("Error creating property:", error);
        if (error instanceof SyntaxError) {
          alert(`Invalid JSON format: ${error.message}`);
        } else {
          alert(`Error creating property: ${error.message || error}`);
        }
      }
    } else {
      // Editing existing property
      saveEdit();
    }
  };

  // Cancel editing or creating
  const cancelEditOrCreate = () => {
    setEditingId(null);
    setEditingNewId("");
    setEditingData("");
    setEditingCaption("");
    setEditingVersion(1);
    setIsCreating(false);
  };

  // Copy property ID
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle expanded view
  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full">
        <div className="bg-white rounded-lg shadow-md p-6 h-[calc(100vh-7rem)] flex flex-col">
          <WorkspaceHeader
            title="Properties"
            titleIcon={Tag}
            itemCount={properties.length}
            searchPlaceholder="Search properties..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            showAddButton={true}
            addButtonText="Add Property"
            onAddClick={startCreate}
          />

          <div className="flex-1 overflow-y-auto">
            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProperties.length === 0 &&
              filteredProperties.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                  No properties found
                </div>
              ) : (
                paginatedProperties.map((property) => (
                  <div
                    key={property.id}
                    className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${appConfigStore.getPropertyBorderColor(
                      property
                    )}`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b bg-white rounded-t-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-medium text-sm truncate"
                            title={property.id}
                          >
                            {property.id.replace("property_", "")}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Type: {property.type}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => copyToClipboard(property.id)}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === property.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleExpanded(property.id)}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Toggle view"
                          >
                            <Code className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      {editingId === property.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingNewId}
                            onChange={(e) => setEditingNewId(e.target.value)}
                            placeholder="Property ID"
                            className="w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            value={editingData}
                            onChange={(e) => setEditingData(e.target.value)}
                            rows={4}
                            className="w-full px-2 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={saveEdit}
                              className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex-1 px-2 py-1 border rounded text-xs hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {expandedId === property.id ? (
                            <pre className="text-xs font-mono bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                              {JSON.stringify(property.self_data, null, 2)}
                            </pre>
                          ) : (
                            <div className="space-y-1">
                              {Object.entries(property.self_data || {})
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="font-medium text-gray-600">
                                      {key}:
                                    </span>{" "}
                                    <span className="text-gray-800">
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                              {Object.keys(property.self_data || {}).length >
                                3 && (
                                <div className="text-xs text-gray-400">
                                  +{Object.keys(property.self_data).length - 3}{" "}
                                  more...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-2 border-t bg-white rounded-b-lg flex justify-between">
                      <div className="text-xs text-gray-500">
                        v{property.version || 1}
                      </div>
                      {property.id === "property_is_system" ||
                      property.id === "property_not_system" ? (
                        <div className="text-xs text-gray-400 italic">
                          System property
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(property)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteProperty(property.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`
                      px-3 py-1 border rounded-md transition-colors
                      ${
                        page === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "hover:bg-gray-50"
                      }
                    `}
                          >
                            {page}
                          </button>
                        );
                      }
                      // Show ellipsis
                      if (page === 2 && currentPage > 3) {
                        return (
                          <span key={page} className="px-2">
                            ...
                          </span>
                        );
                      }
                      if (
                        page === totalPages - 1 &&
                        currentPage < totalPages - 2
                      ) {
                        return (
                          <span key={page} className="px-2">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }
                  )}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredProperties.length)} of{" "}
              {filteredProperties.length} properties
              {searchQuery && ` (filtered from ${properties.length} total)`}
            </div>
          </div>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <ConfigEditModal
        isOpen={!!editingId || isCreating}
        onClose={cancelEditOrCreate}
        onSave={saveProperty}
        title={isCreating ? "Create Property" : "Edit Property"}
        configId={editingNewId}
        caption={editingCaption}
        version={editingVersion}
        overrideData={editingData} // For properties, this actually contains self_data
        onCaptionChange={setEditingCaption}
        onVersionChange={setEditingVersion}
        onOverrideDataChange={setEditingData}
        onConfigIdChange={setEditingNewId}
        allowEditId={true}
        dataFieldLabel="Self Data (JSON)"
        dataFieldPlaceholder='{"required": true, "validation": {"notNull": true}}'
      />
    </div>
  );
};

export default Properties;
