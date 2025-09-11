import { appConfigStore } from "@breedhub/rxdb-store";
import {
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
  Tag,
  Trash,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import ConfigEditModal from "../components/ConfigEditModal";
import ConfigViewModal from "../components/ConfigViewModal";
import WorkspaceHeader from "../components/WorkspaceHeader";
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["main-entities"])
  );
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
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
  const buildConfigTree = (configs: WorkingConfig[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const childIds = new Set<string>();

    // First pass: Create all nodes
    configs.forEach((config) => {
      const node: TreeNode = {
        id: config.id,
        name: config.caption || config.id,
        configType: config.type,
        children: [],
        data: config.data || {},
        deps: config.deps,
      };
      nodeMap.set(config.id, node);
    });

    // Second pass: Build parent-child relationships and track children
    configs.forEach((config) => {
      const parentNode = nodeMap.get(config.id);
      if (!parentNode) return;

      if (config.deps && config.deps.length > 0) {
        config.deps.forEach((childId) => {
          // Check if it's a field dependency
          if (childId.includes('field') && 
              ['fields', 'sort', 'filter'].includes(config.type)) {
            // Create a virtual node for the field
            const fieldNode: TreeNode = {
              id: childId,
              name: childId,
              configType: 'field_ref', // Special type for field references
              children: [],
              data: {},
              deps: [],
            };
            parentNode.children.push(fieldNode);
          } else {
            // Regular config dependency
            const childNode = nodeMap.get(childId);
            const childConfig = configs.find((c) => c.id === childId);
            if (childNode && childConfig) {
              parentNode.children.push(childNode);
              // Track this as a child so we don't include it in roots
              childIds.add(childId);
            }
          }
        });
      }
    });

    // Third pass: Collect only root nodes (configs that are not children of any other config)
    const roots: TreeNode[] = [];
    configs.forEach((config) => {
      if (!childIds.has(config.id)) {
        const node = nodeMap.get(config.id);
        if (node) {
          roots.push(node);
        }
      }
    });

    return roots;
  };

  // Load data from store
  useEffect(() => {
    const loadData = () => {
      const allConfigs = appConfigStore.configsList.value || [];

      // Get working configs (not templates)
      const working = allConfigs.filter(
        (c) =>
          !c.tags?.includes("template") &&
          c.type !== "field" &&
          c.type !== "entity_field" &&
          c.type !== "property" &&
          !c._deleted
      );
      setWorkingConfigs(working);

      // Build tree for working configs
      const tree = buildConfigTree(working);
      setConfigTree(tree);

      // Get fields
      const fieldConfigs = allConfigs.filter(
        (c) => (c.type === "field" || c.type === "entity_field") && !c._deleted
      );
      setFields(fieldConfigs);

      // Get properties (exclude is_system from right panel)
      const propertyConfigs = allConfigs.filter(
        (c) =>
          c.type === "property" && !c._deleted && c.id !== "property_is_system"
      );
      setProperties(propertyConfigs);
    };

    loadData();

    // Refresh every second
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand sections when searching
  useEffect(() => {
    if (searchQuery) {
      // When searching, expand all sections to show results
      const allSections = new Set<string>();
      allSections.add("base");
      allSections.add("main-entities");
      allSections.add("dictionaries");

      // Add all entity groups and their main sections
      Object.keys(structure.main).forEach((entity) => {
        allSections.add(`group-${entity}`);
        allSections.add(`main-${entity}`); // Expand the main entity itself

        // Also expand child entities if they exist
        const entityData = structure.main[entity];
        if (entityData?.children) {
          Object.keys(entityData.children).forEach((child) => {
            allSections.add(`child-${child}`);
          });
        }
      });

      // Add all dictionary groups
      Object.keys(structure.dictionaries).forEach((dict) => {
        allSections.add(`dict-${dict}`);
      });

      setExpandedSections(allSections);
    }
  }, [searchQuery, structure]);

  // Build hierarchical structure
  useEffect(() => {
    const newStructure = appConfigStore.buildFieldsStructure(fields);
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
    
    console.log('Opening field override editor:', {
      parentConfigId,
      fieldId,
      parentConfig: parentConfig ? {
        id: parentConfig.id,
        type: parentConfig.type,
        override_data: parentConfig.override_data,
        deps: parentConfig.deps
      } : null,
      isGroupingType: parentConfig ? appConfigStore.isGroupingConfigType(parentConfig.type) : false
    });
    
    if (!parentConfig || !appConfigStore.isGroupingConfigType(parentConfig.type)) {
      console.error('Invalid parent config or not a grouping type');
      return;
    }
    
    // Get existing override for this field from parent's override_data
    const existingOverride = parentConfig.override_data?.fields?.[fieldId] || {};
    
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
      
      // Initialize fields object if needed
      if (!currentOverrideData.fields) {
        currentOverrideData.fields = {};
      }

      // Update or remove field override
      if (Object.keys(fieldOverride).length > 0) {
        currentOverrideData.fields[fieldOverrideEditor.fieldId] = fieldOverride;
      } else {
        delete currentOverrideData.fields[fieldOverrideEditor.fieldId];
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
    return appConfigStore.getAvailableTemplatesForParent(parentType);
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
    // Check if field is a base field (type: 'field' and category: 'base')
    const isBaseField = field.type === 'field' && field.category === 'base';
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
            e.preventDefault();
            setDragOverField(field.id);
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
        title={isBaseField ? `"${field.id}" is a base field and cannot be dragged` : `Drag "${field.id}" to add it to a config`}
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

            {/* Delete button - only for non-base fields */}
            {!isBaseField && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete field "${field.id}"?`)) {
                    appConfigStore.deleteConfig(field.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete field"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}

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
                    appConfigStore.updateConfig(selectedConfig, {
                      deps: updatedDeps,
                    });
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
      // Allow properties on other configs
      const result = await appConfigStore.addDependencyWithUI(nodeId, draggedProperty);
      if (!result.success) {
        alert(result.error || 'Failed to add property');
      }
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

    // Update self_data based on config type
    let updatedSelfData = { ...config.self_data };

    if (nodeType === "fields") {
      // For fields config, merge field data into self_data.fields object
      // Create a new fields object to avoid extensibility issues
      const existingFields = updatedSelfData.fields || {};
      updatedSelfData.fields = {
        ...existingFields,
        [draggedField]: field.data || field.self_data || {}
      };
    } else if (nodeType === "sort") {
      // For sort config, add to sort_fields array
      updatedSelfData.sort_fields = [
        ...(updatedSelfData.sort_fields || []),
        {
          field: draggedField,
          direction: "asc",
        },
      ];
    } else if (nodeType === "filter") {
      // For filter config, add to filter_fields array
      updatedSelfData.filter_fields = [
        ...(updatedSelfData.filter_fields || []),
        {
          field: draggedField,
          operator: "eq",
          value: null,
        },
      ];
    }

    // Update config and cascade changes
    await appConfigStore.updateConfigAndCascade(nodeId, {
      deps: updatedDeps,
      self_data: updatedSelfData,
    });

    setDraggedField(null);
  };

  // Render config node
  const renderConfigNode = (node: TreeNode, level: number = 0) => {
    // Special handling for field reference nodes
    if (node.configType === 'field_ref') {
      const field = fields.find(f => f.id === node.id);
      // Find parent config to check for overrides
      const parentConfig = workingConfigs.find(c => c.deps?.includes(node.id));
      return (
        <div
          key={node.id}
          style={{ marginLeft: level > 0 ? "24px" : "0px", marginBottom: "8px" }}
        >
          <div className="flex items-center justify-between h-10 p-2 rounded-md bg-gray-50 hover:bg-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-5" />
              <Database className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-sm">{field?.caption || node.name}</span>
              <span className="text-xs text-gray-500">({node.id})</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // View field data
                  setViewingField(node.id);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="View field"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit field override in parent context
                  // Field is inside a grouping config (fields, sort, filter)
                  // Need to find the grouping config that contains this field
                  const groupingConfig = workingConfigs.find(c => 
                    appConfigStore.isGroupingConfigType(c.type) && c.deps?.includes(node.id)
                  );
                  
                  console.log('Looking for parent grouping config:', {
                    fieldId: node.id,
                    foundConfig: groupingConfig?.id,
                    type: groupingConfig?.type
                  });
                  
                  if (groupingConfig) {
                    // Open field override editor for this field in grouping config's context
                    openFieldOverrideEditor(groupingConfig.id, node.id);
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
                  // Find parent config and remove field from deps
                  const parentConfig = workingConfigs.find(c => 
                    c.deps?.includes(node.id)
                  );
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
              e.preventDefault();
              setDragOverConfig(node.id);
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
            {node.children.map((child) => renderConfigNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filter config nodes based on search
  const filterConfigNodes = (nodes: TreeNode[]): TreeNode[] => {
    if (!configSearchQuery) return nodes;

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(configSearchQuery.toLowerCase()) ||
        node.id.toLowerCase().includes(configSearchQuery.toLowerCase());
      const filteredChildren = filterConfigNodes(node.children);

      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }

      return acc;
    }, []);
  };

  return (
    <div className="h-full bg-gray-50 p-4">
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
                    setCreateParentId(null);
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
              style={{ minHeight: "100%" }}
            >
              {configTree.length > 0 ? (
                (() => {
                  const filteredData = filterConfigNodes(configTree);
                  return filteredData.length > 0 ? (
                    <div
                      className="pb-4"
                      style={{ minHeight: "calc(100% - 1rem)" }}
                      onClick={(e) => {
                        // Check if clicked on empty space within tree container
                        if (e.target === e.currentTarget) {
                          setSelectedConfig(null);
                        }
                      }}
                    >
                      {filteredData.map((node, index) => (
                        <div key={node.id}>{renderConfigNode(node, 0)}</div>
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
                      ({structure.base.length})
                    </span>
                  </div>
                  <div></div>
                </div>

                {expandedSections.has("base") && (
                  <div
                    style={{ marginLeft: "24px" }}
                    className="mt-2 space-y-2"
                  >
                    {structure.base.map((field) => renderFieldItem(field))}
                  </div>
                )}
              </div>

              {/* Main Entities Section */}
              {Object.keys(structure.main).length > 0 && (
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
                        ({Object.keys(structure.main).length})
                      </span>
                    </div>
                    <div></div>
                  </div>

                  {expandedSections.has("main-entities") &&
                    Object.entries(structure.main).map(
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
              {Object.keys(structure.dictionaries).length > 0 && (
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
                        ({Object.keys(structure.dictionaries).length})
                      </span>
                    </div>
                    <div></div>
                  </div>

                  {expandedSections.has("dictionaries") && (
                    <div style={{ marginLeft: "24px" }}>
                      {Object.entries(structure.dictionaries).map(
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
              showSearch={true}
              searchPlaceholder="Search properties..."
              searchValue={propertySearchQuery}
              onSearchChange={setPropertySearchQuery}
              showAddButton={false}
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
                    .filter(
                      (p) =>
                        !propertySearchQuery ||
                        p.id
                          .toLowerCase()
                          .includes(propertySearchQuery.toLowerCase()) ||
                        JSON.stringify(p.self_data)
                          .toLowerCase()
                          .includes(propertySearchQuery.toLowerCase())
                    )
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
                        <div className="flex items-center justify-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div
                              className={`font-mono text-sm ${appConfigStore.getPropertyColor(
                                property
                              )}`}
                            >
                              {property.id.replace("property_", "")}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(property.self_data || {})
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
                const templates = getAvailableTemplates(
                  parentConfig?.type || null
                );

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
                setEditingField(field.id);
                setEditingOverrideData(
                  JSON.stringify(field.override_data || {}, null, 2)
                );
                setEditingCaption(field.caption || "");
                setEditingVersion(field.version || 1);
              }}
              title="View Field"
              config={field}
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
