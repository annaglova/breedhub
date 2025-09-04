import { appConfigStore } from "@breedhub/rxdb-store";
import {
  Book,
  ChevronDown,
  ChevronRight,
  Database,
  Edit,
  Eye,
  File,
  Grid,
  GripVertical,
  Layers,
  List,
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

interface Field {
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

interface WorkingConfig {
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
  _deleted?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  configType: string;
  children: TreeNode[];
  data: any;
  deps?: string[];
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

const AppConfig: React.FC = () => {
  // Working configs state
  const [workingConfigs, setWorkingConfigs] = useState<WorkingConfig[]>([]);
  const [configTree, setConfigTree] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [configSearchQuery, setConfigSearchQuery] = useState("");
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

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

  // Config type icons
  const configTypes = {
    app: { name: "App", icon: Package, color: "text-purple-600" },
    workspace: { name: "Workspace", icon: Layers, color: "text-blue-600" },
    space: { name: "Space", icon: Grid, color: "text-green-600" },
    view: { name: "View", icon: Grid, color: "text-yellow-600" },
    page: { name: "Page", icon: File, color: "text-orange-600" },
    sort: { name: "Sort Config", icon: Settings, color: "text-gray-600" },
    fields: { name: "Fields Config", icon: List, color: "text-indigo-600" },
    tabs: { name: "Tabs Config", icon: Layers, color: "text-pink-600" },
  };

  // Build tree structure from configs
  const buildConfigTree = (configs: WorkingConfig[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes
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
      roots.push(node);
    });

    // Build parent-child relationships from deps
    configs.forEach((config) => {
      const parentNode = nodeMap.get(config.id);
      if (!parentNode) return;

      if (config.deps && config.deps.length > 0) {
        config.deps.forEach((childId) => {
          const childNode = nodeMap.get(childId);
          // Only add as child if it's a config node (not property or field)
          // Check if childId is actually another config
          const childConfig = configs.find((c) => c.id === childId);
          if (childNode && childConfig) {
            parentNode.children.push(childNode);
            const rootIndex = roots.indexOf(childNode);
            if (rootIndex > -1) {
              roots.splice(rootIndex, 1);
            }
          }
        });
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

  // Delete config
  const deleteConfig = async (configId: string) => {
    if (confirm(`Delete config "${configId}"?`)) {
      await appConfigStore.deleteConfig(configId);
    }
  };

  // Create config from template
  const createFromTemplate = async (templateId: string) => {
    try {
      await appConfigStore.createConfigFromTemplate(templateId, createParentId);
      setShowTemplateSelect(false);
      setCreateParentId(null);

      // Expand parent to show new config
      if (createParentId) {
        const newExpanded = new Set(expandedNodes);
        newExpanded.add(createParentId);
        setExpandedNodes(newExpanded);
      }
    } catch (error) {
      alert(`Failed to create config from template: ${error}`);
    }
  };

  // Get available templates for current level
  const getAvailableTemplates = (parentType: string | null) => {
    const allConfigs = appConfigStore.configsList.value || [];
    const templates = allConfigs.filter(
      (c) => c.tags?.includes("template") && !c._deleted
    );

    if (!parentType) {
      return templates.filter((t) => t.type === "app");
    }

    const childTypes: { [key: string]: string[] } = {
      app: ["workspace"],
      workspace: ["space"],
      space: ["view", "page"],
      view: ["sort", "fields"],
      page: ["fields", "tabs"],
      tabs: ["fields"],
    };

    const allowedTypes = childTypes[parentType] || [];
    return templates.filter((t) => allowedTypes.includes(t.type));
  };

  // Use store methods for dependency management
  const addDependency = async (fieldId: string, propertyId: string) => {
    await appConfigStore.addDependencyWithUI(fieldId, propertyId);
  };

  const removeDependency = async (fieldId: string, depToRemove: string) => {
    await appConfigStore.removeDependencyWithUI(fieldId, depToRemove);
  };

  // Start editing field
  const startEditField = (field: Field) => {
    setEditingField(field.id);
    setEditingOverrideData(JSON.stringify(field.override_data || {}, null, 2));
    setEditingCaption(field.caption || "");
    setEditingVersion(field.version || 1);
  };

  // Save field override_data
  const saveFieldOverride = async () => {
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

  // Render field item
  const renderFieldItem = (field: Field) => {
    // Filter by search query
    const matchesSearch =
      searchQuery && field.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery && !matchesSearch) {
      return null;
    }

    // Highlight matching fields with light blue background
    const highlightClass = matchesSearch
      ? "bg-blue-100 border-l-4 border-l-blue-400"
      : "bg-gray-50";

    return (
      <div
        key={field.id}
        className={`relative px-4 py-2 rounded-md transition-all min-h-[2.5rem] ${
          dragOverField === field.id
            ? "bg-blue-50 border-l-4 border-l-blue-400"
            : highlightClass + " hover:bg-gray-100"
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
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm text-gray-700">
                {appConfigStore.getFieldDisplayName(field)}
              </div>
              {/* Action buttons */}
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => setViewingField(field.id)}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  title="View field"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startEditField(field)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit field"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setShowPropertyDropdown(
                      showPropertyDropdown === field.id ? null : field.id
                    )
                  }
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Add property"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {field.deps && field.deps.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {field.deps.map((dep) => {
                  const depName = dep.replace("property_", "");
                  let badgeColor = "bg-gray-100 text-gray-600";
                  if (depName.includes("required"))
                    badgeColor = "bg-red-100 text-red-700";
                  else if (depName.includes("unique"))
                    badgeColor = "bg-blue-100 text-blue-700";
                  else if (depName.includes("primary"))
                    badgeColor = "bg-purple-100 text-purple-700";
                  else if (depName.includes("maxlength"))
                    badgeColor = "bg-green-100 text-green-700";
                  else if (depName.includes("system"))
                    badgeColor = "bg-yellow-100 text-yellow-700";

                  const isSystemProperty = dep === "property_is_system";
                  return (
                    <span
                      key={dep}
                      className={`inline-flex items-center gap-1 ${
                        isSystemProperty ? "px-2" : "pl-2 pr-1"
                      } py-0.5 rounded-full text-xs font-medium ${badgeColor} group ${
                        !isSystemProperty ? "hover:pr-0.5" : ""
                      } transition-all`}
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

        {/* Property dropdown */}
        {showPropertyDropdown === field.id && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                Select property to add:
              </div>
              {properties
                .filter(
                  (prop) =>
                    prop.id !== "property_is_system" &&
                    prop.id !== "property_not_system"
                )
                .map((prop) => {
                  const propName = prop.id.replace("property_", "");
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
                        alreadyAdded
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <span className={appConfigStore.getPropertyColor(prop)}>
                        {propName}
                      </span>
                      {alreadyAdded && (
                        <span className="text-gray-400 ml-1">(added)</span>
                      )}
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
              <h3 className="text-lg font-semibold mb-2">
                Edit Override Data for {field.id}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Data (JSON)
                </label>
                <textarea
                  value={editingOverrideData}
                  onChange={(e) => setEditingOverrideData(e.target.value)}
                  className="w-full h-64 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="{}"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingField(null);
                    setEditingOverrideData("");
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

  // Render config node
  const renderConfigNode = (node: TreeNode, level: number = 0) => {
    const TypeInfo = configTypes[node.configType] || {
      icon: Package,
      color: "text-gray-600",
    };
    const Icon = TypeInfo.icon;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const nodeDeps = node.deps || [];
    const propertyDeps = nodeDeps.filter((d) => d.startsWith("property_"));
    const fieldDeps = nodeDeps.filter((d) => d.includes("field"));

    return (
      <div
        key={node.id}
        style={{ marginLeft: `${level * 24}px`, marginBottom: "8px" }}
      >
        <div
          className={`flex items-center justify-between h-10 p-2 rounded-md ${
            selectedConfig === node.id
              ? "bg-blue-50 border-l-4 border-l-blue-500"
              : "bg-gray-50 hover:bg-gray-100"
          } ${dragOverConfig === node.id ? "ring-2 ring-blue-400" : ""}`}
          onClick={() => setSelectedConfig(node.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverConfig(node.id);
          }}
          onDragLeave={() => setDragOverConfig(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedProperty) {
              appConfigStore.addDependency(node.id, draggedProperty);
              setDraggedProperty(null);
            } else if (draggedField) {
              appConfigStore.addDependency(node.id, draggedField);
              setDraggedField(null);
            }
            setDragOverConfig(null);
          }}
        >
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

            {propertyDeps.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {propertyDeps.length}p
              </span>
            )}
            {fieldDeps.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {fieldDeps.length}f
              </span>
            )}
          </div>

          <div className="flex gap-1">
            {["app", "workspace", "space", "view", "page", "tabs"].includes(
              node.configType
            ) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateParentId(node.id);
                  setShowTemplateSelect(true);
                }}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Add child"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConfig(node.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash className="w-3 h-3" />
            </button>
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
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <div className="max-w-full mx-auto h-full">
        <div className="flex gap-4 h-[calc(100vh-7rem)]">
          {/* Left Column - Working Configs - 37.5% */}
          <div className="w-[37.5%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
            <WorkspaceHeader
              title="Working Configs"
              titleIcon={Package}
              itemCount={workingConfigs.length}
              showSearch={true}
              searchPlaceholder="Search configs..."
              searchValue={configSearchQuery}
              onSearchChange={setConfigSearchQuery}
              showAddButton={true}
              addButtonText="From Template"
              onAddClick={() => {
                setCreateParentId(selectedConfig);
                setShowTemplateSelect(true);
              }}
            />

            <div className="flex-1 overflow-y-auto">
              {configTree.length > 0 ? (
                (() => {
                  const filteredData = filterConfigNodes(configTree);
                  return filteredData.length > 0 ? (
                    <div>
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
          <div className="w-[37.5%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
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

            <div className="flex-1 overflow-y-auto">
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
                  <div style={{ marginLeft: "24px" }} className="mt-2">
                    {structure.base.map((field) => (
                      <div key={field.id} className="mb-2">
                        {renderFieldItem(field)}
                      </div>
                    ))}
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
                                              {childFields.map((field) => (
                                                <div
                                                  key={field.id}
                                                  className="mb-2"
                                                >
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
          <div className="w-[25%] bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
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

      {/* Edit Field Modal */}
      <ConfigEditModal
        isOpen={!!editingField}
        onClose={() => {
          setEditingField(null);
          setEditingOverrideData("");
          setEditingCaption("");
          setEditingVersion(1);
        }}
        onSave={saveFieldOverride}
        title="Edit Field"
        configId={editingField || ""}
        caption={editingCaption}
        version={editingVersion}
        overrideData={editingOverrideData}
        onCaptionChange={setEditingCaption}
        onVersionChange={setEditingVersion}
        onOverrideDataChange={setEditingOverrideData}
      />

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
    </div>
  );
};

export default AppConfig;
