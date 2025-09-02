import { appConfigStore } from "@breedhub/rxdb-store";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  File,
  FileCode,
  Grid,
  Layers,
  List,
  Package,
  Plus,
  Settings,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";
import ConfigEditModal from "../components/ConfigEditModal";
import ConfigViewModal from "../components/ConfigViewModal";
import WorkspaceHeader from "../components/WorkspaceHeader";

interface Template {
  id: string;
  type: string;
  self_data: any;
  override_data: any;
  data: any;
  deps: string[];
  tags: string[];
  caption?: string;
  category?: string;
}

interface TreeNode {
  id: string;
  name: string;
  templateType: string;
  children: TreeNode[];
  data: any;
  expanded?: boolean;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<string>("");
  const [editingCaption, setEditingCaption] = useState<string>("");
  const [editingVersion, setEditingVersion] = useState<number>(1);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [viewingNode, setViewingNode] = useState<string | null>(null);
  const [addType, setAddType] = useState<string>("");
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Template types with icons
  const templateTypes = {
    app: { name: "App", icon: Package, color: "text-purple-600" },
    workspace: { name: "Workspace", icon: Layers, color: "text-blue-600" },
    space: { name: "Space", icon: Grid, color: "text-green-600" },
    view: { name: "View", icon: Grid, color: "text-yellow-600" },
    page: { name: "Page", icon: File, color: "text-orange-600" },
    sort: { name: "Sort Config", icon: Settings, color: "text-gray-600" },
    fields: { name: "Fields Config", icon: List, color: "text-indigo-600" },
    tabs: { name: "Tabs Config", icon: Layers, color: "text-pink-600" },
  };

  // Load templates from store
  useEffect(() => {
    const loadTemplates = () => {
      const allConfigs = appConfigStore.configsList.value || [];
      // Filter by tag 'template'
      const templateConfigs = allConfigs.filter(
        (c) => c.tags && c.tags.includes("template")
      );

      // Recalculate data for all templates based on hierarchy
      const recalculatedTemplates =
        appConfigStore.recalculateTemplateData(templateConfigs);
      setTemplates(recalculatedTemplates);

      // Build tree structure
      const tree = appConfigStore.buildTemplateTree(recalculatedTemplates);
      setTreeData(tree);
    };

    loadTemplates();
    const unsubscribe = appConfigStore.configs.subscribe(loadTemplates);
    return () => unsubscribe();
  }, []);

  // Toggle node expansion
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Add new template
  const addTemplate = async (type: string, parentId: string | null) => {
    await appConfigStore.createTemplate(type, parentId);

    // Expand parent node to show the new child
    if (parentId) {
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(parentId);
      setExpandedNodes(newExpanded);
    }

    setShowAddModal(false);
    setAddType("");
    setAddParentId(null);
  };

  // Delete template using store method
  const deleteTemplate = async (nodeId: string) => {
    const template = templates.find((t) => t.id === nodeId);
    const hasChildren = template?.deps && template.deps.length > 0;

    // Confirm deletion with warning about children
    if (
      !confirm(
        `Delete template "${nodeId}"${
          hasChildren ? " and all its child templates" : ""
        }?`
      )
    )
      return;

    await appConfigStore.deleteTemplateWithChildren(nodeId);
  };

  // Start editing node
  const startEditNode = (node: TreeNode) => {
    const template = templates.find((t) => t.id === node.id);
    setEditingNode(node.id);
    setEditingData(JSON.stringify(template?.override_data || {}, null, 2));
    setEditingCaption(template?.caption || node.name);
    setEditingVersion(template?.version || 1);
  };

  // Save node edit using store method
  const saveNodeEdit = async () => {
    if (!editingNode) return;

    try {
      const overrideData = JSON.parse(editingData || "{}");

      await appConfigStore.updateTemplate(editingNode, {
        caption: editingCaption,
        version: editingVersion,
        override_data: overrideData,
      });

      setEditingNode(null);
      setEditingData("");
      setEditingCaption("");
      setEditingVersion(1);
    } catch (error) {
      alert("Invalid JSON");
    }
  };

  // Clone template
  const cloneTemplate = async (nodeId: string) => {
    await appConfigStore.cloneTemplate(nodeId);
  };

  // Get available child types for a template type
  const getAvailableChildTypes = (parentType: string): string[] => {
    const childTypes: { [key: string]: string[] } = {
      app: ["workspace"],
      workspace: ["space"],
      space: ["view", "page"],
      view: ["sort", "fields"],
      page: ["fields", "tabs"],
      tabs: ["fields"],
    };
    return childTypes[parentType] || [];
  };

  // Get template type from template
  const getTemplateType = (template: Template): string => {
    // Return actual type
    return template.type;
  };

