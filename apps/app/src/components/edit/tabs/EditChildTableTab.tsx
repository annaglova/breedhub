import { useSelectedEntity } from "@/contexts/SpaceContext";
import { dictionaryStore, useTabData } from "@breedhub/rxdb-store";
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
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface FieldConfig {
  displayName: string;
  fieldType: string;
  showInTable?: boolean;
  showInForm?: boolean;
  order?: number;
  sortOrder?: number;
  [key: string]: any;
}

interface EditChildTableTabProps {
  fields?: Record<string, FieldConfig>;
  dataSource?: DataSourceConfig[];
  label?: string;
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

/** Extract field name from config key: "title_in_pet_field_date" → "date" */
function extractFieldName(configKey: string): string {
  const match = configKey.match(/_field_(.+)$/);
  return match ? match[1] : configKey;
}

function buildColumns(fields: Record<string, FieldConfig>): ColumnDef<any>[] {
  return Object.entries(fields)
    .filter(([, config]) => config.showInTable)
    .sort((a, b) => (a[1].order ?? a[1].sortOrder ?? 0) - (b[1].order ?? b[1].sortOrder ?? 0))
    .map(([key, config]) => {
      const fieldName = extractFieldName(key);
      return {
        id: fieldName,
        accessorFn: (row: any) => row[fieldName] ?? row.additional?.[fieldName] ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={config.displayName} />
        ),
        cell: ({ getValue }) => formatCellValue(getValue(), config.fieldType),
      };
    });
}

/** Resolve FK UUIDs to display names using DictionaryStore */
function useEnrichedRecords(
  records: any[] | undefined,
  fields: Record<string, FieldConfig> | undefined,
) {
  const [enriched, setEnriched] = useState<any[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // Extract FK field metadata from config
  const fkFields = useMemo(() => {
    if (!fields) return [];
    return Object.entries(fields)
      .filter(([, config]) => config.isForeignKey)
      .map(([key, config]) => ({
        fieldName: extractFieldName(key),
        referencedTable: config.referencedTable as string,
        referencedFieldName: (config.referencedFieldName || "name") as string,
      }));
  }, [fields]);

  useEffect(() => {
    if (!records || records.length === 0) {
      setEnriched(records || []);
      return;
    }
    if (fkFields.length === 0) {
      setEnriched(records);
      return;
    }

    let cancelled = false;
    setIsEnriching(true);

    async function resolve() {
      // Collect unique IDs per FK field and resolve in parallel
      const lookups = new Map<string, Map<string, string>>();

      await Promise.all(
        fkFields.map(async (fk) => {
          const ids = new Set<string>();
          for (const r of records!) {
            const val = r[fk.fieldName] ?? r.additional?.[fk.fieldName];
            if (val) ids.add(val);
          }

          const resolved = new Map<string, string>();
          await Promise.all(
            [...ids].map(async (id) => {
              const rec = await dictionaryStore.getRecordById(fk.referencedTable, id);
              if (rec) {
                resolved.set(id, String(rec[fk.referencedFieldName] || rec.name || ""));
              }
            }),
          );
          lookups.set(fk.fieldName, resolved);
        }),
      );

      if (cancelled) return;

      // Build enriched records with names instead of UUIDs
      const result = records!.map((record) => {
        const enrichedRecord = { ...record };
        if (record.additional) {
          enrichedRecord.additional = { ...record.additional };
        }
        for (const fk of fkFields) {
          const resolved = lookups.get(fk.fieldName);
          if (!resolved) continue;

          if (enrichedRecord[fk.fieldName] && resolved.has(enrichedRecord[fk.fieldName])) {
            enrichedRecord[fk.fieldName] = resolved.get(enrichedRecord[fk.fieldName]);
          } else if (enrichedRecord.additional?.[fk.fieldName] && resolved.has(enrichedRecord.additional[fk.fieldName])) {
            enrichedRecord.additional[fk.fieldName] = resolved.get(enrichedRecord.additional[fk.fieldName]);
          }
        }
        return enrichedRecord;
      });

      setEnriched(result);
      setIsEnriching(false);
    }

    resolve();
    return () => { cancelled = true; };
  }, [records, fkFields]);

  return { enriched, isEnriching };
}

/**
 * EditChildTableTab - Child entity table for edit page
 *
 * Displays child records (identifiers, titles, health, etc.) using DataTable.
 * Columns are driven by fields config with showInTable flag.
 * FK fields are resolved to display names via DictionaryStore.
 * CRUD operations will be added in next iteration.
 */
export function EditChildTableTab({
  fields,
  dataSource,
  label,
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

  const { enriched: enrichedRecords, isEnriching } = useEnrichedRecords(records, fields);

  const columns = useMemo(() => {
    if (!fields) return [];

    const dataColumns = buildColumns(fields);

    // Actions column
    const actionsColumn: ColumnDef<any> = {
      id: "actions",
      enableSorting: false,
      enableGlobalFilter: false,
      header: () => null,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost-secondary" className="size-[2.25rem] rounded-full p-0">
              <MoreVertical size={16} />
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
  }, [fields]);

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
        {label
          ? `No data source configured for ${label}`
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
            Failed to load {label || "records"}
          </p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cursor-default">
      <DataTable
        columns={columns}
        data={enrichedRecords}
        isLoading={isLoading || isEnriching}
        searchable
        searchPlaceholder={`Search ${label || "records"}...`}
        paginated={enrichedRecords.length > 20}
        defaultPageSize={20}
        emptyMessage={`No ${label || "records"} found`}
      />
    </div>
  );
}
