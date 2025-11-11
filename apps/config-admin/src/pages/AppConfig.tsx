import { appConfigStore } from "@breedhub/rxdb-store";
import {
  ArrowUp,
  ArrowDown,
  Book,
  ChevronDown,
  ChevronRight,
  Database,
  Edit,
  Eye,
  GripVertical,
  Layers,
  Package,
  Plus,
  Settings,
  Tag,
  Trash,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import ConfigEditModal from "../components/ConfigEditModal";
import ConfigViewModal from "../components/ConfigViewModal";
import WorkspaceHeader from "../components/WorkspaceHeader";
import PropertyCategoryIcon from "../components/PropertyCategoryIcon";
import type { BaseConfig, TreeNode } from "../types/config-types";
import { configTypes, getAvailableChildTypes } from "../types/config-types";

// Type aliases for clarity
type Field = BaseConfig;
type Property = BaseConfig;
type WorkingConfig = BaseConfig;

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

const AppConfig: React.FC = () => {
  // Working configs state
  const [workingConfigs, setWorkingConfigs] = useState<WorkingConfig[]>([]);
  const [configTree, setConfigTree] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [configSearchQuery, setConfigSearchQuery] = useState("");
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [viewingConfig, setViewingConfig] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editingConfigData, setEditingConfigData] = useState<string>("");
  const [editingConfigCaption, setEditingConfigCaption] = useState<string>("");
  const [editingConfigVersion, setEditingConfigVersion] = useState<number>(1);
  
  // Field override editor state
  const [fieldOverrideEditor, setFieldOverrideEditor] = useState<{
    parentConfigId: string;
    fieldId: string;
    fieldOverrideData: string;
  } | null>(null);

  // Fields and properties state
  const [fields, setFields] = useState<Field[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [structure, setStructure] = useState<HierarchicalStructure>({
    base: [],
    main: {},
    dictionaries: {},
  });
  const [filteredStructure, setFilteredStructure] = useState<HierarchicalStructure>({
    base: [],
    main: {},
    dictionaries: {},
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["main-entities"])
  );
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [propertyFilterType, setPropertyFilterType] = useState<string>("all");
  const [showSystemProperties, setShowSystemProperties] = useState(false);
  const [draggedProperty, setDraggedProperty] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [draggedConfig, setDraggedConfig] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [dragOverConfig, setDragOverConfig] = useState<string | null>(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<
    string | null
  >(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingOverrideData, setEditingOverrideData] = useState<string>("");
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [editingVersion, setEditingVersion] = useState<number>(1);
  const [viewingField, setViewingField] = useState<string | null>(null);
  const [viewingFieldInConfig, setViewingFieldInConfig] = useState<string | null>(null);
  const [viewingProperty, setViewingProperty] = useState<string | null>(null);

  // Handle escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedConfig(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Build tree structure from configs

  // Load data from store
  useEffect(() => {
    const loadData = () => {
      // Get working configs using store method
      const working = appConfigStore.getWorkingConfigs();
      setWorkingConfigs(working);

      // Build tree for working configs using store method
      const tree = appConfigStore.buildConfigTree(working);
      setConfigTree(tree);

      // Get fields using store method
      const fieldConfigs = appConfigStore.getFields();
      setFields(fieldConfigs);

      // Get properties using store method
      const propertyConfigs = appConfigStore.getProperties();
      // Include is_system property in this view (same as Properties page)
      const allConfigs = appConfigStore.configsList.value || [];
      const systemProp = allConfigs.find(c => c.id === "property_is_system" && !c._deleted);
      if (systemProp) {
        setProperties([...propertyConfigs, systemProp]);
      } else {
        setProperties(propertyConfigs);
      }
    };

    loadData();

    // Refresh every second
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-expand all nodes when searching Working Configs
  useEffect(() => {
    if (configSearchQuery) {
      // When searching, expand all nodes to show all matches
      const allNodeIds = appConfigStore.getAllNodeIds(configTree);
      setExpandedNodes(new Set(allNodeIds));
    } else {
      // When not searching, collapse all (or keep previous state)
      // You can choose to keep previous state or collapse all
      // setExpandedNodes(new Set()); // Collapse all
    }
  }, [configSearchQuery, configTree]);

  // Auto-expand sections when searching
  useEffect(() => {
    if (searchQuery) {
      // When searching, expand all sections to show results
      const allSections = new Set<string>();
      allSections.add("base");
      allSections.add("main-entities");
      allSections.add("dictionaries");

      // Add all entity groups and their main sections (use filtered structure)
      Object.keys(filteredStructure.main).forEach((entity) => {
        allSections.add(`group-${entity}`);
        allSections.add(`main-${entity}`); // Expand the main entity itself

        // Also expand child entities if they exist
        const entityData = filteredStructure.main[entity];
        if (entityData?.children) {
          Object.keys(entityData.children).forEach((child) => {
            allSections.add(`child-${child}`);
          });
        }
      });

      // Add all dictionary groups
      Object.keys(filteredStructure.dictionaries).forEach((dict) => {
        allSections.add(`dict-${dict}`);
      });

      setExpandedSections(allSections);
    }
  }, [searchQuery, filteredStructure]);

  // Build hierarchical structure
  useEffect(() => {
    const newStructure = appConfigStore.buildFieldsStructure(fields);
    setStructure(newStructure);
    // Apply filter if search query exists
    const filtered = appConfigStore.filterFieldsStructure(newStructure, searchQuery);
    setFilteredStructure(filtered);
  }, [fields, searchQuery]);

  // Check if property can be applied to a specific config type
  const canApplyPropertyToType = (propertyId: string, targetType: string): boolean => {
    const property = properties.find(p => p.id === propertyId);
    if (!property?.tags || property.tags.length === 0) {
      return true; // No tags means it can be applied anywhere
    }
    
    // Support both formats: "field" and "applicable_to:field"
    let allowedTypes = [];
    
    // Check for new format tags (applicable_to:)
    const applicableTags = property.tags.filter(t => t.startsWith('applicable_to:'));
    if (applicableTags.length > 0) {
      allowedTypes = applicableTags.map(t => t.replace('applicable_to:', ''));
    } else {
      // Use old format tags directly (field, app, etc.)
      allowedTypes = property.tags.filter(t => !t.includes(':'));
    }
    
    // If no allowed types found, allow everywhere
    if (allowedTypes.length === 0) {
      return true;
    }
    
    return allowedTypes.includes(targetType);
  };

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

  // Toggle node expansion for configs
  const toggleNodeExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Delete config using store method directly
  const deleteConfig = async (configId: string) => {
    const config = workingConfigs.find((c) => c.id === configId);
    const hasChildren = config?.deps && config.deps.length > 0;
    const confirmMessage = hasChildren
      ? `Delete config "${configId}" and all its child configs?`
      : `Delete config "${configId}"?`;

    if (!confirm(confirmMessage)) return;
    await appConfigStore.deleteConfigWithChildren(configId);
  };

  // Reorder child in parent's deps
  const reorderChild = async (parentId: string, childId: string, direction: 'up' | 'down') => {
    const parent = workingConfigs.find((c) => c.id === parentId);
    if (!parent || !parent.deps) return;

    // Filter out properties - only work with config deps
    const configDeps = parent.deps.filter(d => !d.startsWith('property_'));

    const currentIndex = configDeps.indexOf(childId);
    if (currentIndex === -1) return;

    // Check boundaries within config deps only
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === configDeps.length - 1) return;

    // Swap positions in config deps
    const newConfigDeps = [...configDeps];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newConfigDeps[currentIndex], newConfigDeps[newIndex]] = [newConfigDeps[newIndex], newConfigDeps[currentIndex]];

    // Reconstruct full deps array: properties first, then reordered configs
    const propertyDeps = parent.deps.filter(d => d.startsWith('property_'));
    const newDeps = [...propertyDeps, ...newConfigDeps];

    // Update parent config
    await appConfigStore.updateConfig(parentId, { deps: newDeps });
  };

  // Start editing config
  const startEditConfig = (configId: string) => {
    const config = workingConfigs.find((c) => c.id === configId);
    if (!config) return;

    setEditingConfig(configId);
    setEditingConfigData(JSON.stringify(config.override_data || {}, null, 2));
    setEditingConfigCaption(config.caption || "");
    setEditingConfigVersion(config.version || 1);
  };

  // Save config edit
  const saveConfigEdit = async () => {
    if (!editingConfig) return;
    try {
      const overrideData = JSON.parse(editingConfigData || "{}");
      await appConfigStore.updateTemplate(editingConfig, {
        caption: editingConfigCaption,
        version: editingConfigVersion,
        override_data: overrideData,
      });
      setEditingConfig(null);
      setEditingConfigData("");
      setEditingConfigCaption("");
      setEditingConfigVersion(1);
    } catch (error) {
      alert("Invalid JSON");
    }
  };

  // Create config from template  
  const createFromTemplate = async (templateId: string) => {
    await appConfigStore.createConfigFromTemplate(templateId, createParentId);
    setShowTemplateSelect(false);
    setCreateParentId(null);
    if (createParentId) {
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(createParentId);
      setExpandedNodes(newExpanded);
    }
  };

  // Create working config
  const createWorkingConfig = async (type: string, parentId: string | null) => {
    await appConfigStore.createWorkingConfig(type, parentId);
    setShowAddModal(false);
    setAddParentId(null);
    if (parentId) {
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(parentId);
      setExpandedNodes(newExpanded);
    }
  };
  
  // Open field override editor
  const openFieldOverrideEditor = (parentConfigId: string, fieldId: string) => {
    const parentConfig = workingConfigs.find(c => c.id === parentConfigId);
    
    if (!parentConfig || !appConfigStore.isGroupingConfigType(parentConfig.type)) {
      console.error('Invalid parent config or not a grouping type');
      return;
    }
    
    // Get existing override for this field from parent's override_data
    // For all grouping configs (fields, sort, filter), overrides are stored directly under field ID
    const existingOverride = parentConfig.override_data?.[fieldId] || {};
    
    setFieldOverrideEditor({
      parentConfigId,
      fieldId,
      fieldOverrideData: JSON.stringify(existingOverride, null, 2)
    });
  };

  // Save field override
  const saveFieldOverride = async () => {
    if (!fieldOverrideEditor) return;

    try {
      const fieldOverride = JSON.parse(fieldOverrideEditor.fieldOverrideData || "{}");
      const parentConfig = workingConfigs.find(c => c.id === fieldOverrideEditor.parentConfigId);
      
      if (!parentConfig) {
        alert("Parent config not found");
        return;
      }

      // Get current override_data or initialize - create a deep copy to avoid extensibility issues
      let currentOverrideData = JSON.parse(JSON.stringify(parentConfig.override_data || {}));
      
      // For grouping configs (fields, sort, filter), store overrides directly by field ID
      // For other configs, store overrides under fields key
      const isGroupingConfig = ['fields', 'sort', 'filter'].includes(parentConfig.type);

      if (isGroupingConfig) {
        // Grouping configs store overrides directly by field ID
        if (Object.keys(fieldOverride).length > 0) {
          currentOverrideData[fieldOverrideEditor.fieldId] = fieldOverride;
        } else {
          delete currentOverrideData[fieldOverrideEditor.fieldId];
        }
      } else {
        // Other configs store overrides under fields key
        if (!currentOverrideData.fields) {
          currentOverrideData.fields = {};
        }

        if (Object.keys(fieldOverride).length > 0) {
          currentOverrideData.fields[fieldOverrideEditor.fieldId] = fieldOverride;
        } else {
          delete currentOverrideData.fields[fieldOverrideEditor.fieldId];
        }
      }

      console.log('Saving field override:', {
        parentConfigId: fieldOverrideEditor.parentConfigId,
        fieldId: fieldOverrideEditor.fieldId,
        fieldOverride,
        currentOverrideData
      });

      // Update parent config's override_data
      await appConfigStore.updateTemplate(fieldOverrideEditor.parentConfigId, {
        override_data: currentOverrideData
      });

      setFieldOverrideEditor(null);
    } catch (error) {
      console.error("Error saving field override:", error);
      alert(error instanceof Error ? error.message : "Failed to save field override");
    }
  };
  

  // Get available templates for current level
  const getAvailableTemplates = (parentType: string | null) => {
    return appConfigStore.getAvailableTemplates(parentType);
  };

  // Start editing field
  const startEditField = (field: Field) => {
    setEditingField(field.id);
    setEditingOverrideData(JSON.stringify(field.override_data || {}, null, 2));
    setEditingCaption(field.caption || "");
    setEditingVersion(field.version || 1);
  };

  // Save field override_data
  const saveFieldOverrideData = async () => {
    if (!editingField) return;

    try {
      const overrideData = JSON.parse(editingOverrideData || "{}");

      const field = fields.find((f) => f.id === editingField);

      if (!field) {
        alert("Field not found");
        return;
      }

      // Update caption and version first
      await appConfigStore.updateConfig(editingField, {
        caption: editingCaption,
        version: editingVersion,
      });

      // Then update override data
      const result = await appConfigStore.updateFieldOverride(
        editingField,
        overrideData
      );

      if (!result.success) {
        alert(result.error || "Failed to update field");
        return;
      }

      setEditingField(null);
      setEditingOverrideData("");
      setEditingCaption("");
      setEditingVersion(1);
    } catch (error) {
      alert("Invalid JSON");
    }
  };

  // Render field item with full functionality restored
  const renderFieldItem = (field: Field, index?: number) => {
    // Check if field is a base field (all fields with type: 'field')
    const isBaseField = field.type === 'field';
    const hasOverride =
      field.override_data && Object.keys(field.override_data).length > 0;
    const hasDeps = field.deps && field.deps.length > 0;
    const propertyDeps =
      field.deps?.filter((d) => d.startsWith("property_")) || [];

    return (
      <div
        key={field.id}
        draggable={!isBaseField}
        onDragStart={(e) => {
          if (isBaseField) {
            e.preventDefault();
            return;
          }
          console.log("Field drag start:", field.id);
          e.dataTransfer.setData('text/plain', field.id);
          e.dataTransfer.effectAllowed = 'copy';
          // Use setTimeout to prevent drag interruption in overflow containers
          setTimeout(() => setDraggedField(field.id), 0);
        }}
        onDragEnd={() => {
          if (!isBaseField) {
            setDraggedField(null);
            setDragOverConfig(null);
          }
        }}
        onDragOver={(e) => {
          if (draggedProperty) {
            // Check if property can be applied to fields based on tags
            if (canApplyPropertyToType(draggedProperty, 'field') || 
                canApplyPropertyToType(draggedProperty, 'entity_field')) {
              e.preventDefault();
              setDragOverField(field.id);
            }
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setDragOverField(null);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedProperty && !field.deps?.includes(draggedProperty)) {
            // Check if property can be applied to fields based on tags
            if (!canApplyPropertyToType(draggedProperty, 'field') && 
                !canApplyPropertyToType(draggedProperty, 'entity_field')) {
              const property = properties.find(p => p.id === draggedProperty);
              const tags = property?.tags || [];
              const allowedTypes = tags.filter(t => !t.includes(':'));
              alert(`Property "${draggedProperty.replace('property_', '')}" cannot be applied to fields. It can only be applied to: ${allowedTypes.join(', ')}`);
              setDraggedProperty(null);
              setDragOverField(null);
              return;
            }
            
            await appConfigStore.addDependencyWithUI(field.id, draggedProperty);
          }
          setDraggedProperty(null);
          setDragOverField(null);
        }}
        className={`relative px-4 py-2 mb-2 rounded-md transition-all min-h-[2.5rem] ${
          isBaseField 
            ? "bg-gray-100 hover:bg-gray-100 cursor-default" 
            : "bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing"
        } ${
          draggedField === field.id ? "opacity-50" : ""
        } ${
          dragOverField === field.id
            ? "bg-green-100 border-2 border-green-400 border-dashed"
            : ""
        }`}
        title={isBaseField ? `"${field.id}" is a shared field and cannot be dragged` : `Drag "${field.id}" to add it to a config`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className={`w-4 h-4 ${isBaseField ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 cursor-move'}`} />
            <span className="text-sm font-mono">{field.id}</span>
            {hasOverride && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                override
              </span>
            )}
            {hasDeps && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                {field.deps.length} deps
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* View button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingField(field.id);
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View field"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingField(field.id);
                setEditingOverrideData(
                  JSON.stringify(field.override_data || {}, null, 2)
                );
              }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit field"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Add property dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPropertyDropdown(
                    showPropertyDropdown === field.id ? null : field.id
                  );
                }}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Add property"
              >
                <Plus className="w-4 h-4" />
              </button>

              {showPropertyDropdown === field.id && (
                <div className="absolute right-0 top-8 w-48 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="p-2 border-b bg-gray-50">
                    <span className="text-xs font-semibold text-gray-600">
                      Add Property to Field
                    </span>
                  </div>
                  {properties
                    .filter((prop) => !prop._deleted)
                    .map((prop) => {
                      const propName = prop.id.replace("property_", "");
                      const alreadyAdded = field.deps?.includes(prop.id);
                      return (
                        <button
                          key={prop.id}
                          onClick={() => {
                            if (!alreadyAdded) {
                              appConfigStore.addDependencyWithUI(field.id, prop.id);
                            }
                            setShowPropertyDropdown(null);
                          }}
                          disabled={alreadyAdded}
                          className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-50 transition-colors ${
                            alreadyAdded
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          <span
                            className={appConfigStore.getPropertyColor(prop)}
                          >
                            {propName}
                          </span>
                          {alreadyAdded && (
                            <span className="text-gray-400 ml-1">(added)</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>


            {/* Remove from config button - only when in config context */}
            {isBaseField && selectedConfig && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Remove field from config deps
                  const config = workingConfigs.find(
                    (c) => c.id === selectedConfig
                  );
                  if (config) {
                    const updatedDeps =
                      config.deps?.filter((d) => d !== field.id) || [];
                    
                    // For grouping configs, also clean override_data for this field
                    let updates: any = { deps: updatedDeps };
                    
                    if ((config.type === 'fields' || config.type === 'sort' || config.type === 'filter')) {
                      // Always update override_data, even if field is not there (to ensure cleanup)
                      const cleanedOverrideData = { ...(config.override_data || {}) };
                      if (cleanedOverrideData[field.id]) {
                        delete cleanedOverrideData[field.id];
                      }
                      updates.override_data = cleanedOverrideData;
                    }
                    
                    appConfigStore.updateConfigWithCascade(selectedConfig, updates);
                  }
                }}
                className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                title="Remove from config"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Property dependencies */}
        {propertyDeps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {propertyDeps.map((propId) => {
              const prop = properties.find((p) => p.id === propId);
              if (!prop) return null;
              return (
                <div
                  key={propId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border rounded-full"
                >
                  <span
                    className={`text-xs ${appConfigStore.getPropertyColor(
                      prop
                    )}`}
                  >
                    {propId.replace("property_", "")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      appConfigStore.removeDependencyWithUI(field.id, propId);
                    }}
                    className="ml-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Handle drop on config node
  const handleDropOnConfig = async (
    e: React.DragEvent,
    nodeId: string,
    nodeType: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverConfig(null);

    if (!draggedField && !draggedProperty) return;

    // Handle property drop
    if (draggedProperty) {
      // Don't allow properties on grouping configs
      if (["fields", "sort", "filter"].includes(nodeType)) {
        alert("Properties cannot be added to grouping configs");
        setDraggedProperty(null);
        return;
      }
      
      // Check if property can be applied based on tags
      if (!canApplyPropertyToType(draggedProperty, nodeType)) {
        const property = properties.find(p => p.id === draggedProperty);
        const tags = property?.tags || [];
        const allowedTypes = tags.filter(t => !t.includes(':'));
        alert(`Property "${draggedProperty.replace('property_', '')}" can only be applied to: ${allowedTypes.join(', ')}`);
        setDraggedProperty(null);
        return;
      }
      
      // Allow properties on other configs
      await appConfigStore.addDependencyWithUI(nodeId, draggedProperty);
      setDraggedProperty(null);
      return;
    }

    // Handle field drop - only allow on leaf nodes
    if (draggedField && !["fields", "sort", "filter"].includes(nodeType)) {
      return;
    }

    // Get config
    const config = workingConfigs.find((c) => c.id === nodeId);
    if (!config) return;

    // Check if field already exists in deps
    if (config.deps?.includes(draggedField)) {
      alert(`Field "${draggedField}" already exists in this config`);
      return;
    }

    // Get the field data
    const field = fields.find(f => f.id === draggedField);
    if (!field) {
      alert(`Field "${draggedField}" not found`);
      return;
    }

    // Update config with new field dependency
    const updatedDeps = [...(config.deps || []), draggedField];

    // Prepare updates based on config type
    let updates: any = { deps: updatedDeps };
    
    if (nodeType === "sort") {
      // For sort config, add sortOrder array to existing field data in override_data
      const existingOverride = config.override_data || {};
      const existingFieldData = existingOverride[draggedField] || {};
      
      updates.override_data = {
        ...existingOverride,
        [draggedField]: {
          ...existingFieldData,  // Keep all existing field properties
          sortOrder: [
            { 
              order: 1, 
              direction: "asc", 
              icon: "arrow-up", 
              label: "A-Z" 
            }
          ]
        },
      };
    } else if (nodeType === "filter") {
      // For filter config, add order, operator and value to override_data as object
      const existingOverride = config.override_data || {};
      // Calculate order based on existing fields
      const existingFieldsCount = Object.keys(existingOverride).length;
      updates.override_data = {
        ...existingOverride,
        [draggedField]: {
          order: existingFieldsCount + 1,
          operator: "eq",
          value: null,
        },
      };
    }
    
    // Update config - for fields/sort/filter, self_data will be rebuilt automatically
    await appConfigStore.updateConfig(nodeId, updates);
    
    // Rebuild parent's self_data for grouping configs
    if (nodeType === "fields" || nodeType === "sort" || nodeType === "filter") {
      await appConfigStore.rebuildParentSelfData(nodeId);
    }
    
    // Cascade changes up the tree
    await appConfigStore.cascadeUpdateUp(nodeId);

    setDraggedField(null);
  };

  // Render config node - parentId parameter tracks the immediate parent config
  const renderConfigNode = (node: TreeNode, level: number = 0, parentId: string | null = null) => {
    // Special handling for field reference nodes
    if (node.configType === 'field_ref') {
      const field = fields.find(f => f.id === node.id);
      // Use the passed parentId to find the specific parent config
      const parentConfig = parentId ? workingConfigs.find(c => c.id === parentId) : null;
      return (
        <div
          key={node.id}
          style={{ marginLeft: level > 0 ? "24px" : "0px", marginBottom: "8px" }}
        >
          <div className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-5 flex-shrink-0" />
              <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-mono text-sm truncate">{field?.caption || node.name}</span>
              <span className="text-xs text-gray-500 truncate">({node.id})</span>

              {/* Order indicator for field references */}
              {(() => {
                if (parentConfig && ['fields', 'sort', 'filter'].includes(parentConfig.type)) {
                  const fieldData = parentConfig.data?.[node.id];
                  if (fieldData) {
                    const fieldOrder = fieldData.order;
                    return fieldOrder !== undefined ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex-shrink-0">
                        {fieldOrder}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex-shrink-0">
                        ?
                      </span>
                    );
                  }
                }
                return null;
              })()}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // View field data in config
                  setViewingFieldInConfig(node.id);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="View field"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit field override in parent context - use the specific parent from tree context
                  if (parentConfig && appConfigStore.isGroupingConfigType(parentConfig.type)) {
                    // Open field override editor for this field in THIS specific grouping config's context
                    openFieldOverrideEditor(parentConfig.id, node.id);
                  } else {
                    alert('Parent grouping config not found');
                  }
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit field override"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  // Use the specific parent config passed from tree context
                  if (parentConfig) {
                    const updatedDeps = parentConfig.deps.filter(d => d !== node.id);
                    
                    // Also clean up override_data if it exists for this field
                    let updatedOverrideData = parentConfig.override_data ? 
                      JSON.parse(JSON.stringify(parentConfig.override_data)) : {};
                    
                    // Use the actual field ID
                    const fieldId = node.id;
                    
                    // Remove field override if it exists
                    if (updatedOverrideData.fields && updatedOverrideData.fields[fieldId]) {
                      delete updatedOverrideData.fields[fieldId];
                      
                      // If fields object is now empty, remove it
                      if (Object.keys(updatedOverrideData.fields).length === 0) {
                        delete updatedOverrideData.fields;
                      }
                    }
                    
                    // Update deps and override_data
                    await appConfigStore.updateConfig(parentConfig.id, {
                      deps: updatedDeps,
                      override_data: Object.keys(updatedOverrideData).length > 0 ? updatedOverrideData : {}
                    });
                    
                    // Then rebuild parent's self_data from remaining deps
                    await appConfigStore.rebuildParentSelfData(parentConfig.id);
                    
                    // Finally cascade updates up the tree
                    await appConfigStore.cascadeUpdateUp(parentConfig.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Remove from config"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const TypeInfo = configTypes[node.configType || ""] || {
      icon: Package,
      color: "text-gray-600",
    };
    const Icon = TypeInfo.icon;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const nodeDeps = node.deps || [];
    const propertyDeps = nodeDeps.filter((d) => d.startsWith("property_"));

    // Check if this node can accept field drops (only leaf configs: fields, sort, filter)
    const canAcceptFields = ["fields", "sort", "filter"].includes(
      node.configType || ""
    );
    const isDropTarget =
      dragOverConfig === node.id &&
      ((canAcceptFields && draggedField) || draggedProperty);

    return (
      <div
        key={node.id}
        style={{ marginLeft: level > 0 ? "24px" : "0px", marginBottom: "8px" }}
      >
        <div
          className={`rounded-md transition-all ${
            isDropTarget
              ? "bg-green-100 border-2 border-green-400 border-dashed"
              : selectedConfig === node.id
              ? "bg-blue-50 border-l-4 border-l-blue-500"
              : "bg-gray-50 hover:bg-gray-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedConfig(node.id);
          }}
          onDragOver={(e) => {
            // Allow fields on grouping configs
            if (canAcceptFields && draggedField) {
              e.preventDefault();
              setDragOverConfig(node.id);
            }
            // Allow properties on non-grouping configs only
            else if (draggedProperty && !["fields", "sort", "filter"].includes(node.configType || "")) {
              // Check if property can be applied based on tags
              if (canApplyPropertyToType(draggedProperty, node.configType || "")) {
                e.preventDefault();
                setDragOverConfig(node.id);
              }
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setDragOverConfig(null);
            }
          }}
          onDrop={(e) => handleDropOnConfig(e, node.id, node.configType || "")}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between min-h-[2.5rem] p-2">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNodeExpand(node.id);
                    }}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-5" />}

                <Icon className={`w-4 h-4 ${TypeInfo.color}`} />
                <span className="font-mono text-sm">{node.name}</span>

                {/* Order indicator */}
                {(() => {
                  // Types that need order: workspace, space, view, tab, block
                  const needsOrderTypes = ['workspace', 'space', 'view', 'tab', 'block'];
                  const config = workingConfigs.find(c => c.id === node.id);

                  if (needsOrderTypes.includes(node.configType || '')) {
                    const order = config?.data?.order;
                    return order !== undefined ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs">
                        {order}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs">
                        ?
                      </span>
                    );
                  }

                  return null;
                })()}

                {canAcceptFields && draggedField && (
                  <span className="text-xs text-green-600 ml-2 animate-pulse">
                    (Drop here)
                  </span>
                )}

                {propertyDeps.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    {propertyDeps.length} props
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                {/* Move Up/Down buttons - only show for children (when parentId exists) */}
                {parentId && (() => {
                  const parent = workingConfigs.find(c => c.id === parentId);
                  if (!parent?.deps) return null;

                  // Filter out properties - only work with config deps for ordering
                  const configDeps = parent.deps.filter(d => !d.startsWith('property_'));
                  const currentIndex = configDeps.indexOf(node.id);
                  if (currentIndex === -1) return null;

                  const isFirst = currentIndex === 0;
                  const isLast = currentIndex === configDeps.length - 1;

                  return (
                    <>
                      {!isFirst && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await reorderChild(parentId, node.id, 'up');
                          }}
                          className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      )}
                      {!isLast && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await reorderChild(parentId, node.id, 'down');
                          }}
                          className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  );
                })()}
                {getAvailableChildTypes(node.configType || "").length > 0 &&
                 getAvailableChildTypes(node.configType || "").some(type => appConfigStore.canAddConfigType(node.id, type)) && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddParentId(node.id);
                        setShowAddModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Add child config"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateParentId(node.id);
                        setShowTemplateSelect(true);
                      }}
                      className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                      title="Add from template"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingConfig(node.id);
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="View config"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditConfig(node.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit config"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConfig(node.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Show properties as badges inside the config container */}
            {propertyDeps.length > 0 && (
              <div className="px-2 pb-2">
                <div className="flex flex-wrap gap-1">
                  {propertyDeps.map((propId) => {
                    const prop = properties.find((p) => p.id === propId);
                    if (!prop) return null;
                    return (
                      <div
                        key={propId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border rounded-full"
                      >
                        <span
                          className={`text-xs ${appConfigStore.getPropertyColor(
                            prop
                          )}`}
                        >
                          {propId.replace("property_", "")}
                        </span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Remove property "${prop.caption || propId}" from this config?`)) {
                              // Remove property from config deps
                              const updatedDeps = (node.deps || []).filter(d => d !== propId);
                              await appConfigStore.updateConfig(node.id, { deps: updatedDeps });
                              
                              // Rebuild and cascade if needed
                              if (appConfigStore.isHighLevelType(node.configType || '')) {
                                await appConfigStore.rebuildParentSelfData(node.id);
                                await appConfigStore.cascadeUpdateUp(node.id);
                              }
                            }
                          }}
                          className="ml-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {/* Sort children by deps order */}
            {(() => {
              const sortedChildren = node.deps && node.deps.length > 0
                ? node.deps
                    .map(depId => node.children.find(child => child.id === depId))
                    .filter((child): child is TreeNode => child !== undefined)
                    // Add any children not in deps at the end
                    .concat(node.children.filter(child => !node.deps?.includes(child.id)))
                : node.children;

              return sortedChildren.map((child) => renderConfigNode(child, level + 1, node.id));
            })()}
          </div>
        )}
      </div>
    );
  };

  // Filter config nodes based on search

  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <div className="max-w-full mx-auto h-full">
        <div className="flex gap-4 h-[calc(100vh-7rem)]">
          {/* Left Column - Working Configs - 37.5% */}
          <div className="w-[37.5%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <WorkspaceHeader
              title="Working Configs"
              titleIcon={Package}
              itemCount={workingConfigs.length}
              note={selectedConfig ? "(Press ESC to deselect)" : undefined}
              showSearch={true}
              searchPlaceholder="Search configs..."
              searchValue={configSearchQuery}
              onSearchChange={setConfigSearchQuery}
              showTreeControls={true}
              onCollapseAll={() => {
                // Collapse all nodes
                setExpandedNodes(new Set());
              }}
              onExpandAll={() => {
                // Expand all nodes
                const allNodeIds = appConfigStore.getAllNodeIds(configTree);
                setExpandedNodes(new Set(allNodeIds));
              }}
              showAddButton={true}
              addButtonText="Add"
              onAddClick={() => {
                setAddParentId(null);
                setShowAddModal(true);
              }}
              extraButtons={[
                {
                  text: "Template",
                  icon: Package,
                  className: "bg-purple-600 hover:bg-purple-700",
                  onClick: () => {
                    setCreateParentId(selectedConfig);
                    setShowTemplateSelect(true);
                  },
                },
              ]}
            />

            <div
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                // Only deselect if clicking on the container itself, not on child elements
                if (e.target === e.currentTarget) {
                  setSelectedConfig(null);
                }
              }}
            >
              {configTree.length > 0 ? (
                (() => {
                  const filteredData = appConfigStore.filterConfigTree(configTree, configSearchQuery);
                  return filteredData.length > 0 ? (
                    <div
                      className="pb-4"
                      onClick={(e) => {
                        // Check if clicked on empty space within tree container
                        if (e.target === e.currentTarget) {
                          setSelectedConfig(null);
                        }
                      }}
                    >
                      {filteredData.map((node, index) => (
                        <div key={node.id}>{renderConfigNode(node, 0, null)}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No configs found matching "{configSearchQuery}"
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No working configs yet. Click "From Template" to create.
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Fields Tree - 37.5% */}
          <div className="w-[37.5%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <WorkspaceHeader
              title="Entity Fields"
              titleIcon={Database}
              itemCount={fields.length}
              showSearch={true}
              searchPlaceholder="Search fields..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              showTreeControls={true}
              onCollapseAll={() => {
                // Collapse all
                setExpandedSections(new Set());
                setIsTreeExpanded(false);
              }}
              onExpandAll={() => {
                // Expand all sections
                const allSections = new Set<string>();
                allSections.add("base");
                allSections.add("main-entities");
                allSections.add("dictionaries");
                
                // Add all entity groups
                Object.keys(filteredStructure.main).forEach((entity) => {
                  allSections.add(`group-${entity}`);
                  allSections.add(`main-${entity}`);
                  const entityData = filteredStructure.main[entity];
                  if (entityData?.children) {
                    Object.keys(entityData.children).forEach((child) => {
                      allSections.add(`child-${child}`);
                    });
                  }
                });
                
                // Add all dictionary groups
                Object.keys(filteredStructure.dictionaries).forEach((dict) => {
                  allSections.add(`dict-${dict}`);
                });
                
                setExpandedSections(allSections);
                setIsTreeExpanded(true);
              }}
              showAddButton={false}
            />

            {/* Helper text for drag & drop */}
            {draggedField && (
              <div className="mb-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-md flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                <span>
                  Dragging "{draggedField}" - Drop on fields, sort, or filter
                  configs
                </span>
              </div>
            )}
            

            <div 
              className="flex-1 overflow-y-auto"
              style={{ 
                position: 'relative',
                transform: 'translateZ(0)', /* Force GPU acceleration */
                willChange: 'scroll-position'
              }}
            >
              {/* Base Fields Section */}
              <div className="mb-2">
                <div
                  onClick={() => toggleSection("base")}
                  className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center h-full gap-2">
                    {expandedSections.has("base") ? (
                      <ChevronDown className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 flex-shrink-0" />
                    )}
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span className="font-mono text-sm">Base Fields</span>
                    <span className="text-xs text-gray-500">
                      ({filteredStructure.base.length})
                    </span>
                  </div>
                  <div></div>
                </div>

                {expandedSections.has("base") && (
                  <div
                    style={{ marginLeft: "24px" }}
                    className="mt-2 space-y-2"
                  >
                    {filteredStructure.base.map((field) => renderFieldItem(field))}
                  </div>
                )}
              </div>

              {/* Main Entities Section */}
              {Object.keys(filteredStructure.main).length > 0 && (
                <div className="mb-2">
                  <div
                    onClick={() => toggleSection("main-entities")}
                    className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center h-full gap-2">
                      {expandedSections.has("main-entities") ? (
                        <ChevronDown className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 flex-shrink-0" />
                      )}
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="font-mono text-sm">Main Entities</span>
                      <span className="text-xs text-gray-500">
                        ({Object.keys(filteredStructure.main).length})
                      </span>
                    </div>
                    <div></div>
                  </div>

                  {expandedSections.has("main-entities") &&
                    Object.entries(filteredStructure.main).map(
                      ([entityName, entityData], index) => (
                        <div
                          key={entityName}
                          className={`ml-4 mb-2 ${index === 0 ? "mt-2" : ""}`}
                        >
                          {/* Entity Group (capitalized) */}
                          <div
                            onClick={() => toggleSection(`group-${entityName}`)}
                            className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="flex items-center h-full gap-2">
                              {expandedSections.has(`group-${entityName}`) ? (
                                <ChevronDown className="w-5 h-5 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-5 h-5 flex-shrink-0" />
                              )}
                              <span className="font-mono text-sm">
                                {entityName.charAt(0).toUpperCase() +
                                  entityName.slice(1)}{" "}
                                Section
                              </span>
                              <span className="text-xs text-gray-500">
                                ({1 + Object.keys(entityData.children).length}{" "}
                                tables)
                              </span>
                            </div>
                            <div></div>
                          </div>

                          {expandedSections.has(`group-${entityName}`) && (
                            <div className="ml-6 mt-2">
                              {/* Main entity table */}
                              <div className="mb-2">
                                <div
                                  onClick={() =>
                                    toggleSection(`main-${entityName}`)
                                  }
                                  className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                                >
                                  <div className="flex items-center h-full gap-2">
                                    {expandedSections.has(
                                      `main-${entityName}`
                                    ) ? (
                                      <ChevronDown className="w-5 h-5 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 flex-shrink-0" />
                                    )}
                                    <span className="font-mono text-sm">
                                      {entityName}
                                    </span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      main
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({entityData.fields.length} fields)
                                    </span>
                                  </div>
                                  <div></div>
                                </div>

                                {expandedSections.has(`main-${entityName}`) &&
                                  entityData.fields.length > 0 && (
                                    <div className="ml-4 mt-2 bg-white rounded-lg px-2 space-y-2">
                                      {entityData.fields.map((field) =>
                                        renderFieldItem(field)
                                      )}
                                    </div>
                                  )}

                                {/* Child entity tables */}
                                {Object.entries(entityData.children).length >
                                  0 && (
                                  <div>
                                    {Object.entries(entityData.children).map(
                                      (
                                        [childName, childFields],
                                        childIndex
                                      ) => (
                                        <div
                                          key={childName}
                                          className={`mb-2 ${
                                            childIndex === 0 ? "mt-2" : ""
                                          }`}
                                        >
                                          <div
                                            onClick={() =>
                                              toggleSection(
                                                `child-${childName}`
                                              )
                                            }
                                            className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                                          >
                                            <div className="flex items-center h-full gap-2">
                                              {expandedSections.has(
                                                `child-${childName}`
                                              ) ? (
                                                <ChevronDown className="w-5 h-5 flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="w-5 h-5 flex-shrink-0" />
                                              )}
                                              <span className="font-mono text-sm">
                                                {childName}
                                              </span>
                                              <div className="flex gap-1">
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                  child
                                                </span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                  {entityName}
                                                </span>
                                              </div>
                                              <span className="text-xs text-gray-500">
                                                ({childFields.length} fields)
                                              </span>
                                            </div>
                                            <div></div>
                                          </div>

                                          {expandedSections.has(
                                            `child-${childName}`
                                          ) && (
                                            <div
                                              style={{ marginLeft: "24px" }}
                                              className="mt-2"
                                            >
                                              {childFields.map((field) =>
                                                renderFieldItem(field)
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                </div>
              )}

              {/* Dictionaries Section */}
              {Object.keys(filteredStructure.dictionaries).length > 0 && (
                <div className="mb-2">
                  <div
                    onClick={() => toggleSection("dictionaries")}
                    className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center h-full gap-2">
                      {expandedSections.has("dictionaries") ? (
                        <ChevronDown className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 flex-shrink-0" />
                      )}
                      <Book className="w-5 h-5 text-orange-600" />
                      <span className="font-mono text-sm">Dictionaries</span>
                      <span className="text-xs text-gray-500">
                        ({Object.keys(filteredStructure.dictionaries).length})
                      </span>
                    </div>
                    <div></div>
                  </div>

                  {expandedSections.has("dictionaries") && (
                    <div style={{ marginLeft: "24px" }}>
                      {Object.entries(filteredStructure.dictionaries).map(
                        ([dictName, dictFields], dictIndex) => (
                          <div
                            key={dictName}
                            className={`mb-2 ${dictIndex === 0 ? "mt-2" : ""}`}
                          >
                            <div
                              onClick={() => toggleSection(`dict-${dictName}`)}
                              className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="flex items-center h-full gap-2">
                                {expandedSections.has(`dict-${dictName}`) ? (
                                  <ChevronDown className="w-5 h-5 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 flex-shrink-0" />
                                )}
                                <span className="font-mono text-sm">
                                  {dictName}
                                </span>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                  dict
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({dictFields.length})
                                </span>
                              </div>
                              <div></div>
                            </div>

                            {expandedSections.has(`dict-${dictName}`) && (
                              <div
                                style={{ marginLeft: "24px" }}
                                className="mt-2"
                              >
                                {dictFields.map((field) => (
                                  <div key={field.id} className="mb-2">
                                    {renderFieldItem(field)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Properties - 25% */}
          <div className="w-[25%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <WorkspaceHeader
              title="Properties"
              titleIcon={Tag}
              itemCount={properties.length}
              showSearch={false}
              showFilter={true}
              filterLabel="Type:"
              filterValue={propertyFilterType}
              onFilterChange={setPropertyFilterType}
              filterFullWidth={true}
              filterOptions={[
                { value: "all", label: "All Properties" },
                { value: "field", label: "Field Properties" },
                ...Object.entries(configTypes).map(([key, info]) => ({
                  value: key,
                  label: info.name
                }))
              ]}
              showAddButton={false}
              showCheckbox={true}
              checkboxIcon={Settings}
              checkboxChecked={showSystemProperties}
              onCheckboxChange={setShowSystemProperties}
              checkboxTooltip="Show/hide system properties"
            />

            {draggedProperty && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-2">
                ↔️ Drag property to a field to add it as dependency
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {properties.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No properties found
                </div>
              ) : (
                <div className="space-y-2 ">
                  {properties
                    .filter(property => {
                      // Filter by type
                      const hasNoType = !property.tags || property.tags.length === 0;
                      const matchesType = propertyFilterType === "all" ||
                        property.tags?.includes(propertyFilterType) ||
                        hasNoType; // Include universal properties (no type = applies to all)

                      // Filter by system/custom
                      const matchesSystemFilter = showSystemProperties ||
                        property.category !== 'system';

                      return matchesType && matchesSystemFilter;
                    })
                    .map((property) => (
                      <div
                        key={property.id}
                        className={`p-3 border rounded-lg transition-all cursor-move ${
                          draggedProperty === property.id
                            ? "opacity-50 scale-95 border-blue-400"
                            : "hover:bg-gray-50"
                        }`}
                        draggable
                        onDragStart={() => setDraggedProperty(property.id)}
                        onDragEnd={() => {
                          setDraggedProperty(null);
                          setDragOverField(null);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div
                                  className={`font-mono text-sm ${appConfigStore.getPropertyColor(
                                    property
                                  )}`}
                                >
                                  {property.id.replace("property_", "")}
                                </div>
                                <PropertyCategoryIcon category={property.category} />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Object.entries(property.data || {})
                                  .slice(0, 2)
                                  .map(([key, value]) => (
                                    <span key={key} className="inline-block mr-3">
                                      {key}:{" "}
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  ))}
                              </div>
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

      {/* View Field Modal */}
      {viewingField &&
        (() => {
          const field = fields.find((f) => f.id === viewingField);
          if (!field) return null;

          return (
            <ConfigViewModal
              isOpen={true}
              onClose={() => setViewingField(null)}
              onEdit={() => {
                setViewingField(null);
                startEditField(field);
              }}
              title="View Field"
              config={field}
            />
          );
        })()}

      {/* Template Selection Modal */}
      {showTemplateSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              {createParentId ? "Select Child Template" : "Select App Template"}
            </h3>

            <div className="flex-1 overflow-y-auto">
              {(() => {
                const parentConfig = createParentId
                  ? workingConfigs.find((c) => c.id === createParentId)
                  : null;
                // For root level (no parent), filter to only app templates
                const parentType = createParentId === null ? null : (parentConfig?.type || null);
                const allTemplates = getAvailableTemplates(parentType);
                
                // Filter to only app templates when at root level
                const templates = createParentId === null 
                  ? allTemplates.filter(t => t.type === 'app')
                  : allTemplates;

                if (templates.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      No templates available for this level
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {templates.map((template) => {
                      const TypeInfo = configTypes[template.type] || {
                        icon: Package,
                        color: "text-gray-600",
                      };
                      const Icon = TypeInfo.icon;

                      return (
                        <button
                          key={template.id}
                          onClick={() => createFromTemplate(template.id)}
                          className="p-4 border rounded-lg hover:bg-gray-50 flex flex-col items-center gap-2"
                        >
                          <Icon className={`w-8 h-8 ${TypeInfo.color}`} />
                          <div className="text-sm font-medium">
                            {template.caption || template.id}
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.type}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTemplateSelect(false);
                  setCreateParentId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Config Modal */}
      {viewingConfig &&
        (() => {
          const config = workingConfigs.find((c) => c.id === viewingConfig);
          if (!config) return null;

          return (
            <ConfigViewModal
              isOpen={true}
              onClose={() => setViewingConfig(null)}
              onEdit={() => {
                setViewingConfig(null);
                startEditConfig(config.id);
              }}
              title="View Config"
              config={config}
            />
          );
        })()}

      {/* Edit Config Modal */}
      {editingConfig && (() => {
        const config = workingConfigs.find((c) => c.id === editingConfig);
        const isGroupingType = config ? appConfigStore.isGroupingConfigType(config.type) : false;
        
        return (
          <ConfigEditModal
            isOpen={true}
            onClose={() => {
              setEditingConfig(null);
              setEditingConfigData("");
              setEditingConfigCaption("");
              setEditingConfigVersion(1);
            }}
            onSave={saveConfigEdit}
            title="Edit Config"
            configId={editingConfig}
            caption={editingConfigCaption}
            hideOverrideData={isGroupingType}
            version={editingConfigVersion}
            overrideData={editingConfigData}
            onCaptionChange={setEditingConfigCaption}
            onVersionChange={setEditingConfigVersion}
            onOverrideDataChange={setEditingConfigData}
          />
        );
      })()}

      {/* View Field in Config Modal */}
      {viewingFieldInConfig &&
        (() => {
          const field = fields.find((f) => f.id === viewingFieldInConfig);
          if (!field) return null;

          return (
            <ConfigViewModal
              isOpen={true}
              onClose={() => setViewingFieldInConfig(null)}
              onEdit={() => {
                setViewingFieldInConfig(null);
                setEditingField(field.id);
                setEditingOverrideData(
                  JSON.stringify(field.override_data || {}, null, 2)
                );
                setEditingCaption(field.caption || "");
                setEditingVersion(field.version || 1);
              }}
              title="View Field in Config"
              config={field}
              hideIntermediateData={true}
            />
          );
        })()}

      {/* Edit Field Modal */}
      <ConfigEditModal
        isOpen={!!editingField}
        onClose={() => {
          setEditingField(null);
          setEditingOverrideData("");
          setEditingCaption("");
          setEditingVersion(1);
        }}
        onSave={saveFieldOverrideData}
        title="Edit Field"
        configId={editingField || ""}
        caption={editingCaption}
        version={editingVersion}
        overrideData={editingOverrideData}
        onCaptionChange={setEditingCaption}
        onVersionChange={setEditingVersion}
        onOverrideDataChange={setEditingOverrideData}
      />

      {/* Add Config Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {addParentId ? "Add Child Config" : "Add App Config"}
            </h3>

            <div className="space-y-2">
              {(addParentId
                ? appConfigStore.getAvailableChildTypesForParent(
                    addParentId,
                    workingConfigs.find((c) => c.id === addParentId)?.type || ""
                  )
                : ["app"]
              ).map((type) => {
                const TypeInfo = configTypes[type] || {
                  icon: Package,
                  color: "text-gray-600",
                };
                const Icon = TypeInfo.icon;

                return (
                  <button
                    key={type}
                    onClick={() => createWorkingConfig(type, addParentId)}
                    className="w-full p-3 flex items-center gap-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Icon
                      className={`w-5 h-5 ${TypeInfo.color || "text-gray-600"}`}
                    />
                    <span className="font-medium">{TypeInfo.name || type}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddParentId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Override Editor Modal */}
      {fieldOverrideEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Edit Field Override: {fieldOverrideEditor.fieldId}
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Field Info */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Current Field Data (computed from base + parent overrides)
                </div>
                <textarea
                  value={JSON.stringify(
                    (() => {
                      const field = fields.find(f => f.id === fieldOverrideEditor.fieldId);
                      const parentConfig = workingConfigs.find(c => c.id === fieldOverrideEditor.parentConfigId);
                      // Show the computed field data including any parent overrides
                      return parentConfig?.data?.fields?.[fieldOverrideEditor.fieldId] || field?.data || {};
                    })(),
                    null,
                    2
                  )}
                  readOnly
                  className="w-full h-48 p-2 border rounded font-mono text-sm bg-gray-50"
                />
              </div>
              
              {/* Override Editor */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Field Override Properties
                  <span className="text-xs text-gray-500 ml-2">
                    (These values will override the field properties in this context)
                  </span>
                </div>
                <textarea
                  value={fieldOverrideEditor.fieldOverrideData}
                  onChange={(e) => {
                    setFieldOverrideEditor({
                      ...fieldOverrideEditor,
                      fieldOverrideData: e.target.value
                    });
                  }}
                  className="w-full h-48 p-2 border rounded font-mono text-sm"
                  placeholder='{\n  "label": "Custom Label",\n  "required": false,\n  "icon": "custom-icon"\n}'
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFieldOverrideEditor(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveFieldOverride}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Property Modal */}
      {viewingProperty &&
        (() => {
          const property = properties.find((p) => p.id === viewingProperty);
          if (!property) return null;

          return (
            <ConfigViewModal
              isOpen={true}
              onClose={() => setViewingProperty(null)}
              title="View Property"
              config={property}
            />
          );
        })()}
    </div>
  );
};

export default AppConfig;
