import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Copy, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { propertyRegistryStore, type PropertyDefinition } from '@breedhub/rxdb-store';
import PropertyEditModal from '../components/PropertyEditModal';

type PropertyType = PropertyDefinition['type'];

const ITEMS_PER_PAGE = 20;

const PropertiesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PropertyType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<PropertyDefinition | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [, forceUpdate] = useState({});

  // Use signals from store - access .value to get current values
  const properties = propertyRegistryStore.propertiesList.value;
  const loading = propertyRegistryStore.loading.value;
  const error = propertyRegistryStore.error.value;
  const categories = propertyRegistryStore.categories.value;
  const totalCount = propertyRegistryStore.totalCount.value;
  const systemPropertiesCount = propertyRegistryStore.systemProperties.value.length;
  
  // Debug logging
  console.log('[PropertiesPage] Store state:', {
    properties: properties.length,
    loading,
    error,
    totalCount,
    systemPropertiesCount,
    rawPropertiesMap: propertyRegistryStore.properties.value.size
  });
  
  // Subscribe to signal changes
  useEffect(() => {
    const unsubscribe = propertyRegistryStore.propertiesList.subscribe(() => {
      forceUpdate({});
    });
    return () => unsubscribe();
  }, []);

  // Filter properties based on search and filters
  const filteredProperties = React.useMemo(() => {
    let filtered = [...properties];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.caption.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    return filtered;
  }, [properties, searchQuery, filterType, filterCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProperties.slice(startIndex, endIndex);
  }, [filteredProperties, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterCategory]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDelete = async (property: PropertyDefinition) => {
    if (confirm(`Are you sure you want to delete property "${property.caption}"?`)) {
      try {
        await propertyRegistryStore.deleteProperty(property.id);
        showMessage('success', `Property "${property.caption}" deleted`);
      } catch (error: any) {
        showMessage('error', error.message || 'Failed to delete property');
      }
    }
  };

  const handleClone = (property: PropertyDefinition) => {
    // Open modal with pre-filled data from the property to clone
    // ВАЖЛИВО: видаляємо id, created_at, updated_at щоб створився новий запис
    const { id, created_at, updated_at, ...propertyWithoutId } = property;
    const clonedProperty = {
      ...propertyWithoutId,
      name: `${property.name}_copy`,
      caption: `${property.caption} (Copy)`,
      is_system: false
    } as PropertyDefinition;
    setSelectedProperty(clonedProperty);
    setShowCreateModal(true);
  };

  const handleEdit = (property: PropertyDefinition) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const handleModalSave = () => {
    showMessage('success', showEditModal ? 'Property updated successfully' : 'Property created successfully');
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedProperty(null);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedProperty(null);
  };

  const handleExport = () => {
    const json = JSON.stringify(filteredProperties, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'properties.json';
    a.click();
    URL.revokeObjectURL(url);
    showMessage('info', `Exported ${filteredProperties.length} properties`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const importedProps = JSON.parse(json) as PropertyDefinition[];
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const prop of importedProps) {
          try {
            await propertyRegistryStore.createProperty({
              ...prop,
              id: undefined as any,
              created_at: undefined as any,
              updated_at: undefined as any,
              is_system: false
            });
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`Failed to import property ${prop.name}:`, error);
          }
        }
        
        showMessage('success', `Imported ${successCount} properties${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      } catch (error: any) {
        showMessage('error', error.message || 'Failed to import properties');
      }
    };
    reader.readAsText(file);
  };


  const getComponentName = (component: number): string => {
    const componentMap: Record<number, string> = {
      0: 'Entity Select',
      3: 'Date Picker',
      4: 'Number Input',
      5: 'Checkbox',
      10: 'Text Input'
    };
    return componentMap[component] || 'Unknown';
  };

  const getTypeColor = (type: PropertyType): string => {
    const colorMap: Record<PropertyType, string> = {
      'string': 'bg-blue-100 text-blue-800',
      'number': 'bg-green-100 text-green-800',
      'boolean': 'bg-yellow-100 text-yellow-800',
      'date': 'bg-purple-100 text-purple-800',
      'datetime': 'bg-purple-100 text-purple-800',
      'json': 'bg-gray-100 text-gray-800',
      'array': 'bg-orange-100 text-orange-800',
      'reference': 'bg-pink-100 text-pink-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Property Registry</h1>
            <p className="text-gray-600 mt-2">
              Manage reusable property definitions for the configuration system
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Error from store */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Bar */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">{totalCount} properties</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Filtered:</span>
            <span className="font-semibold text-gray-900">{filteredProperties.length} properties</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">System:</span>
            <span className="font-semibold text-gray-900">{systemPropertiesCount} properties</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Custom:</span>
            <span className="font-semibold text-gray-900">{totalCount - systemPropertiesCount} properties</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search properties..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PropertyType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="datetime">DateTime</option>
            <option value="json">JSON</option>
            <option value="array">Array</option>
            <option value="reference">Reference</option>
          </select>

          {/* Category Filter */}
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={() => {
              setSelectedProperty(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Property
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <label className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading properties...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProperties.map((property) => (
            <div
              key={property.id}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 ${
                property.is_system ? 'border-l-4 border-gray-400' : ''
              }`}
            >
              {/* Property Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{property.caption}</h3>
                  <p className="text-sm text-gray-500 font-mono">{property.name}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(property.type)}`}>
                  {property.type}
                </span>
              </div>

              {/* Property Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Component:</span>
                  <span className="font-medium">{getComponentName(property.component)}</span>
                </div>

                {property.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{property.category}</span>
                  </div>
                )}

                {property.config?.isRequired && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required:</span>
                    <span className="font-medium text-red-600">Yes</span>
                  </div>
                )}

                {property.mixins && property.mixins.length > 0 && (
                  <div>
                    <span className="text-gray-600">Mixins:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {property.mixins.map(mixin => (
                        <span key={mixin} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                          {mixin}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleEdit(property)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  title="Edit property"
                >
                  <Edit2 className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleClone(property)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                  title="Clone property"
                >
                  <Copy className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleDelete(property)}
                  className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                  title="Delete property"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredProperties.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center items-center gap-2 mt-6 mb-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 7) {
                pageNumber = i + 1;
              } else if (currentPage <= 4) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNumber = totalPages - 6 + i;
              } else {
                pageNumber = currentPage - 3 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1 rounded ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProperties.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Filter className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">No properties found</p>
          {searchQuery || filterType !== 'all' || filterCategory !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterCategory('all');
              }}
              className="mt-3 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedProperty(null);
                setShowCreateModal(true);
              }}
              className="mt-3 text-blue-600 hover:text-blue-800"
            >
              Create your first property
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <PropertyEditModal
        property={showEditModal ? selectedProperty : null}
        isOpen={showEditModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />

      {/* Create/Clone Modal */}
      <PropertyEditModal
        property={showCreateModal ? selectedProperty : null}
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default PropertiesPage;