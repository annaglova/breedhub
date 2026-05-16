import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useAboveFoldBlock } from "@/contexts/AboveFoldLoadingContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import { withCrudToast } from "@/utils/crudToast";
import type {
  DataSourceConfig,
  ReadFromConfig,
} from "@breedhub/rxdb-store";
import type { EditFieldConfig } from "@/types/field-config";
import {
  buildColumns,
  enrichRecords as enrichRecordsShared,
} from "@/components/shared/generic-table.helpers";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@ui/components/button";
import { DataTable } from "@ui/components/data-table";
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
import { Lock, MoreVertical, Pencil, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditChildRecordDialog } from "../EditChildRecordDialog";

/**
 * Hook to load entity children via readFrom mapping table.
 * Fast path: gets IDs from mapping table, fetches full records by partition.
 */
/**
 * Hook to load data from multiple dataSource configs and merge results.
 * Deduplicates by record ID. Skipped when readFrom is used.
 */
function useMultiTabData(
  entityId: string | undefined,
  dataSources: DataSourceConfig[] | undefined,
  enrich?: (records: any[]) => Promise<any[]>,
) {
  const primary = dataSources?.[0];
  const secondary = dataSources?.[1];
  const hasMultiple = !!secondary;

  const {
    data: primaryData,
    rawData: primaryRaw,
    isLoading: primaryLoading,
    error: primaryError,
    refetch: primaryRefetch,
  } = useTabData({
    parentId: entityId,
    dataSource: primary!,
    enabled: !!primary && !!entityId,
    enrich,
  });

  const {
    data: secondaryData,
    rawData: secondaryRaw,
    isLoading: secondaryLoading,
    error: secondaryError,
    refetch: secondaryRefetch,
  } = useTabData({
    parentId: entityId,
    dataSource: secondary!,
    enabled: hasMultiple && !!secondary && !!entityId,
    enrich,
  });

  // Merge enriched + raw separately so callers can map row.id back to the
  // original UUID record (needed for edit dialog form inputs).
  const records = useMemo(() => {
    if (!hasMultiple) return primaryData;
    if (!primaryData?.length && !secondaryData?.length) return [];

    const seen = new Set<string>();
    const merged: any[] = [];
    for (const record of [...(primaryData || []), ...(secondaryData || [])]) {
      if (record.id && !seen.has(record.id)) {
        seen.add(record.id);
        merged.push(record);
      }
    }
    return merged;
  }, [primaryData, secondaryData, hasMultiple]);

  const rawRecords = useMemo(() => {
    if (!hasMultiple) return primaryRaw;
    if (!primaryRaw?.length && !secondaryRaw?.length) return [];

    const seen = new Set<string>();
    const merged: any[] = [];
    for (const record of [...(primaryRaw || []), ...(secondaryRaw || [])]) {
      if (record.id && !seen.has(record.id)) {
        seen.add(record.id);
        merged.push(record);
      }
    }
    return merged;
  }, [primaryRaw, secondaryRaw, hasMultiple]);

  const isLoading = primaryLoading || (hasMultiple && secondaryLoading);
  const error = primaryError || secondaryError;

  const refetch = useCallback(async () => {
    await primaryRefetch();
    if (hasMultiple) await secondaryRefetch();
  }, [primaryRefetch, secondaryRefetch, hasMultiple]);

  return { records, rawRecords, isLoading, error, refetch };
}

type FieldConfig = EditFieldConfig;

