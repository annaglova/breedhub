import { appConfigStore } from "@breedhub/rxdb-store";
import { GripVertical, Settings, Tag } from "lucide-react";
import { useState } from "react";
import type { BaseConfig } from "../types/config-types";
import { configTypes } from "../types/config-types";
import PropertyCategoryIcon from "./PropertyCategoryIcon";
import WorkspaceHeader from "./WorkspaceHeader";

type Property = BaseConfig;

interface PropertiesPanelProps {
  properties: Property[];
  draggedProperty: string | null;
  onDragProperty: (id: string | null) => void;
  onDragOverFieldClear: () => void;
}

export function PropertiesPanel({
  properties,
  draggedProperty,
  onDragProperty,
  onDragOverFieldClear,
}: PropertiesPanelProps) {
  const [propertyFilterType, setPropertyFilterType] = useState<string>("all");
  const [showSystemProperties, setShowSystemProperties] = useState(false);

  return (
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
            label: info.name,
          })),
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
          <div className="text-center text-slate-500 py-8">
            No properties found
          </div>
        ) : (
          <div className="space-y-2 ">
            {properties
              .filter((property) => {
                const hasNoType =
                  !property.tags || property.tags.length === 0;
                const matchesType =
                  propertyFilterType === "all" ||
                  property.tags?.includes(propertyFilterType) ||
                  hasNoType;
                const matchesSystemFilter =
                  showSystemProperties || property.category !== "system";
                return matchesType && matchesSystemFilter;
              })
              .map((property) => (
                <div
                  key={property.id}
                  className={`p-3 border rounded-lg transition-all cursor-move ${
                    draggedProperty === property.id
                      ? "opacity-50 scale-95 border-blue-400"
                      : "hover:bg-slate-50"
                  }`}
                  draggable
                  onDragStart={() => onDragProperty(property.id)}
                  onDragEnd={() => {
                    onDragProperty(null);
                    onDragOverFieldClear();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div
                            className={`font-mono text-sm ${appConfigStore.getPropertyColor(
                              property
                            )}`}
                          >
                            {property.id.replace("property_", "")}
                          </div>
                          <PropertyCategoryIcon
                            category={property.category}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Object.entries(property.data || {})
                            .slice(0, 2)
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-block mr-3"
                              >
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
  );
}
