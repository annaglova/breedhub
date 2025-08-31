import React, { useState, useEffect } from 'react';
import { appConfigStore } from '@breedhub/rxdb-store';
import { ChevronRight, ChevronDown, Database, Tag, Search, X, Plus, GripVertical } from 'lucide-react';

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
  [entity: string]: Field[];
}

const Fields: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [groupedFields, setGroupedFields] = useState<GroupedFields>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [draggedProperty, setDraggedProperty] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<string | null>(null);

  // Load data from store
  useEffect(() => {
    const loadData = () => {
      const allConfigs = appConfigStore.configsList.value || [];
      
      // Get fields (both field and entity_field types)
      const fieldConfigs = allConfigs.filter(c => 
        (c.type === 'field' || c.type === 'entity_field') && !c._deleted
      );
      setFields(fieldConfigs);
      
      // Get properties (exclude is_system from right panel)
      const propertyConfigs = allConfigs.filter(c => 
        c.type === 'property' && !c._deleted && 
        c.id !== 'property_is_system' && c.id !== 'property_not_system'
      );
      setProperties(propertyConfigs);
    };

    loadData();
    
    // Refresh every second
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Group fields by category (entity name)
  useEffect(() => {
    const grouped: GroupedFields = {};
    
    fields.forEach(field => {
      // Use category field for grouping, fallback to 'uncategorized' if not set
      const entityName = field.category || 'uncategorized';
      
      if (!grouped[entityName]) {
        grouped[entityName] = [];
      }
      grouped[entityName].push(field);
    });
    
    // Sort fields within each group by ID
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.id.localeCompare(b.id));
    });
    
    setGroupedFields(grouped);
  }, [fields]);

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand/Collapse all
  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedFields)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Filter fields based on search
  const getFilteredGroups = (): GroupedFields => {
    if (!searchQuery) return groupedFields;
    
    const query = searchQuery.toLowerCase();
    const filtered: GroupedFields = {};
    
    Object.entries(groupedFields).forEach(([entity, entityFields]) => {
      const matchingFields = entityFields.filter(field => 
        field.id.toLowerCase().includes(query) ||
        JSON.stringify(field.self_data).toLowerCase().includes(query)
      );
      
      if (matchingFields.length > 0) {
        filtered[entity] = matchingFields;
      }
    });
    
    return filtered;
  };

  // Filter properties based on search
  const getFilteredProperties = () => {
    if (!propertySearchQuery) return properties;
    
    const query = propertySearchQuery.toLowerCase();
    return properties.filter(p => 
      p.id.toLowerCase().includes(query) ||
      JSON.stringify(p.self_data).toLowerCase().includes(query)
    );
  };

  // Get field display name
  const getFieldDisplayName = (field: Field) => {
    const id = field.id;
    // Remove "field_" prefix
    if (id.startsWith('field_')) {
      return id.substring(6); // Remove 'field_' prefix
    }
    return id;
  };

  // Get property color
  const getPropertyColor = (property: Property) => {
    const data = JSON.stringify(property.self_data);
    if (data.includes('required')) return 'text-red-600';
    if (data.includes('system')) return 'text-yellow-600';
    if (data.includes('primary')) return 'text-purple-600';
    if (data.includes('unique')) return 'text-blue-600';
    if (data.includes('maxLength')) return 'text-green-600';
    return 'text-gray-600';
  };

  const filteredGroups = getFilteredGroups();
  // Add dependency to field
  const addDependency = async (fieldId: string, propertyId: string) => {
    try {
      // Find the field in store
      const allConfigs = appConfigStore.configsList.value || [];
      const field = allConfigs.find(c => c.id === fieldId);
      
      if (!field) {
        alert('Field not found');
        return;
      }

      // Check if dependency already exists
      if (field.deps && field.deps.includes(propertyId)) {
        console.log('Dependency already exists');
        return;
      }

      // Add the dependency
      const newDeps = [...(field.deps || []), propertyId];
      
      // Update the field
      await appConfigStore.upsert({
        ...field,
        deps: newDeps,
        updated_at: new Date().toISOString()
      });
      
      console.log(`Added dependency ${propertyId} to ${fieldId}`);
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
      // Find the field in store
      const allConfigs = appConfigStore.configsList.value || [];
      const field = allConfigs.find(c => c.id === fieldId);
      
      if (!field) {
        alert('Field not found');
        return;
      }

      // Remove the dependency
      const newDeps = (field.deps || []).filter(d => d !== depToRemove);
      
      // Update the field
      await appConfigStore.upsert({
        ...field,
        deps: newDeps,
        updated_at: new Date().toISOString()
      });
      
      console.log(`Removed dependency ${depToRemove} from ${fieldId}`);
    } catch (error) {
      console.error('Error removing dependency:', error);
      alert('Failed to remove dependency');
    }
  };

  const filteredProperties = getFilteredProperties();
  const sortedGroupNames = Object.keys(filteredGroups).sort((a, b) => {
    // Put 'base' first, then 'uncategorized' last
    if (a === 'base') return -1;
    if (b === 'base') return 1;
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Fields Registry</h1>
          <p className="text-gray-600 text-sm mt-1">Browse entity fields and properties</p>
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
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
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
              {sortedGroupNames.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No fields found
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedGroupNames.map(entityName => (
                    <div key={entityName} className="border rounded-lg">
                      <button
                        onClick={() => toggleGroup(entityName)}
                        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(entityName) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium">
                            {entityName === 'base' ? 'base_fields' : 
                             entityName === 'uncategorized' ? 'uncategorized' : 
                             `${entityName}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({filteredGroups[entityName].length})
                          </span>
                        </div>
                      </button>

                      {expandedGroups.has(entityName) && (
                        <div className="border-t">
                          {filteredGroups[entityName].map(field => (
                            <div
                              key={field.id}
                              className={`px-8 py-3 border-b last:border-b-0 transition-all relative ${
                                dragOverField === field.id ? 'bg-blue-50 border-l-4 border-l-blue-400' : 'hover:bg-gray-50'
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
                              <div className="relative">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-mono text-sm text-gray-700">
                                      {getFieldDisplayName(field)}
                                    </div>
                                    {field.deps && field.deps.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {field.deps.map(dep => {
                                          const depName = dep.replace('property_', '');
                                          // Color coding for different property types
                                          let badgeColor = 'bg-gray-100 text-gray-600';
                                          if (depName.includes('required')) badgeColor = 'bg-red-100 text-red-700';
                                          else if (depName.includes('unique')) badgeColor = 'bg-blue-100 text-blue-700';
                                          else if (depName.includes('primary')) badgeColor = 'bg-purple-100 text-purple-700';
                                          else if (depName.includes('maxlength')) badgeColor = 'bg-green-100 text-green-700';
                                          else if (depName.includes('system')) badgeColor = 'bg-yellow-100 text-yellow-700';
                                          
                                          const isSystemProperty = dep === 'property_is_system' || dep === 'property_not_system';
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
                                
                                {/* Add button positioned at bottom-right */}
                                <div className="absolute bottom-0 right-0">
                                  <button
                                    onClick={() => setShowPropertyDropdown(showPropertyDropdown === field.id ? null : field.id)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Add property"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  {showPropertyDropdown === field.id && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                      <div className="p-2">
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Select property to add:</div>
                                        {properties
                                          .filter(prop => prop.id !== 'property_is_system' && prop.id !== 'property_not_system') // Exclude system properties from dropdown
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Stats */}
              <div className="mt-4 pt-4 border-t text-center text-xs text-gray-500">
                Total: {Object.values(filteredGroups).reduce((sum, fields) => sum + fields.length, 0)} fields 
                in {sortedGroupNames.length} entities
              </div>
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
                  {filteredProperties.length} items
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
              {filteredProperties.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No properties found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProperties.map(property => (
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

export default Fields;