interface EditChildTableTabProps {
  fields?: Record<string, FieldConfig>;
  dataSource?: DataSourceConfig[];
  label?: string;
  onLoadedCount?: (count: number) => void;
  searchFilter?: string;
  entityType?: string;
  addDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  protectedWhen?: { field: string; value: any };
  readFrom?: ReadFromConfig;
  rowActions?: string[]; // "edit", "delete", "navigate" — default: ["edit", "delete"]
  /** Insert position for newly created records.
   *
   *  Today this tab persists straight from EditChildRecordDialog and the
   *  resulting list is re-fetched and re-sorted by `dataSource.childTable.orderBy`,
   *  so the prop has no observable effect. Accepted as part of the shared tab
   *  config so EditChildMatrixTab and EditChildTableTab take the same shape;
   *  wire it in once a draft-row pattern is added here. */
  addPosition?: "top" | "bottom";
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
  protectedWhen,
  readFrom,
  rowActions,
  addPosition: _addPosition,
}: EditChildTableTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const entityId = selectedEntity?.id;

  const tableType = dataSource?.[0]?.childTable?.table || '';
  const isEntityChild = dataSource?.[0]?.type === 'entity_child';

  // Resolve entityType from dataSource if not provided directly
  const resolvedEntityType = useMemo(() => {
    if (entityType) return entityType;
    // For entity_child, table IS the entity type
    if (isEntityChild) {
      return dataSource?.[0]?.childTable?.table || '';
    }
    const table = dataSource?.[0]?.childTable?.table;
    if (!table) return '';
    // Use spaceStore's internal logic: try common patterns
    const normalized = table.replace(/_with_\w+$/, '');
    if (normalized.includes('_in_breed') || normalized.startsWith('breed_')) return 'breed';
    if (normalized.includes('_in_pet') || normalized.startsWith('pet_')) return 'pet';
    if (normalized.includes('_in_litter') || normalized.startsWith('litter_')) return 'litter';
    if (normalized.includes('_in_kennel') || normalized.startsWith('kennel_')) return 'account';
    if (normalized.includes('_in_program') || normalized.startsWith('program_')) return 'program';
    if (normalized.startsWith('contact_')) return 'contact';
    if (normalized.startsWith('account_')) return 'account';
    return '';
  }, [entityType, dataSource, isEntityChild]);

  // Merge readFrom into primary dataSource for useTabData
  const effectiveDataSource = useMemo(() => {
    if (!readFrom || !dataSource?.[0]) return dataSource?.[0];
    return { ...dataSource[0], readFrom };
  }, [readFrom, dataSource]);

  // Atomic enrich callback — FK resolution happens INSIDE useTabData, before
  // setData. One state transition: loading → { data: enriched, rawData: raw }.
  // No intermediate frame where the enriched array would be stale relative to
  // the raw array (which would otherwise show as a skeleton flash on refetch).
  const enrichFn = useCallback(async (recs: any[]) => {
    if (!fields) return recs;
    return enrichRecordsShared(recs, fields);
  }, [fields]);

  const singleResult = useTabData({
    parentId: entityId,
    dataSource: effectiveDataSource!,
    enabled: !!readFrom && !!effectiveDataSource && !!entityId,
    enrich: enrichFn,
  });
  const legacyResult = useMultiTabData(
    entityId,
    readFrom ? undefined : dataSource,
    enrichFn,
  );

  const enrichedRecords = readFrom ? singleResult.data : legacyResult.records;
  const rawRecords = readFrom ? singleResult.rawData : legacyResult.rawRecords;
  const isLoading = readFrom ? singleResult.isLoading : legacyResult.isLoading;
  const error = readFrom ? singleResult.error : legacyResult.error;
  const refetch = readFrom ? singleResult.refetch : legacyResult.refetch;

  // Coordinate edit-page cold-load with header skeleton (atomic flip).
  // Block stays not-ready until parent entity and child data are loaded.
  // No-op outside an AboveFoldLoadingProvider.
  useAboveFoldBlock("edit-tab-body", !!entityId && !isLoading);

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

  const hasRowEdit = !rowActions || rowActions.includes('edit');
  const hasRowDelete = !rowActions || rowActions.includes('delete');
  const hasRowNavigate = rowActions?.includes('navigate');

  const handleEdit = useCallback((row: Record<string, any>) => {
    // Find the raw (UUIDs intact) record by ID for the dialog form — enriched
    // records have FK UUIDs replaced with display names, which breaks form
    // inputs that bind to UUIDs.
    const rawRecord = rawRecords?.find((r: any) => r.id === row.id) || row;
    setEditingRecord(rawRecord);
    setIsDialogOpen(true);
  }, [rawRecords]);

  const handleNavigate = useCallback((row: any) => {
    const rawRecord = rawRecords?.find((r: any) => r.id === row.id) || row;
    const slug = rawRecord.slug || row.slug;
    if (slug) {
      window.location.href = `/${slug}/edit`;
    }
  }, [rawRecords]);

  const handleRowClick = useCallback((row: any) => {
    if (hasRowEdit) {
      handleEdit(row);
    } else if (hasRowNavigate) {
      handleNavigate(row);
    }
  }, [hasRowEdit, hasRowNavigate, handleEdit, handleNavigate]);

  const handleDelete = async () => {
    if (!deletingRecord || !resolvedEntityType) return;

    setIsDeleting(true);
    const baseLabel = label || 'Record';
    const recordName = deletingRecord?.name;
    const fullLabel = recordName ? `${baseLabel} ${recordName}` : baseLabel;

    const result = await withCrudToast(
      () => isEntityChild
        ? spaceStore.delete(resolvedEntityType, deletingRecord.id)
        : spaceStore.deleteChildRecord(resolvedEntityType, tableType, deletingRecord.id),
      { label: fullLabel, verb: 'delete' }
    );
    if (result.ok) {
      setDeletingRecord(null);
      refetch();
    }
    setIsDeleting(false);
  };

  const handleSaved = useCallback(() => {
    refetch();
  }, [refetch]);

  const columns = useMemo(() => {
    if (!fields) return [];

    const dataColumns = buildColumns(fields, { showInTableOnly: true });

    // Actions column — config-driven via rowActions
    const hasAnyAction = hasRowEdit || hasRowDelete || hasRowNavigate;
    if (!hasAnyAction) return dataColumns;

    const actionsColumn: ColumnDef<any> = {
      id: "actions",
      enableSorting: false,
      enableGlobalFilter: false,
      header: () => null,
      cell: ({ row }) => {
        // Check if record is protected (e.g., is_primary=true, service_type_id=X)
        // — read from rawRecords so the protected check sees UUIDs, not the
        // enriched display names.
        const rawRecord = rawRecords?.find((r: any) => r.id === row.original.id);
        const rawData = rawRecord?.additional || rawRecord || row.original.additional || row.original;
        const isProtected = protectedWhen && rawData[protectedWhen.field] === protectedWhen.value;

        if (isProtected) {
          return (
            <div className="flex justify-center">
              <div className="size-[2.25rem] flex items-center justify-center">
                <Lock size={14} className="text-muted-foreground" />
              </div>
            </div>
          );
        }

        return (
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
              {hasRowEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
                  <Pencil className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {hasRowNavigate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleNavigate(row.original); }}>
                  <SquarePen className="size-4 mr-2" />
                  Open full edit
                </DropdownMenuItem>
              )}
              {hasRowDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeletingRecord(row.original); }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    };

    return [...dataColumns, actionsColumn];
  }, [fields, handleEdit, handleNavigate, hasRowEdit, hasRowDelete, hasRowNavigate, rawRecords, protectedWhen]);

  // Report count
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(enrichedRecords?.length ?? 0);
    }
  }, [isLoading, onLoadedCount, enrichedRecords?.length]);

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

  // Enrichment runs inside useTabData/useMultiTabData as part of loadData,
  // so isLoading already covers cold-start. Silent refetches arrive as one
  // atomic state transition (raw + enriched together) → no skeleton flash.
  const showSkeleton = isLoading;

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
        isLoading={showSkeleton}
        skeletonRows={enrichedRecords?.length || 5}
        globalFilter={searchFilter}
        paginated={false}
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
          isEntityChild={isEntityChild}
          dataSources={isEntityChild ? dataSource : undefined}
          readFrom={readFrom}
          parentEntity={selectedEntity}
          readOnly={!!(protectedWhen && editingRecord && (editingRecord.additional || editingRecord)[protectedWhen.field] === protectedWhen.value)}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete {label || "Record"}?</DialogTitle>
          </DialogHeader>
          <div>
            <div className="modal-card">
              <p className="text-base">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeletingRecord(null)}
                className="small-button bg-secondary-100 hover:bg-secondary-200 focus-visible:bg-secondary-200 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="small-button bg-red-100 hover:bg-red-200 focus-visible:bg-red-300 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
