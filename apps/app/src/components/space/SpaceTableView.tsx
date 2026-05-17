import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import {
  enrichRecords,
  formatCellValue,
  getForeignKeyFields,
  type GenericTableFieldConfig,
} from "@/components/shared/generic-table.helpers";
import { extractFieldName, getChildField } from "@breedhub/rxdb-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@ui/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterField } from "./filters/FiltersSection";
import { SpaceEmptyState } from "./SpaceEmptyState";

interface SpaceTableViewProps<T> {
  fields: Record<string, GenericTableFieldConfig>;
  entities: T[];
  selectedId?: string;
  onEntityClick?: (entity: T) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  itemHeight: number;
  overscan: number;
  skeletonCount?: number;
  searchQuery?: string;
  activeFilters?: FilterField[];
  onFilterRemove?: (filter: FilterField) => void;
  onClearAllFilters?: () => void;
  entityLabelPlural?: string;
}

interface ColumnSpec {
  id: string;
  fieldName: string;
  displayName: string;
  fieldType?: string;
  widthHint?: string;
}

const DEFAULT_SKELETON_COUNT = 8;

function buildColumnSpecs(
  fields: Record<string, GenericTableFieldConfig>,
): ColumnSpec[] {
  return Object.entries(fields)
    .sort(
      (a, b) =>
        (a[1].order ?? a[1].sortOrder ?? 0) -
        (b[1].order ?? b[1].sortOrder ?? 0),
    )
    .map(([key, config]) => ({
      id: key,
      fieldName: extractFieldName(key),
      displayName: config.displayName,
      fieldType: config.fieldType,
    }));
}

function getCellValue(row: any, fieldName: string): unknown {
  return getChildField(row, fieldName) ?? row?.[fieldName] ?? "";
}

export function SpaceTableView<T extends { id: string }>(props: SpaceTableViewProps<T>) {
  const { fields, entities } = props;
  const columns = useMemo(() => buildColumnSpecs(fields), [fields]);

  // FK enrichment — only when fields actually have foreign keys. Otherwise
  // `entities` is rendered directly to avoid a one-frame blank when entities
  // arrive after mount (the old `useState(entities)` initializer captured the
  // empty array from cold load and only useEffect could update it).
  const hasFK = useMemo(() => getForeignKeyFields(fields).length > 0, [fields]);
  const [enriched, setEnriched] = useState<T[] | null>(null);
  useEffect(() => {
    if (!hasFK) {
      setEnriched(null);
      return;
    }
    let cancelled = false;
    enrichRecords(entities, fields).then((res) => {
      if (!cancelled) setEnriched(res as T[]);
    });
    return () => {
      cancelled = true;
    };
  }, [entities, fields, hasFK]);

  // Use enriched copies when ready (FK case), raw entities otherwise.
  const displayRecords = hasFK && enriched ? enriched : entities;

  // Bump a counter only when the entities array SHRINKS — the case that
  // leaves useVirtualizer with totalSize > new content (last rows render
  // beyond the container, layout breaks). Growth (pagination, refilter
  // to a larger set) lets the existing virtualizer handle it normally,
  // which keeps selection state stable and avoids re-mount flicker
  // where the new mount paints rows with the stale selectedId before
  // the sync useEffect updates it.
  const remountKeyRef = useRef(0);
  const prevLenRef = useRef(displayRecords.length);
  if (displayRecords.length < prevLenRef.current) {
    remountKeyRef.current += 1;
  }
  prevLenRef.current = displayRecords.length;

  return (
    <SpaceTableViewInner
      key={remountKeyRef.current}
      {...props}
      columns={columns}
      displayRecords={displayRecords}
    />
  );
}

interface SpaceTableViewInnerProps<T> extends SpaceTableViewProps<T> {
  columns: ColumnSpec[];
  displayRecords: T[];
}

