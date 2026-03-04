import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { DataTable, DataTableColumnHeader } from "@ui/components/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";

interface EditChildTableTabProps {
  childEntity?: string;
  displayFields?: string[];
  fields?: Record<string, any>;
  dataSource?: DataSourceConfig[];
  onLoadedCount?: (count: number) => void;
}

function formatCellValue(value: unknown, fieldType?: string): string {
  if (value == null || value === "") return "";

  if (fieldType === "boolean" || typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (fieldType === "date" || fieldType === "datetime") {
    const date = new Date(value as string);
    if (!isNaN(date.getTime())) {
      return fieldType === "datetime"
        ? date.toLocaleString()
        : date.toLocaleDateString();
    }
  }

  return String(value);
}

function buildColumns(
  displayFields: string[],
  fields: Record<string, any>
): ColumnDef<any>[] {
  return displayFields.map((fieldName) => {
    const fieldKey = Object.keys(fields).find(
      (key) => key.endsWith(`_${fieldName}`) || key === fieldName
    );
    const fieldConfig = fieldKey ? fields[fieldKey] : null;
    const displayName = fieldConfig?.displayName || fieldName;

    return {
      id: fieldName,
      accessorFn: (row: any) => row[fieldName] ?? row.additional?.[fieldName] ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={displayName} />
      ),
      cell: ({ getValue }) => formatCellValue(getValue(), fieldConfig?.fieldType),
    };
  });
}

/**
 * EditChildTableTab - Child entity table for edit page
 *
 * Displays child records (identifiers, titles, health, etc.) using DataTable.
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

  const {
    data: records,
    isLoading,
    error,
  } = useTabData({
    parentId: entityId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!entityId,
  });

  const columns = useMemo(() => {
    if (!displayFields || !fields) return [];

    const dataColumns = buildColumns(displayFields, fields);

    // Actions column
    const actionsColumn: ColumnDef<any> = {
      id: "actions",
      enableSorting: false,
      enableGlobalFilter: false,
      header: () => null,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                // TODO: edit handler
                console.log("Edit", row.original);
              }}
            >
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                // TODO: delete handler
                console.log("Delete", row.original);
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    };

    return [...dataColumns, actionsColumn];
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
      <DataTable
        columns={columns}
        data={recordsList}
        isLoading={isLoading}
        searchable
        searchPlaceholder={`Search ${childEntity || "records"}...`}
        paginated={recordsList.length > 20}
        defaultPageSize={20}
        variant="bordered"
        size="sm"
        emptyMessage={`No ${childEntity || "records"} found`}
      />
    </div>
  );
}
