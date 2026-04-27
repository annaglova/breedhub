import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { withCrudToast } from "@/utils/crudToast";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { DateTimeInput } from "@ui/components/form-inputs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib/utils";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ────────────────────────────────────────────────────────────────────────────
// Field role helpers
// ────────────────────────────────────────────────────────────────────────────

type MatrixRole =
  | "rowHeader"
  | "columnHeader"
  | "cell"
  | "constant"
  | "default";

interface MatrixFieldConfig {
  matrixRole?: MatrixRole;
  fieldType?: string;
  component?: string;
  displayName?: string;
  defaultValue?: unknown;
  autoFillOnAdd?: "clientNow";
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
}

interface ParsedFields {
  cellTable: string;
  rowHeader?: { column: string; field: MatrixFieldConfig };
  columnHeader?: { column: string; field: MatrixFieldConfig };
  cell?: { column: string; field: MatrixFieldConfig };
  constants: Record<string, unknown>;
  defaults: Record<string, unknown>;
}

/** Extract column name from config key: "pet_measurement_field_date" → "date" */
function extractColumnName(fieldKey: string, cellTable: string): string {
  const prefix = `${cellTable}_field_`;
  return fieldKey.startsWith(prefix) ? fieldKey.slice(prefix.length) : fieldKey;
}

/** Extract cellTable from the first field key: "pet_measurement_field_x" → "pet_measurement" */
function extractCellTable(fields: Record<string, MatrixFieldConfig>): string {
  const firstKey = Object.keys(fields)[0] ?? "";
  const match = firstKey.match(/^(.+)_field_[^_]+/);
  return match ? match[1] : "";
}

