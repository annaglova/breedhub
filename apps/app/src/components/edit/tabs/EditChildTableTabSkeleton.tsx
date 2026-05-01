/**
 * EditChildTableTabSkeleton — column-aware placeholder for EditChildTableTab
 * while its lazy chunk is downloading. Builds column headers from the same
 * `fields` config the real tab will use, so cold-load → real-table swap
 * keeps the same column count, headers, and actions column.
 *
 * Eagerly loaded (not in any lazy chunk) so it can serve as a Suspense
 * fallback. The DataTable in skeleton mode handles the data-load stage too,
 * giving one continuous skeleton frame across chunk download + data load.
 */
import type { EditFieldConfig } from "@/types/field-config";
import { DataTable, DataTableColumnHeader } from "@ui/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { extractFieldName } from "./edit-child-table.helpers";

interface EditChildTableTabSkeletonProps {
  fields?: Record<string, EditFieldConfig> | null;
  rowActions?: string[];
}

function buildSkeletonColumns(
  fields: Record<string, EditFieldConfig>,
  hasActions: boolean,
): ColumnDef<any>[] {
  const dataColumns: ColumnDef<any>[] = Object.entries(fields)
    .filter(([, config]) => config.showInTable)
    .sort(
      (a, b) =>
        (a[1].order ?? a[1].sortOrder ?? 0) -
        (b[1].order ?? b[1].sortOrder ?? 0),
    )
    .map(([key, config]) => ({
      id: extractFieldName(key),
      accessorKey: extractFieldName(key),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={config.displayName ?? ""} />
      ),
    }));

  if (!hasActions) return dataColumns;

  const actionsColumn: ColumnDef<any> = {
    id: "actions",
    enableSorting: false,
    enableGlobalFilter: false,
    header: () => null,
    size: 50,
  };

  return [...dataColumns, actionsColumn];
}

export function EditChildTableTabSkeleton({
  fields,
  rowActions,
}: EditChildTableTabSkeletonProps) {
  const hasActions =
    !rowActions ||
    rowActions.includes("edit") ||
    rowActions.includes("delete") ||
    rowActions.includes("navigate");

  const columns = fields ? buildSkeletonColumns(fields, hasActions) : [];

  return (
    <div className="cursor-default">
      <DataTable
        columns={columns}
        data={[]}
        isLoading
        skeletonRows={5}
        paginated={false}
        emptyMessage=""
      />
    </div>
  );
}
