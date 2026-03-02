import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { useEffect, useMemo } from "react";

interface EditChildTableTabProps {
  childEntity?: string;
  displayFields?: string[];
  fields?: Record<string, any>;
  dataSource?: DataSourceConfig[];
  onLoadedCount?: (count: number) => void;
}

/**
 * EditChildTableTab - Child entity table for edit page
 *
 * Displays child records (identifiers, titles, health, etc.) in a basic table.
 * CRUD operations will be added in next iteration.
 */
export function EditChildTableTab({
  childEntity,
  displayFields,
  fields,
  dataSource,
  onLoadedCount,
}: EditChildTableTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const entityId = selectedEntity?.id;

  // Load child records via useTabData
  const {
    data: records,
    isLoading,
    error,
  } = useTabData({
    parentId: entityId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!entityId,
  });

  // Get display columns from config
  const columns = useMemo(() => {
    if (!displayFields || !fields) return [];
    return displayFields.map((fieldName) => {
      // Find matching field config
      const fieldKey = Object.keys(fields).find((key) =>
        key.endsWith(`_${fieldName}`) || key === fieldName
      );
      const fieldConfig = fieldKey ? fields[fieldKey] : null;
      return {
        key: fieldName,
        label: fieldConfig?.displayName || fieldName,
      };
    });
  }, [displayFields, fields]);

  // Report count
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(records?.length ?? 0);
    }
  }, [isLoading, onLoadedCount, records?.length]);

  // No dataSource configured
  if (!dataSource?.[0]) {
    return (
      <div className="py-8 text-center text-secondary">
        {childEntity
          ? `No data source configured for ${childEntity}`
          : "No child entity configured"}
      </div>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="card card-rounded flex flex-col p-6 lg:px-8 animate-pulse">
        <div
          className="grid gap-3 border-b border-border px-6 py-3 lg:px-8"
          style={{
            gridTemplateColumns: `repeat(${columns.length || 3}, 1fr)`,
          }}
        >
          {Array.from({ length: columns.length || 3 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-20"
            />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid gap-3 px-6 py-3 lg:px-8"
            style={{
              gridTemplateColumns: `repeat(${columns.length || 3}, 1fr)`,
            }}
          >
            {Array.from({ length: columns.length || 3 }).map((_, j) => (
              <div
                key={j}
                className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-28"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">
            Failed to load {childEntity || "records"}
          </p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const recordsList = records || [];

  return (
    <div className="card card-rounded flex flex-col p-6 lg:px-8 cursor-default">
      {recordsList.length > 0 && columns.length > 0 ? (
        <div className="grid">
          {/* Header */}
          <div
            className="grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            }}
          >
            {columns.map((col) => (
              <div key={col.key}>{col.label}</div>
            ))}
          </div>

          {/* Rows */}
          {recordsList.map((record: any, index: number) => (
            <div
              key={record.id || index}
              className={cn(
                "grid items-center gap-3 px-6 py-2 lg:px-8",
                index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
              )}
              style={{
                gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              }}
            >
              {columns.map((col) => (
                <div key={col.key}>
                  {record[col.key] ??
                    record.additional?.[col.key] ??
                    ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center">
          No {childEntity || "records"} found
        </span>
      )}
    </div>
  );
}
