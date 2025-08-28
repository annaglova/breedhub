import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Copy, Download, Upload, ChevronLeft, ChevronRight, SortAsc } from 'lucide-react';
import { appConfigStore, type AppConfig } from '@breedhub/rxdb-store';
import FieldEditModal from '../components/FieldEditModal';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'array' | 'reference';
type SortField = 'id' | 'caption' | 'category' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

const FieldsConfigPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFieldType, setFilterFieldType] = useState<FieldType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<AppConfig | null>(null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [, forceUpdate] = useState({});

  // Use signals from store - filter only 'field' type configs
  const fields = appConfigStore.fields.value;
  const loading = appConfigStore.loading.value;
  const error = appConfigStore.error.value;
  const categories = appConfigStore.categories.value;
  
  const totalCount = fields.length;
  const systemFieldsCount = fields.filter(f => f.self_data?.isSystem).length;

  // Subscribe to signal changes
  useEffect(() => {
    const unsubscribe = appConfigStore.configsList.subscribe(() => {
      forceUpdate({});
    });
    return () => unsubscribe();
  }, []);

  // Filter and sort fields based on search and filters
  const filteredFields = useMemo(() => {
    let filtered = [...fields];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Field type filter (from self_data)
    if (filterFieldType !== 'all') {
      filtered = filtered.filter(f => f.self_data?.fieldType === filterFieldType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(f => f.category === filterCategory);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'caption':
          aVal = a.caption || '';
          bVal = b.caption || '';
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'created_at':
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        case 'updated_at':
          aVal = a.updated_at;
          bVal = b.updated_at;
          break;
        default:
          return 0;
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [fields, searchQuery, filterFieldType, filterCategory, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredFields.length / ITEMS_PER_PAGE);
  const paginatedFields = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredFields.slice(startIndex, endIndex);
  }, [filteredFields, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterFieldType, filterCategory, sortField, sortDirection]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDelete = async (field: AppConfig) => {
    if (confirm(`Are you sure you want to delete field "${field.caption || field.id}"?`)) {
      try {
        await appConfigStore.deleteConfig(field.id);
        showMessage('success', `Field "${field.caption || field.id}" deleted`);
      } catch (error: any) {
        showMessage('error', error.message || 'Failed to delete field');
      }
    }
  };

  const handleClone = (field: AppConfig) => {
    // Clone field with new ID
    const clonedField: Partial<AppConfig> = {
      ...field,
      id: `${field.id}_copy`,
      caption: field.caption ? `${field.caption} (Copy)` : `${field.id} (Copy)`,
      self_data: {
        ...field.self_data,
        isSystem: false
      },
      version: 1
    };
    delete (clonedField as any).created_at;
    delete (clonedField as any).updated_at;
    delete (clonedField as any)._deleted;
    delete (clonedField as any)._attachments;
    delete (clonedField as any)._rev;
    
    setSelectedField(clonedField as AppConfig);
    setShowCreateModal(true);
  };

  const handleEdit = (field: AppConfig) => {
    setSelectedField(field);
    setShowEditModal(true);
  };

  const handleModalSave = () => {
    showMessage('success', showEditModal ? 'Field updated successfully' : 'Field created successfully');
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedField(null);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedField(null);
  };

  const handleExport = () => {
    const json = JSON.stringify(filteredFields, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fields.json';
    a.click();
    URL.revokeObjectURL(url);
    showMessage('info', `Exported ${filteredFields.length} fields`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const importedFields = JSON.parse(json) as AppConfig[];
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const field of importedFields) {
          try {
            const { created_at, updated_at, _deleted, _attachments, _rev, ...fieldData } = field;
            await appConfigStore.createConfig({
              ...fieldData,
              type: 'field',
              deleted: false
            } as any);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`Failed to import field ${field.id}:`, error);
          }
        }
        
        showMessage('success', `Imported ${successCount} fields${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      } catch (error: any) {
        showMessage('error', error.message || 'Failed to import fields');
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

  const getFieldTypeColor = (fieldType: string): string => {
    const colorMap: Record<string, string> = {
      'string': 'bg-blue-100 text-blue-800',
      'number': 'bg-green-100 text-green-800',
      'boolean': 'bg-yellow-100 text-yellow-800',
      'date': 'bg-purple-100 text-purple-800',
      'datetime': 'bg-purple-100 text-purple-800',
      'json': 'bg-gray-100 text-gray-800',
      'array': 'bg-orange-100 text-orange-800',
      'reference': 'bg-pink-100 text-pink-800'
    };
    return colorMap[fieldType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Fields Configuration</h1>
            <p className="text-gray-600 mt-2">
              Manage field definitions and their properties for the configuration system
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
            <span className="font-semibold text-gray-900">{totalCount} fields</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Filtered:</span>
            <span className="font-semibold text-gray-900">{filteredFields.length} fields</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">System:</span>
            <span className="font-semibold text-gray-900">{systemFieldsCount} fields</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Custom:</span>
            <span className="font-semibold text-gray-900">{totalCount - systemFieldsCount} fields</span>
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
                placeholder="Search fields..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="id">Sort by ID</option>
              <option value="caption">Sort by Caption</option>
              <option value="category">Sort by Category</option>
              <option value="created_at">Sort by Created</option>
              <option value="updated_at">Sort by Updated</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              <SortAsc className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Field Type Filter */}
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterFieldType}
            onChange={(e) => setFilterFieldType(e.target.value as FieldType | 'all')}
          >
            <option value="all">All Field Types</option>
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
              setSelectedField(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Field
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

      {/* Fields Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading fields...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedFields.map((field) => (
            <div
              key={field.id}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 ${
                field.self_data?.isSystem ? 'border-l-4 border-gray-400' : ''
              }`}
            >
              {/* Field Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{field.caption || field.id}</h3>
                  <p className="text-sm text-gray-500 font-mono">{field.id}</p>
                </div>
                {field.self_data?.fieldType && (
                  <span className={`px-2 py-1 text-xs rounded-full ${getFieldTypeColor(field.self_data.fieldType)}`}>
                    {field.self_data.fieldType}
                  </span>
                )}
              </div>

              {/* Field Details */}
              <div className="space-y-2 text-sm">
                {field.self_data?.component !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Component:</span>
                    <span className="font-medium">{getComponentName(field.self_data.component)}</span>
                  </div>
                )}

                {field.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{field.category}</span>
                  </div>
                )}

                {field.self_data?.required && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required:</span>
                    <span className="font-medium text-red-600">Yes</span>
                  </div>
                )}

                {field.tags && field.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {field.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {field.deps && field.deps.length > 0 && (
                  <div className="text-xs text-gray-500">
                    Inherits from: {field.deps.join(', ')}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleEdit(field)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  title="Edit field"
                >
                  <Edit2 className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleClone(field)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                  title="Clone field"
                >
                  <Copy className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleDelete(field)}
                  className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                  title="Delete field"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredFields.length > ITEMS_PER_PAGE && (
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
      {!loading && filteredFields.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Filter className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">No fields found</p>
          {searchQuery || filterFieldType !== 'all' || filterCategory !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterFieldType('all');
                setFilterCategory('all');
              }}
              className="mt-3 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedField(null);
                setShowCreateModal(true);
              }}
              className="mt-3 text-blue-600 hover:text-blue-800"
            >
              Create your first field
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <FieldEditModal
        field={showEditModal ? selectedField : null}
        isOpen={showEditModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />

      {/* Create/Clone Modal */}
      <FieldEditModal
        field={showCreateModal ? selectedField : null}
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default FieldsConfigPage;