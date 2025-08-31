import React, { useState, useEffect } from 'react';
import { appConfigStore } from '@breedhub/rxdb-store';
import { ChevronRight, ChevronDown, Database, Tag, Search, X, Plus, GripVertical, Layers, Book, Package, Edit } from 'lucide-react';
import { addPropertyToField, removePropertyFromField } from '../utils/config-merge';

interface Field {
  id: string;
  type: string;
  self_data: any;
  data: any;
  deps: string[];
  caption?: string;
  category?: string;
  tags?: string[];
  version?: number;
  _deleted?: boolean;
}

interface Property {
  id: string;
  type: string;
  self_data: any;
  data: any;
  deps: string[];
  caption?: string;
  category?: string;
  tags?: string[];
  version?: number;
  _deleted?: boolean;
}

interface GroupedFields {
  [key: string]: Field[];
}

interface HierarchicalStructure {
  base: Field[];
  main: {
    [entity: string]: {
      fields: Field[];
      children: {
        [childEntity: string]: Field[];
      };
    };
  };
  dictionaries: {
    [dictionary: string]: Field[];
  };
}

const FieldsV2: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [structure, setStructure] = useState<HierarchicalStructure>({
    base: [],
    main: {},
    dictionaries: {}
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main-entities']));
  const [searchQuery, setSearchQuery] = useState('');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [draggedProperty, setDraggedProperty] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingOverrideData, setEditingOverrideData] = useState<string>('');

  // Load data from store
  useEffect(() => {
    const loadData = () => {
      const allConfigs = appConfigStore.configsList.value || [];
      
      // Get fields
      const fieldConfigs = allConfigs.filter(c => 
        (c.type === 'field' || c.type === 'entity_field') && !c._deleted
      );
      setFields(fieldConfigs);
      
      // Get properties (exclude is_system from right panel)
      const propertyConfigs = allConfigs.filter(c => 
        c.type === 'property' && !c._deleted && c.id !== 'property_is_system'
      );
      setProperties(propertyConfigs);
    };

    loadData();
    
    // Refresh every second
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Build hierarchical structure
  useEffect(() => {
    const newStructure: HierarchicalStructure = {
      base: [],
      main: {},
      dictionaries: {}
    };

    fields.forEach(field => {
      // Base fields
      if (field.category === 'base' || field.type === 'field') {
        newStructure.base.push(field);
      }
      // Entity fields
      else if (field.type === 'entity_field' && field.tags) {
        if (field.tags.includes('main')) {
          // Main entity field
          const entityName = field.tags.find(t => t !== 'main') || field.category;
          if (!newStructure.main[entityName]) {
            newStructure.main[entityName] = { fields: [], children: {} };
          }
          newStructure.main[entityName].fields.push(field);
        } else if (field.tags.includes('child')) {
          // Child entity field
          const parentEntity = field.tags.find(t => t !== 'child') || '';
          if (parentEntity) {
            if (!newStructure.main[parentEntity]) {
              newStructure.main[parentEntity] = { fields: [], children: {} };
            }
            if (!newStructure.main[parentEntity].children[field.category]) {
              newStructure.main[parentEntity].children[field.category] = [];
            }
            newStructure.main[parentEntity].children[field.category].push(field);
          }
        } else if (field.tags.includes('dictionary')) {
          // Dictionary field
          if (!newStructure.dictionaries[field.category]) {
            newStructure.dictionaries[field.category] = [];
          }
          newStructure.dictionaries[field.category].push(field);
        }
      }
      // Fallback for fields without tags
      else if (field.type === 'entity_field') {
        if (!newStructure.dictionaries[field.category]) {
          newStructure.dictionaries[field.category] = [];
        }
        newStructure.dictionaries[field.category].push(field);
      }
    });

    // Sort everything
    newStructure.base.sort((a, b) => a.id.localeCompare(b.id));
    Object.values(newStructure.main).forEach(entity => {
      entity.fields.sort((a, b) => a.id.localeCompare(b.id));
      Object.values(entity.children).forEach(childFields => {
        childFields.sort((a, b) => a.id.localeCompare(b.id));
      });
    });
    Object.values(newStructure.dictionaries).forEach(dictFields => {
      dictFields.sort((a, b) => a.id.localeCompare(b.id));
    });

    setStructure(newStructure);
  }, [fields]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Add dependency to field
  const addDependency = async (fieldId: string, propertyId: string) => {
    try {
      const result = await addPropertyToField(fieldId, propertyId);
      
      if (!result.success) {
        if (result.error === 'Dependency already exists') {
          console.log('Dependency already exists');
        } else {
          alert(result.error || 'Failed to add dependency');
        }
        return;
      }
      
      console.log(`Successfully added ${propertyId} to ${fieldId} and updated ${result.updatedConfigs.length} configs`);
    } catch (error) {
      console.error('Error adding dependency:', error);
      alert('Failed to add dependency');
    }
  };

  // Remove dependency from field
  const removeDependency = async (fieldId: string, depToRemove: string) => {
    if (!confirm(`Remove dependency "${depToRemove.replace('property_', '')}" from field "${fieldId}"?`)) {
      return;
    }

    try {
      const result = await removePropertyFromField(fieldId, depToRemove);
      
      if (!result.success) {
        alert(result.error || 'Failed to remove dependency');
        return;
      }
      
      console.log(`Successfully removed ${depToRemove} from ${fieldId} and updated ${result.updatedConfigs.length} configs`);
    } catch (error) {
      console.error('Error removing dependency:', error);
      alert('Failed to remove dependency');
    }
  };

  // Start editing field override_data
  const startEditField = (field: Field) => {
    setEditingField(field.id);
    setEditingOverrideData(JSON.stringify(field.override_data || {}, null, 2));
  };

  // Save field override_data
  const saveFieldOverride = async () => {
    if (!editingField) return;

    try {
      const overrideData = JSON.parse(editingOverrideData || '{}');
      
      const allConfigs = appConfigStore.configsList.value || [];
      const field = allConfigs.find(c => c.id === editingField);
      
      if (!field) {
        alert('Field not found');
        return;
      }

      await appConfigStore.updateConfig(editingField, {
        ...field,
        override_data: overrideData,
        data: { ...(field.self_data || {}), ...overrideData },
        updated_at: new Date().toISOString()
      });

      setEditingField(null);
      setEditingOverrideData('');
    } catch (error) {
      alert('Invalid JSON');
    }
  };

  // Get field display name
  const getFieldDisplayName = (field: Field) => {
    const id = field.id;
    if (id.startsWith('field_')) {
      return id.substring(6);
    }
    // Remove entity prefix for entity fields
    const parts = id.split('_field_');
    return parts.length > 1 ? parts[1] : id;
  };

  // Get property color
  const getPropertyColor = (property: Property) => {
    if (property.id === 'property_is_system') {
      return 'text-yellow-600';
    }
    const data = JSON.stringify(property.self_data);
    if (data.includes('required')) return 'text-red-600';
    if (data.includes('system')) return 'text-yellow-600';
    if (data.includes('primary')) return 'text-purple-600';
    if (data.includes('unique')) return 'text-blue-600';
    if (data.includes('maxLength')) return 'text-green-600';
    return 'text-gray-600';
  };

  // Render field item
  const renderFieldItem = (field: Field) => {
    return (
      <div
        key={field.id}
        className={`relative px-4 py-2 bg-gray-50 rounded-md transition-all ${
          dragOverField === field.id ? 'bg-blue-50 border-l-4 border-l-blue-400' : 'hover:bg-gray-100'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverField(field.id);
        }}
        onDragLeave={() => {
          setDragOverField(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedProperty) {
            addDependency(field.id, draggedProperty);
          }
          setDragOverField(null);
          setDraggedProperty(null);
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-mono text-sm text-gray-700">
              {getFieldDisplayName(field)}
            </div>
            {field.deps && field.deps.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.deps.map(dep => {
                  const depName = dep.replace('property_', '');
                  let badgeColor = 'bg-gray-100 text-gray-600';
                  if (depName.includes('required')) badgeColor = 'bg-red-100 text-red-700';
                  else if (depName.includes('unique')) badgeColor = 'bg-blue-100 text-blue-700';
                  else if (depName.includes('primary')) badgeColor = 'bg-purple-100 text-purple-700';
                  else if (depName.includes('maxlength')) badgeColor = 'bg-green-100 text-green-700';
                  else if (depName.includes('system')) badgeColor = 'bg-yellow-100 text-yellow-700';
                  
                  const isSystemProperty = dep === 'property_is_system';
                  return (
                    <span
                      key={dep}
                      className={`inline-flex items-center gap-1 ${isSystemProperty ? 'px-2' : 'pl-2 pr-1'} py-0.5 rounded-full text-xs font-medium ${badgeColor} group ${!isSystemProperty ? 'hover:pr-0.5' : ''} transition-all`}
                      title={dep}
                    >
                      <span>{depName}</span>
                      {!isSystemProperty && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDependency(field.id, dep);
                          }}
                          className="opacity-60 hover:opacity-100 hover:bg-white/20 rounded-full p-0.5 transition-all"
                          title={`Remove ${depName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Edit and Add buttons */}
        <div className="absolute bottom-0 right-0 flex gap-1">
          <button
            onClick={() => startEditField(field)}
            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Edit override data"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPropertyDropdown(showPropertyDropdown === field.id ? null : field.id)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Add property"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Property dropdown */}
        {showPropertyDropdown === field.id && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 mb-1">Select property to add:</div>
                {properties
                  .filter(prop => prop.id !== 'property_is_system' && prop.id !== 'property_not_system')
                  .map(prop => {
                  const propName = prop.id.replace('property_', '');
                  const alreadyAdded = field.deps?.includes(prop.id);
                  return (
                    <button
                      key={prop.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          addDependency(field.id, prop.id);
                        }
                        setShowPropertyDropdown(null);
                      }}
                      disabled={alreadyAdded}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-50 transition-colors ${
                        alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <span className={getPropertyColor(prop)}>{propName}</span>
                      {alreadyAdded && <span className="text-gray-400 ml-1">(added)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        
        {/* Edit modal */}
        {editingField === field.id && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-2">Edit Override Data for {field.id}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Override Data (JSON)
                </label>
                <textarea
                  value={editingOverrideData}
                  onChange={(e) => setEditingOverrideData(e.target.value)}
                  className="w-full h-64 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{}'
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingField(null);
                    setEditingOverrideData('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFieldOverride}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Fields Registry</h1>
          <p className="text-gray-600 text-sm mt-1">Hierarchical view of entity fields and properties</p>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Fields Tree */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Entity Fields
                </h2>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
              {/* Base Fields Section */}
              <div className="mb-4">
                <button
                  onClick={() => toggleSection('base')}
                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {expandedSections.has('base') ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Base Fields</span>
                  <span className="text-xs text-gray-500">({structure.base.length})</span>
                </button>
                
                {expandedSections.has('base') && (
                  <div className="mt-2 ml-6 bg-white rounded-lg p-2 space-y-1">
                    {structure.base.map(field => renderFieldItem(field))}
                  </div>
                )}
              </div>

              {/* Main Entities Section */}
              {Object.keys(structure.main).length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => toggleSection('main-entities')}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {expandedSections.has('main-entities') ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">Main Entities</span>
                    <span className="text-xs text-gray-500">({Object.keys(structure.main).length})</span>
                  </button>
                  
                  {expandedSections.has('main-entities') && Object.entries(structure.main).map(([entityName, entityData]) => (
                    <div key={entityName} className="ml-4 mb-3">
                      {/* Entity Group (capitalized) */}
                      <button
                        onClick={() => toggleSection(`group-${entityName}`)}
                        className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedSections.has(`group-${entityName}`) ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                        <span className="font-semibold text-sm text-gray-800">
                          {entityName.charAt(0).toUpperCase() + entityName.slice(1)} Section
                        </span>
                        <span className="text-xs text-gray-500">
                          ({1 + Object.keys(entityData.children).length} tables)
                        </span>
                      </button>
                      
                      {expandedSections.has(`group-${entityName}`) && (
                        <div className="ml-6 mt-2">
                          {/* Main entity table */}
                          <div className="mb-2">
                            <button
                              onClick={() => toggleSection(`main-${entityName}`)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              {expandedSections.has(`main-${entityName}`) ? (
                                <ChevronDown className="w-3 h-3 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-500" />
                              )}
                              <span className="text-sm font-medium">{entityName}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">main</span>
                              <span className="text-xs text-gray-500">({entityData.fields.length} fields)</span>
                            </button>
                            
                            {expandedSections.has(`main-${entityName}`) && entityData.fields.length > 0 && (
                              <div className="ml-4 mt-1 bg-white rounded-lg p-2 space-y-1">
                                {entityData.fields.map(field => renderFieldItem(field))}
                              </div>
                            )}
                          </div>
                          
                          {/* Child entity tables */}
                          {Object.entries(entityData.children).map(([childName, childFields]) => (
                            <div key={childName} className="mb-2">
                              <button
                                onClick={() => toggleSection(`child-${childName}`)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                {expandedSections.has(`child-${childName}`) ? (
                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                )}
                                <span className="text-sm">{childName}</span>
                                <div className="flex gap-1">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">child</span>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{entityName}</span>
                                </div>
                                <span className="text-xs text-gray-500">({childFields.length} fields)</span>
                              </button>
                              
                              {expandedSections.has(`child-${childName}`) && (
                                <div className="ml-4 mt-1 bg-white rounded-lg p-2 space-y-1">
                                  {childFields.map(field => renderFieldItem(field))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Dictionaries Section */}
              {Object.keys(structure.dictionaries).length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => toggleSection('dictionaries')}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {expandedSections.has('dictionaries') ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <Book className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold">Dictionaries</span>
                    <span className="text-xs text-gray-500">({Object.keys(structure.dictionaries).length})</span>
                  </button>
                  
                  {expandedSections.has('dictionaries') && (
                    <div className="ml-6">
                      {Object.entries(structure.dictionaries).map(([dictName, dictFields]) => (
                        <div key={dictName} className="mt-2">
                          <button
                            onClick={() => toggleSection(`dict-${dictName}`)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {expandedSections.has(`dict-${dictName}`) ? (
                              <ChevronDown className="w-3 h-3 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-500" />
                            )}
                            <span className="text-sm">{dictName}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">dict</span>
                            <span className="text-xs text-gray-500">({dictFields.length})</span>
                          </button>
                          
                          {expandedSections.has(`dict-${dictName}`) && (
                            <div className="ml-4 mt-1 bg-white rounded-lg p-2 space-y-1">
                              {dictFields.map(field => renderFieldItem(field))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Properties */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Properties
                </h2>
                <span className="text-xs text-gray-500">
                  {properties.length} items
                </span>
              </div>
              {draggedProperty && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2">
                  ↔️ Drag property to a field to add it as dependency
                </div>
              )}
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
              {properties.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No properties found
                </div>
              ) : (
                <div className="space-y-2">
                  {properties
                    .filter(p => !propertySearchQuery || 
                      p.id.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
                      JSON.stringify(p.self_data).toLowerCase().includes(propertySearchQuery.toLowerCase())
                    )
                    .map(property => (
                    <div
                      key={property.id}
                      className={`p-3 border rounded-lg transition-all cursor-move ${
                        draggedProperty === property.id ? 'opacity-50 scale-95 border-blue-400' : 'hover:bg-gray-50'
                      }`}
                      draggable
                      onDragStart={() => setDraggedProperty(property.id)}
                      onDragEnd={() => {
                        setDraggedProperty(null);
                        setDragOverField(null);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className={`font-mono text-sm ${getPropertyColor(property)}`}>
                            {property.id.replace('property_', '')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(property.self_data || {}).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="inline-block mr-3">
                                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldsV2;