function parseFields(fields: Record<string, MatrixFieldConfig>): ParsedFields {
  const cellTable = extractCellTable(fields);
  const parsed: ParsedFields = {
    cellTable,
    constants: {},
    defaults: {},
  };

  for (const [key, field] of Object.entries(fields)) {
    const column = extractColumnName(key, cellTable);
    switch (field.matrixRole) {
      case "rowHeader":
        parsed.rowHeader = { column, field };
        break;
      case "columnHeader":
        parsed.columnHeader = { column, field };
        break;
      case "cell":
        parsed.cell = { column, field };
        break;
      case "constant":
        if (field.defaultValue !== undefined) {
          parsed.constants[column] = field.defaultValue;
        }
        break;
      case "default":
        if (field.defaultValue !== undefined) {
          parsed.defaults[column] = field.defaultValue;
        }
        break;
    }
  }

  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────
// Input helpers
// ────────────────────────────────────────────────────────────────────────────

function inputTypeForFieldType(fieldType?: string): string {
  switch (fieldType) {
    case "datetime":
      return "datetime-local";
    case "date":
      return "date";
    case "number":
      return "number";
    default:
      return "text";
  }
}

function parseHeaderInput(value: string, fieldType?: string): string | null {
  if (!value) return null;
  if (fieldType === "datetime") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return value;
}

// ────────────────────────────────────────────────────────────────────────────
// Row shape
// ────────────────────────────────────────────────────────────────────────────

interface MatrixRow {
  key: string;
  header: unknown;
  isDraft: boolean;
  /** columnId -> cell record (RxDB child doc with .additional) */
  cellRecords: Record<string, Record<string, any>>;
}

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────

interface EditChildMatrixTabProps {
  fields: Record<string, MatrixFieldConfig>;
  dataSource: DataSourceConfig[];
  label?: string;
  actionTypes?: string[];
  rowActions?: string[];
  /** Add-button signal from PageMenu (set true to add row, then closed via callback) */
  addDialogOpen?: boolean;
  onAddDialogClose?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function EditChildMatrixTab({
  fields,
  dataSource,
  label,
  actionTypes,
  rowActions,
  addDialogOpen,
  onAddDialogClose,
}: EditChildMatrixTabProps) {
  const selectedEntity = useSelectedEntity();
  const parentId = selectedEntity?.id;

  const ds = dataSource?.[0];
  const readFrom = ds?.readFrom;
  const cellTableFromDataSource = ds?.childTable?.table;

  const parsed = useMemo(() => parseFields(fields), [fields]);
  const cellTable = cellTableFromDataSource || parsed.cellTable;

  // Entity type whose child-collection holds cell records (e.g., 'pet')
  const columnEntityTable = readFrom?.entityTable;

  const canDeleteRow = rowActions ? rowActions.includes("delete") : true;

  // ── Load column entities (pets via mapping) ─────────────────────────────
  const [columnEntities, setColumnEntities] = useState<Array<Record<string, any>>>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (!parentId || !readFrom || !columnEntityTable) {
      setColumnEntities([]);
      return;
    }
    setColumnsLoading(true);
    spaceStore
      .loadEntitiesViaMapping(
        columnEntityTable,
        readFrom.table,
        readFrom.parentField,
        parentId,
        readFrom.entityIdField,
        readFrom.entityPartitionField,
      )
      .then((entities) => {
        if (cancelled) return;
        setColumnEntities(entities as Array<Record<string, any>>);
      })
      .catch((err) => {
        console.error("[EditChildMatrixTab] loadEntitiesViaMapping error:", err);
        if (!cancelled) setColumnEntities([]);
      })
      .finally(() => {
        if (!cancelled) setColumnsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, readFrom, columnEntityTable]);

  // ── Resolve FK label (referencedFieldName from columnEntity FK) ─────────
  useEffect(() => {
    if (!parsed.columnHeader) return;
    const ref = parsed.columnHeader.field;
    const table = ref.referencedTable;
    const labelField = ref.referencedFieldName || "name";
    if (!table || table === "pet_manchester_terrier_toy" || table === "pet_korthals_griffon") {
      // Generator sometimes fills partitions — fall back to entity[labelField] directly.
    }
    // columnEntities already contain `name` etc. since loadEntitiesViaMapping fetches full pet rows.
    const next: Record<string, string> = {};
    for (const entity of columnEntities) {
      const id = entity.id as string | undefined;
      if (!id) continue;
      next[id] = String(entity[labelField] ?? entity.name ?? id);
    }
    setColumnLabels(next);
  }, [columnEntities, parsed.columnHeader]);

  // ── Load cell records (child of each column pet) ────────────────────────
  const [cellRecords, setCellRecords] = useState<Array<Record<string, any>>>([]);
  const [cellsLoading, setCellsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!columnEntities.length || !cellTable || !columnEntityTable) {
      setCellRecords([]);
      return;
    }
    setCellsLoading(true);
    Promise.all(
      columnEntities.map((entity) =>
        spaceStore.loadChildRecords(entity.id as string, cellTable),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const all = results.flat();
        // Filter by constants (e.g., measurement_type_id = Weight UUID)
        const filtered = all.filter((record) => {
          const data = (record.additional as Record<string, any>) || record;
          for (const [col, val] of Object.entries(parsed.constants)) {
            if (data[col] !== val) return false;
          }
          return true;
        });
        setCellRecords(filtered);
      })
      .catch((err) => {
        console.error("[EditChildMatrixTab] loadChildRecords error:", err);
        if (!cancelled) setCellRecords([]);
      })
      .finally(() => {
        if (!cancelled) setCellsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [columnEntities, cellTable, columnEntityTable, parsed.constants, refreshTick]);

  // ── Group cells into rows by rowHeader field ────────────────────────────
  const persistedRows = useMemo<MatrixRow[]>(() => {
    if (!parsed.rowHeader || !parsed.columnHeader) return [];
    const headerCol = parsed.rowHeader.column;
    const colCol = parsed.columnHeader.column;
    const byKey = new Map<string, MatrixRow>();

    for (const record of cellRecords) {
      const data = (record.additional as Record<string, any>) || {};
      const headerValue = data[headerCol];
      const columnId = data[colCol];
      if (headerValue == null || !columnId) continue;

      const key = String(headerValue);
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          header: headerValue,
          isDraft: false,
          cellRecords: {},
        });
      }
      byKey.get(key)!.cellRecords[columnId] = record;
    }
    return Array.from(byKey.values());
  }, [cellRecords, parsed.rowHeader, parsed.columnHeader]);

  // ── Draft rows (client-only until user enters first cell) ───────────────
  const [draftRows, setDraftRows] = useState<MatrixRow[]>([]);

  const allRows = useMemo<MatrixRow[]>(
    () => [...persistedRows, ...draftRows],
    [persistedRows, draftRows],
  );

  // Drop drafts whose header collides with a now-persisted row
  useEffect(() => {
    if (draftRows.length === 0) return;
    const persistedKeys = new Set(persistedRows.map((r) => r.key));
    const remaining = draftRows.filter((r) => !persistedKeys.has(r.key));
    if (remaining.length !== draftRows.length) setDraftRows(remaining);
  }, [persistedRows, draftRows]);

  const handleAddRow = useCallback(() => {
    if (!parsed.rowHeader) return;
    const autoFill =
      parsed.rowHeader.field.autoFillOnAdd === "clientNow"
        ? new Date().toISOString()
        : null;
    const key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setDraftRows((prev) => [
      ...prev,
      { key, header: autoFill, isDraft: true, cellRecords: {} },
    ]);
  }, [parsed.rowHeader]);

  // PageMenu's "+ Add" button signals through addDialogOpen — add a draft row
  // and immediately close the signal (no dialog flow for matrix).
  useEffect(() => {
    if (!addDialogOpen) return;
    handleAddRow();
    onAddDialogClose?.();
  }, [addDialogOpen, handleAddRow, onAddDialogClose]);

  const handleHeaderChange = useCallback(
    async (row: MatrixRow, rawValue: string) => {
      if (!parsed.rowHeader) return;
      const parsedValue = parseHeaderInput(rawValue, parsed.rowHeader.field.fieldType);

      if (row.isDraft) {
        setDraftRows((prev) =>
          prev.map((r) =>
            r.key === row.key ? { ...r, header: parsedValue, key: String(parsedValue ?? r.key) } : r,
          ),
        );
        return;
      }

      // Persisted row: cascade new header value to all existing cell records
      if (!columnEntityTable) return;
      const updates = Object.values(row.cellRecords);
      if (updates.length === 0) return;
      await withCrudToast(
        async () => {
          await Promise.all(
            updates.map((rec) =>
              spaceStore.updateChildRecord(columnEntityTable, cellTable, rec.id, {
                [parsed.rowHeader!.column]: parsedValue,
              }),
            ),
          );
          return { data: null };
        },
        { label: `${label ?? "Row"} ${parsed.rowHeader.field.displayName ?? "header"}`, verb: "update" },
      );
      setRefreshTick((t) => t + 1);
    },
    [parsed.rowHeader, cellTable, columnEntityTable, label],
  );

  const handleCellChange = useCallback(
    async (row: MatrixRow, columnEntity: Record<string, any>, rawValue: string) => {
      if (!parsed.cell || !parsed.rowHeader || !parsed.columnHeader || !columnEntityTable) return;

      const columnId = columnEntity.id as string;
      const existing = row.cellRecords[columnId];
      const cleaned = rawValue.trim();
      const numeric = cleaned === "" ? null : Number(cleaned);
      if (numeric !== null && Number.isNaN(numeric)) return;

      // Clearing a cell → soft-delete existing, or no-op on draft
      if (numeric === null) {
        if (!existing) return;
        await withCrudToast(
          async () => {
            await spaceStore.deleteChildRecord(columnEntityTable, cellTable, existing.id);
            return { data: null };
          },
          { label: label ?? "Cell", verb: "delete" },
        );
        setRefreshTick((t) => t + 1);
        return;
      }

      if (existing) {
        await withCrudToast(
          async () => {
            await spaceStore.updateChildRecord(columnEntityTable, cellTable, existing.id, {
              [parsed.cell!.column]: numeric,
            });
            return { data: null };
          },
          { label: label ?? "Cell", verb: "update" },
        );
        setRefreshTick((t) => t + 1);
        return;
      }

      // Insert: header must be set (autoFill or user input)
      let headerValue = row.header;
      if (headerValue == null && parsed.rowHeader.field.autoFillOnAdd === "clientNow") {
        headerValue = new Date().toISOString();
      }
      if (headerValue == null) return;

      const payload: Record<string, unknown> = {
        ...parsed.defaults,
        ...parsed.constants,
        [parsed.rowHeader.column]: headerValue,
        [parsed.columnHeader.column]: columnId,
        [parsed.cell.column]: numeric,
      };

      await withCrudToast(
        async () => {
          const result = await spaceStore.createChildRecord(
            columnEntityTable,
            cellTable,
            columnId,
            payload,
          );
          return { data: result };
        },
        { label: label ?? "Cell", verb: "create" },
      );

      // Promote draft to persisted — it will reappear from cellRecords after refresh
      if (row.isDraft) {
        setDraftRows((prev) => prev.filter((r) => r.key !== row.key));
      }
      setRefreshTick((t) => t + 1);
    },
    [parsed, cellTable, columnEntityTable, label],
  );

  const handleRemoveRow = useCallback(
    async (row: MatrixRow) => {
      if (row.isDraft) {
        setDraftRows((prev) => prev.filter((r) => r.key !== row.key));
        return;
      }
      if (!columnEntityTable) return;
      const recs = Object.values(row.cellRecords);
      if (recs.length === 0) return;
      await withCrudToast(
        async () => {
          await Promise.all(
            recs.map((rec) =>
              spaceStore.deleteChildRecord(columnEntityTable, cellTable, rec.id),
            ),
          );
          return { data: null };
        },
        { label: label ?? "Row", verb: "delete" },
      );
      setRefreshTick((t) => t + 1);
    },
    [cellTable, columnEntityTable, label],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  if (!parentId) {
    return (
      <div className="py-8 text-center text-secondary">
        Parent entity not selected
      </div>
    );
  }

  if (!parsed.cell || !parsed.columnHeader) {
    return (
      <div className="py-8 text-center text-secondary">
        Matrix misconfigured: cell and columnHeader fields are required
      </div>
    );
  }

  const hasRowHeader = !!parsed.rowHeader;
  const showEmpty =
    !columnsLoading && !cellsLoading && allRows.length === 0 && columnEntities.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow className="min-h-[48.5px] h-[48.5px] hover:bg-transparent">
              {hasRowHeader && (
                <TableHead className="font-bold text-secondary first:pl-4 last:pr-4">
                  {parsed.rowHeader!.field.displayName ?? "Date"}
                </TableHead>
              )}
              {columnEntities.map((entity) => {
                const id = entity.id as string;
                return (
                  <TableHead key={id} className="font-bold text-secondary first:pl-4 last:pr-4 text-center">
                    {columnLabels[id] ?? String(entity.name ?? id)}
                  </TableHead>
                );
              })}
              {canDeleteRow && <TableHead className="first:pl-4 last:pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
          {showEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={Math.max(columnEntities.length + (hasRowHeader ? 1 : 0) + (canDeleteRow ? 1 : 0), 1)}
                className="h-24 text-center text-secondary first:pl-4 last:pr-4"
              >
                No {label ?? "records"} yet
              </TableCell>
            </TableRow>
          ) : columnsLoading || cellsLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={Math.max(columnEntities.length + (hasRowHeader ? 1 : 0) + (canDeleteRow ? 1 : 0), 1)}
                className="h-24 text-center text-secondary first:pl-4 last:pr-4"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : (
            allRows.map((row) => (
              <TableRow key={row.key} className="min-h-[56px] h-[56px] hover:bg-slate-50">
                {hasRowHeader && (
                  <TableCell className="first:pl-4 last:pr-4">
                    {parsed.rowHeader!.field.fieldType === "datetime" ? (
                      <DateTimeInput
                        value={(row.header as string | null) ?? null}
                        onValueChange={(iso) => handleHeaderChange(row, iso ?? "")}
                      />
                    ) : (
                      <Input
                        type={inputTypeForFieldType(parsed.rowHeader!.field.fieldType)}
                        size="default"
                        value={(row.header as string | number | null) ?? ""}
                        onChange={(event) =>
                          row.isDraft
                            ? handleHeaderChange(row, event.target.value)
                            : undefined
                        }
                        onBlur={
                          !row.isDraft
                            ? (event) => handleHeaderChange(row, event.target.value)
                            : undefined
                        }
                      />
                    )}
                  </TableCell>
                )}
                {columnEntities.map((entity) => {
                  const id = entity.id as string;
                  const cellRec = row.cellRecords[id];
                  const value = cellRec
                    ? (cellRec.additional as Record<string, any>)?.[parsed.cell!.column]
                    : null;
                  return (
                    <TableCell key={id} className="first:pl-4 last:pr-4 text-center">
                      <Input
                        type="number"
                        size="default"
                        className="text-center"
                        defaultValue={(value as string | number | null | undefined) ?? ""}
                        key={`${row.key}-${id}-${cellRec?.id ?? "new"}`}
                        onBlur={(event) =>
                          handleCellChange(row, entity, event.target.value)
                        }
                      />
                    </TableCell>
                  );
                })}
                {canDeleteRow && (
                  <TableCell className="first:pl-4 last:pr-4 text-center">
                    <Button
                      type="button"
                      variant="ghost-secondary"
                      className="size-[2.25rem] rounded-full p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRow(row);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default EditChildMatrixTab;