  // Filter nodes based on search query
  const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
    if (!searchQuery) return nodes;

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.id.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = filterNodes(node.children);

      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }

      return acc;
    }, []);
  };

  // Get field display name (reuse from Fields page pattern)
  const getFieldDisplayName = (field: { id: string; caption?: string }) => {
    if (field.caption) return field.caption;
    // Remove prefixes and format ID
    return field.id
      .replace(/^template_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render tree node
  const renderNode = (node: TreeNode, level: number = 0) => {
    const template = templates.find((t) => t.id === node.id);
    const TypeInfo = templateTypes[node.templateType];
    const Icon = TypeInfo?.icon || Package;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const availableChildTypes = getAvailableChildTypes(node.templateType);

    return (
      <div key={node.id} style={{ marginLeft: `${level * 24}px`, marginBottom: level === 0 ? "8px" : "0px" }}>
        <div
          className={`flex items-center justify-between p-2 rounded-md ${
            selectedNode === node.id
              ? "bg-blue-50 border-l-4 border-l-blue-500"
              : "bg-gray-50 hover:bg-gray-100"
          }`}
          onClick={() => setSelectedNode(node.id)}
        >
          <div className="flex items-center gap-2 ">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
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

            <Icon className={`w-4 h-4 ${TypeInfo?.color || "text-gray-600"}`} />
            <span className="font-mono text-sm">{node.name}</span>
            <span className="text-xs text-gray-500">({node.templateType})</span>
          </div>

          <div className="flex gap-1">
            {availableChildTypes.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAddParentId(node.id);
                  setShowAddModal(true);
                }}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Add child"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingNode(node.id);
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View config"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEditNode(node);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit config"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cloneTemplate(node.id);
              }}
              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
              title="Clone"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTemplate(node.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Determine add button text and parent based on selection
  const getAddButtonContext = () => {
    if (!selectedNode) {
      return { text: "Add App Template", parentId: null };
    }

    const selectedTemplate = templates.find((t) => t.id === selectedNode);
    if (!selectedTemplate) {
      return { text: "Add App Template", parentId: null };
    }

    const availableTypes = getAvailableChildTypes(selectedTemplate.type);
    if (availableTypes.length === 0) {
      return { text: "Add App Template", parentId: null };
    }

    const firstChildType = availableTypes[0];
    const typeInfo = templateTypes[firstChildType];
    return {
      text: `Add ${typeInfo?.name || firstChildType}`,
      parentId: selectedNode,
    };
  };

  const addButtonContext = getAddButtonContext();

  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full">
        <div className="bg-white rounded-lg shadow-md p-6 h-[calc(100vh-7rem)] flex flex-col">
          <WorkspaceHeader
            title="Templates"
            titleIcon={FileCode}
            itemCount={templates.length}
            showSearch={true}
            searchPlaceholder="Search templates..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            showAddButton={true}
            addButtonText={addButtonContext.text}
            onAddClick={() => {
              setAddParentId(addButtonContext.parentId);
              setShowAddModal(true);
            }}
          />

          <div
            className="flex-1 overflow-y-auto"
            onClick={(e) => {
              // Only deselect if clicking on the container itself, not on child elements
              if (e.target === e.currentTarget) {
                setSelectedNode(null);
              }
            }}
          >
            {/* Tree View */}
            <div
              className="min-h-full"
              onClick={(e) => {
                // Check if clicked on empty space within tree container
                if (e.target === e.currentTarget) {
                  setSelectedNode(null);
                }
              }}
            >
              {treeData.length > 0 ? (
                (() => {
                  const filteredData = filterNodes(treeData);
                  return filteredData.length > 0 ? (
                    <div>
                      {filteredData.map((node) => renderNode(node))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No templates found matching "{searchQuery}"
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No templates yet. Click "Add App Template" to create your
                  first template.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {addParentId ? "Add Child Template" : "Add App Template"}
            </h3>

            <div className="space-y-2">
              {(addParentId
                ? getAvailableChildTypes(
                    templates.find((t) => t.id === addParentId)?.type || ""
                  )
                : ["app"]
              ).map((type) => {
                const TypeInfo = templateTypes[type];
                const Icon = TypeInfo?.icon || Package;

                return (
                  <button
                    key={type}
                    onClick={() => addTemplate(type, addParentId)}
                    className="w-full p-3 flex items-center gap-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        TypeInfo?.color || "text-gray-600"
                      }`}
                    />
                    <span className="font-medium">
                      {TypeInfo?.name || type}
                    </span>
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

      {/* Edit Modal */}
      <ConfigEditModal
        isOpen={!!editingNode}
        onClose={() => {
          setEditingNode(null);
          setEditingData("");
          setEditingCaption("");
          setEditingVersion(1);
        }}
        onSave={saveNodeEdit}
        title="Edit Template"
        configId={editingNode || ""}
        caption={editingCaption}
        version={editingVersion}
        overrideData={editingData}
        onCaptionChange={setEditingCaption}
        onVersionChange={setEditingVersion}
        onOverrideDataChange={setEditingData}
      />

      {/* View Modal */}
      {viewingNode &&
        (() => {
          const template = templates.find((t) => t.id === viewingNode);
          if (!template) return null;

          return (
            <ConfigViewModal
              isOpen={true}
              onClose={() => setViewingNode(null)}
              onEdit={() => {
                setViewingNode(null);
                startEditNode({
                  id: viewingNode,
                  name: template.caption || viewingNode,
                  templateType: template.type,
                  children: [],
                  data: template.self_data,
                });
              }}
              title="View Template"
              config={template}
            />
          );
        })()}
    </div>
  );
}