function SpaceTableViewInner<T extends { id: string }>({
  entities,
  selectedId,
  onEntityClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  itemHeight,
  overscan,
  skeletonCount,
  searchQuery = "",
  activeFilters,
  onFilterRemove,
  onClearAllFilters,
  entityLabelPlural,
  columns,
  displayRecords,
}: SpaceTableViewInnerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const gridTemplate = useMemo(
    () => `repeat(${Math.max(columns.length, 1)}, minmax(120px, 1fr))`,
    [columns.length],
  );

  const totalRows = displayRecords.length;

  const virtualizer = useVirtualizer({
    count: hasMore ? totalRows + 1 : totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current || isLoadingMore) return;
    const el = parentRef.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 100) onLoadMore?.();
  }, [isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !hasMore || !onLoadMore) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, hasMore, onLoadMore]);


  // Skeleton takes priority over "no columns" — during cold load, fields may
  // arrive a render or two after the table mounts (config loads async). Showing
  // skeleton while columns are still empty avoids a "No columns configured"
  // flash that recovers on the next render.
  if (isLoading && entities.length === 0) {
    const count = skeletonCount || DEFAULT_SKELETON_COUNT;
    const skeletonColumns =
      columns.length > 0
        ? columns
        : ([{ id: "loading", fieldName: "", displayName: "" }] as ColumnSpec[]);
    const skeletonGrid =
      columns.length > 0
        ? gridTemplate
        : "minmax(120px, 1fr)";
    return (
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ paddingBottom: "var(--content-padding)" }}
      >
        <TableHeaderRow columns={skeletonColumns} gridTemplate={skeletonGrid} />
        <div>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="grid border-b border-slate-200"
              style={{ height: itemHeight, gridTemplateColumns: skeletonGrid }}
            >
              {skeletonColumns.map((col) => (
                <div
                  key={`${i}-${col.id}`}
                  className="flex items-center px-4 py-2"
                >
                  <div className="h-4 w-full max-w-[8rem] animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        No columns configured for this table view
      </div>
    );
  }

  // Empty state
  if (!isLoading && entities.length === 0) {
    const hasFilters = !!activeFilters && activeFilters.length > 0;
    const useStructuredEmpty =
      (hasFilters || !!searchQuery) && !!onFilterRemove && !!onClearAllFilters;
    return (
      <div
        ref={parentRef}
        className="flex h-full flex-col overflow-auto"
        style={{ paddingBottom: "var(--content-padding)" }}
      >
        <TableHeaderRow columns={columns} gridTemplate={gridTemplate} />
        <div className="flex flex-1 items-center justify-center">
          {useStructuredEmpty ? (
            <SpaceEmptyState
              filters={activeFilters ?? []}
              onFilterRemove={onFilterRemove!}
              onClearAll={onClearAllFilters!}
              searchQuery={searchQuery}
              entityLabelPlural={entityLabelPlural?.toLowerCase()}
            />
          ) : (
            <div className="text-center text-slate-500">
              <p>No items found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ paddingBottom: "var(--content-padding)" }}
      >
        <TableHeaderRow columns={columns} gridTemplate={gridTemplate} sticky />
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = hasMore && virtualRow.index >= totalRows;

            if (isLoaderRow) {
              return (
                <div
                  key="loader"
                  className="flex items-center justify-center text-slate-500"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  Loading more...
                </div>
              );
            }

            const entity = displayRecords[virtualRow.index];
            if (!entity) return null;
            const isSelected = selectedId === entity.id;

            return (
              <div
                // Key by virtualRow position, not entity.id — matches the
                // list view convention. When the entities array swaps (scope
                // refilter), this lets React reuse the same DOM at each row
                // slot and just update props. Keying by entity.id caused a
                // remount where any row whose id matched the (briefly stale)
                // selectedId would mount fresh with `bg-primary-50` for one
                // frame, producing the visible flicker that wasn't there in
                // the list view.
                key={virtualRow.key}
                className={cn(
                  "grid border-b border-slate-200 transition-colors",
                  onEntityClick && "cursor-pointer",
                  isSelected ? "bg-primary-50" : "hover:bg-slate-50",
                )}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: gridTemplate,
                }}
                onClick={
                  onEntityClick ? () => onEntityClick(entity) : undefined
                }
              >
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center truncate px-4 py-2 text-sm"
                    title={String(getCellValue(entity, col.fieldName) ?? "")}
                  >
                    <span className="truncate">
                      {formatCellValue(
                        getCellValue(entity, col.fieldName),
                        col.fieldType,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <ScrollToTopButton
        scrollContainer={parentRef.current}
        positioning="absolute"
      />
    </div>
  );
}

interface TableHeaderRowProps {
  columns: ColumnSpec[];
  gridTemplate: string;
  sticky?: boolean;
}

function TableHeaderRow({ columns, gridTemplate, sticky }: TableHeaderRowProps) {
  return (
    <div
      className={cn(
        "grid border-b border-slate-200 bg-white text-xs font-bold uppercase tracking-wide text-secondary",
        sticky && "sticky top-0 z-10",
      )}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {columns.map((col) => (
        <div key={col.id} className="flex items-center px-4 py-3">
          {col.displayName}
        </div>
      ))}
    </div>
  );
}
