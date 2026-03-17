import { appConfigStore } from "@breedhub/rxdb-store";
import {
  Book,
  ChevronDown,
  ChevronRight,
  Database,
  GripVertical,
  Layers,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { BaseConfig } from "../types/config-types";
import WorkspaceHeader from "./WorkspaceHeader";

type Field = BaseConfig;

interface HierarchicalStructure {
  base: Field[];
  main: {
    [key: string]: {
      fields: Field[];
      children: { [key: string]: Field[] };
    };
  };
  dictionaries: { [key: string]: Field[] };
}

interface EntityFieldsPanelProps {
  fields: Field[];
  draggedField: string | null;
  renderFieldItem: (field: Field, index?: number) => React.ReactNode;
}

export function EntityFieldsPanel({
  fields,
  draggedField,
  renderFieldItem,
}: EntityFieldsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [structure, setStructure] = useState<HierarchicalStructure>({
    base: [],
    main: {},
    dictionaries: {},
  });
  const [filteredStructure, setFilteredStructure] =
    useState<HierarchicalStructure>({
      base: [],
      main: {},
      dictionaries: {},
    });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["main-entities"])
  );
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);

  // Build hierarchical structure
  useEffect(() => {
    const newStructure = appConfigStore.buildFieldsStructure(fields);
    setStructure(newStructure);
    const filtered = appConfigStore.filterFieldsStructure(
      newStructure,
      searchQuery
    );
    setFilteredStructure(filtered);
  }, [fields, searchQuery]);

  // Auto-expand sections when searching
  useEffect(() => {
    if (searchQuery) {
      const allSections = new Set<string>();
      allSections.add("base");
      allSections.add("main-entities");
      allSections.add("dictionaries");

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

      Object.keys(filteredStructure.dictionaries).forEach((dict) => {
        allSections.add(`dict-${dict}`);
      });

      setExpandedSections(allSections);
    }
  }, [searchQuery, filteredStructure]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
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
          setExpandedSections(new Set());
          setIsTreeExpanded(false);
        }}
        onExpandAll={() => {
          const allSections = new Set<string>();
          allSections.add("base");
          allSections.add("main-entities");
          allSections.add("dictionaries");

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
          position: "relative",
          transform: "translateZ(0)",
          willChange: "scroll-position",
        }}
      >
        {/* Base Fields Section */}
        <div className="mb-2">
          <div
            onClick={() => toggleSection("base")}
            className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center h-full gap-2">
              {expandedSections.has("base") ? (
                <ChevronDown className="w-5 h-5 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 flex-shrink-0" />
              )}
              <Layers className="w-5 h-5 text-blue-600" />
              <span className="font-mono text-sm">Base Fields</span>
              <span className="text-xs text-slate-500">
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
              {filteredStructure.base.map((field) =>
                renderFieldItem(field)
              )}
            </div>
          )}
        </div>

        {/* Main Entities Section */}
        {Object.keys(filteredStructure.main).length > 0 && (
          <div className="mb-2">
            <div
              onClick={() => toggleSection("main-entities")}
              className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <div className="flex items-center h-full gap-2">
                {expandedSections.has("main-entities") ? (
                  <ChevronDown className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 flex-shrink-0" />
                )}
                <Package className="w-5 h-5 text-green-600" />
                <span className="font-mono text-sm">Main Entities</span>
                <span className="text-xs text-slate-500">
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
                    {/* Entity Group */}
                    <div
                      onClick={() => toggleSection(`group-${entityName}`)}
                      className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
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
                        <span className="text-xs text-slate-500">
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
                            className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
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
                              <span className="text-xs text-slate-500">
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
                                      className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
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
                                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                            {entityName}
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
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
              className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <div className="flex items-center h-full gap-2">
                {expandedSections.has("dictionaries") ? (
                  <ChevronDown className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 flex-shrink-0" />
                )}
                <Book className="w-5 h-5 text-orange-600" />
                <span className="font-mono text-sm">Dictionaries</span>
                <span className="text-xs text-slate-500">
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
                        className="flex items-center justify-between h-10 p-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
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
                          <span className="text-xs text-slate-500">
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
  );
}
