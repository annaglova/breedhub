import React, { useState, useEffect } from 'react';
import { appConfigStore } from '@breedhub/rxdb-store';
import { Plus, Edit2, Trash2, Save, X, Search, Code, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNewId, setEditingNewId] = useState<string>('');
  const [editingData, setEditingData] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newPropertyData, setNewPropertyData] = useState('{}');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load properties from store
  useEffect(() => {
    const loadProperties = () => {
      const allConfigs = appConfigStore.configsList.value || [];
      const props = allConfigs.filter(c => c.type === 'property' && !c._deleted);
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
      const filtered = properties.filter(p => 
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
  };

  // Save edited property
  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const selfData = JSON.parse(editingData);
      const property = properties.find(p => p.id === editingId);
      
      if (property) {
        // If ID changed, delete old and create new
        if (editingNewId !== editingId) {
          if (!editingNewId.startsWith('property_')) {
            alert('Property ID must start with "property_"');
            return;
          }
          
          // Check if new ID already exists
          if (properties.some(p => p.id === editingNewId)) {
            alert('Property with this ID already exists');
            return;
          }
          
          // Delete old property
          await appConfigStore.delete(editingId);
          
          // Create new property with new ID
          await appConfigStore.createConfig({
            id: editingNewId,
            type: 'property',
            self_data: selfData,
            override_data: property.override_data || {},
            deps: property.deps || [],
            tags: property.tags || [],
            version: property.version || 1,
            caption: property.caption || null,
            category: property.category || null,
            created_by: property.created_by || null,
            updated_by: property.updated_by || null,
            deleted_at: null,
            _deleted: false
          });
        } else {
          // Just update the data
          await appConfigStore.upsert({
            ...property,
            self_data: selfData,
            data: selfData
          });
        }
      }
      
      setEditingId(null);
      setEditingNewId('');
      // Don't reset page when saving edits
    } catch (error: any) {
      console.error('Error saving property:', error);
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
    setEditingNewId('');
    setEditingData('');
  };

  // Delete property
  const deleteProperty = async (id: string) => {
    if (confirm(`Delete property ${id}?`)) {
      await appConfigStore.deleteConfig(id);
    }
  };

  // Create new property
  const createProperty = async () => {
    if (!newPropertyId) {
      alert('Property ID is required');
      return;
    }
    
    if (!newPropertyId.startsWith('property_')) {
      alert('Property ID must start with "property_"');
      return;
    }
    
    try {
      const selfData = JSON.parse(newPropertyData);
      
      await appConfigStore.createConfig({
        id: newPropertyId,
        type: 'property',
        self_data: selfData,
        override_data: {},
        deps: [],
        tags: [],
        version: 1,
        caption: null,
        category: null,
        created_by: null,
        updated_by: null,
        deleted_at: null,
        _deleted: false
      });
      
      setIsCreating(false);
      setNewPropertyId('');
      setNewPropertyData('{}');
      // Reset to first page to see the new property
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error creating property:', error);
      if (error instanceof SyntaxError) {
        alert(`Invalid JSON format: ${error.message}`);
      } else {
        alert(`Error creating property: ${error.message || error}`);
      }
    }
  };

  // Cancel creating
  const cancelCreate = () => {
    setIsCreating(false);
    setNewPropertyId('');
    setNewPropertyData('{}');
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

  // Get color based on property content
  const getPropertyColor = (property: Property) => {
    // Special styling for system properties
    if (property.id === 'property_is_system' || property.id === 'property_not_system') {
      return 'border-yellow-400 bg-yellow-100';
    }
    const data = JSON.stringify(property.self_data);
    if (data.includes('required')) return 'border-red-200 bg-red-50';
    if (data.includes('system')) return 'border-yellow-200 bg-yellow-50';
    if (data.includes('primary')) return 'border-purple-200 bg-purple-50';
    if (data.includes('unique')) return 'border-blue-200 bg-blue-50';
    if (data.includes('maxLength')) return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Properties Management</h1>
        <p className="text-gray-600">Manage atomic configuration properties</p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Property
            </button>
          )}
        </div>
      </div>

      {/* Create New Property Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Property</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property ID</label>
              <input
                type="text"
                placeholder="e.g., property_required_email"
                value={newPropertyId}
                onChange={(e) => setNewPropertyId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Must start with "property_"</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Self Data (JSON)</label>
              <textarea
                value={newPropertyData}
                onChange={(e) => setNewPropertyData(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='{"required": true, "validation": {"notNull": true}}'
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={createProperty}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create
              </button>
              <button
                onClick={cancelCreate}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedProperties.length === 0 && filteredProperties.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
            No properties found
          </div>
        ) : (
          paginatedProperties.map(property => (
            <div 
              key={property.id} 
              className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${getPropertyColor(property)}`}
            >
              {/* Card Header */}
              <div className="p-4 border-b bg-white rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate" title={property.id}>
                      {property.id.replace('property_', '')}
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
                        {Object.entries(property.self_data || {}).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium text-gray-600">{key}:</span>{' '}
                            <span className="text-gray-800">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                        {Object.keys(property.self_data || {}).length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{Object.keys(property.self_data).length - 3} more...
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
                {(property.id === 'property_is_system' || property.id === 'property_not_system') ? (
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
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
                      ${page === currentPage 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    {page}
                  </button>
                );
              }
              // Show ellipsis
              if (page === 2 && currentPage > 3) {
                return <span key={page} className="px-2">...</span>;
              }
              if (page === totalPages - 1 && currentPage < totalPages - 2) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}
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
        Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length} properties
        {searchQuery && ` (filtered from ${properties.length} total)`}
      </div>
    </div>
  );
};

export default Properties;