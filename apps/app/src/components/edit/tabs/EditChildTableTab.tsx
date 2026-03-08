import { useSelectedEntity } from "@/contexts/SpaceContext";
import { dictionaryStore, spaceStore, toast, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { DataTable, DataTableColumnHeader } from "@ui/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditChildRecordDialog } from "../EditChildRecordDialog";

interface FieldConfig {
  displayName: string;
  fieldType: string;
  component?: string;
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
  searchFilter?: string;
  entityType?: string;
  addDialogOpen?: boolean;
  onAddDialogClose?: () => void;
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
        enableGlobalFilter: !!config.searchable,
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
 * Supports Edit/Delete/Add via EditChildRecordDialog.
 */
export function EditChildTableTab({
  fields,
  dataSource,
  label,
  onLoadedCount,
  searchFilter,
  entityType,
  addDialogOpen,
  onAddDialogClose,
}: EditChildTableTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const entityId = selectedEntity?.id;

  // Resolve entityType from dataSource if not provided directly
  const resolvedEntityType = useMemo(() => {
    if (entityType) return entityType;
    const tableType = dataSource?.[0]?.childTable?.table;
    if (!tableType) return '';
    // Use spaceStore's internal logic: try common patterns
    const normalized = tableType.replace(/_with_\w+$/, '');
    if (normalized.includes('_in_breed') || normalized.startsWith('breed_')) return 'breed';
    if (normalized.includes('_in_pet') || normalized.startsWith('pet_')) return 'pet';
    if (normalized.includes('_in_litter') || normalized.startsWith('litter_')) return 'litter';
    if (normalized.includes('_in_kennel') || normalized.startsWith('kennel_')) return 'account';
    if (normalized.includes('_in_program') || normalized.startsWith('program_')) return 'program';
    if (normalized.startsWith('contact_')) return 'contact';
    if (normalized.startsWith('account_')) return 'account';
    return '';
  }, [entityType, dataSource]);

  const tableType = dataSource?.[0]?.childTable?.table || '';

  const {
    data: records,
    isLoading,
    error,
    refetch,
  } = useTabData({
    parentId: entityId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!entityId,
  });

  const { enriched: enrichedRecords, isEnriching } = useEnrichedRecords(records, fields);

  // Dialog state
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<Record<string, any> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Add button from parent (TabOutletRenderer)
  useEffect(() => {
    if (addDialogOpen) {
      setEditingRecord(null);
      setIsDialogOpen(true);
    }
  }, [addDialogOpen]);

  // Sync dialog close back to parent
  const handleDialogClose = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRecord(null);
      onAddDialogClose?.();
    }
  }, [onAddDialogClose]);

  const handleEdit = useCallback((row: Record<string, any>) => {
    setEditingRecord(row);
    setIsDialogOpen(true);
  }, []);

  const handleRowClick = useCallback((row: any) => {
    handleEdit(row);
  }, [handleEdit]);

  const handleDelete = async () => {
    if (!deletingRecord || !resolvedEntityType) return;

    setIsDeleting(true);
    try {
      await spaceStore.deleteChildRecord(resolvedEntityType, tableType, deletingRecord.id);
      toast.success(`${label || "Record"} deleted`);
      setDeletingRecord(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || `Failed to delete ${label || "record"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaved = useCallback(() => {
    refetch();
  }, [refetch]);

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
            <Button
              variant="ghost-secondary"
              className="size-[2.25rem] rounded-full p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingRecord(row.original)}
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
  }, [fields, handleEdit]);

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
        globalFilter={searchFilter}
        paginated={enrichedRecords.length > 20}
        defaultPageSize={20}
        emptyMessage={`No ${label || "records"} found`}
        onRowClick={handleRowClick}
      />

      {/* Edit/Create dialog */}
      {fields && entityId && (
        <EditChildRecordDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          record={editingRecord}
          fields={fields}
          tableType={tableType}
          parentId={entityId}
          entityType={resolvedEntityType}
          label={label}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {label || "Record"}?</DialogTitle>
          </DialogHeader>
          <div className="modal-card">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingRecord(null)}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="small-button bg-red-100 hover:bg-red-200 focus:bg-red-300 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
