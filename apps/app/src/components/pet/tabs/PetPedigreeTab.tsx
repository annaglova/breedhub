import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useRef, useState, useCallback } from "react";
import {
  PedigreeTree,
  GenerationCount,
  MOCK_PEDIGREE_PET,
} from "@/components/shared/pedigree";
import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";

/** Default generations to show in scroll mode */
const DEFAULT_GENERATIONS: GenerationCount = 4;

/** TabHeader height in list mode (py-2 + content) */
const TAB_HEADER_HEIGHT = 48;

interface PetPedigreeTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  /** Generations passed from parent (fullscreen mode) */
  pedigreeGenerations?: GenerationCount;
  /** Callback to update generations (fullscreen mode) */
  onPedigreeGenerationsChange?: (count: GenerationCount) => void;
  /** Top position of TabHeader (for sticky scrollbar calculation in scroll mode) */
  tabHeaderTop?: number;
  /** Direct sticky top value (for fullscreen mode) */
  stickyScrollbarTop?: number;
}

/**
 * PetPedigreeTab - Pet's pedigree (family tree)
 *
 * Displays the pet's ancestry in a tree format.
 * In scroll mode: fixed generations with hint to use fullscreen for more.
 * In fullscreen mode: generation control is in TabActionsHeader.
 *
 * Based on Angular: pedigree-page.component.ts
 */
export function PetPedigreeTab({
  onLoadedCount,
  mode,
  pedigreeGenerations,
  onPedigreeGenerationsChange,
  tabHeaderTop = 0,
  stickyScrollbarTop,
}: PetPedigreeTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Direct drag-to-scroll implementation
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current.scrollLeft;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStartX.current;
    scrollRef.current.scrollLeft = scrollStartLeft.current - deltaX;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Use passed generations in fullscreen mode, default in scroll mode
  const generations = isFullscreen && pedigreeGenerations !== undefined
    ? pedigreeGenerations
    : DEFAULT_GENERATIONS;

  // TODO: Load real pedigree data from entity
  // For now using mock data
  const pedigreePet = MOCK_PEDIGREE_PET;

  return (
    <div>
      {/* Custom horizontal scrollbar - sticky under TabHeader */}
      <div
        className="sticky z-10 py-2 mb-3"
        style={{ top: `${stickyScrollbarTop ?? (tabHeaderTop + TAB_HEADER_HEIGHT)}px` }}
      >
        <HorizontalScrollbar
          scrollContainerRef={scrollRef}
          className="mx-auto max-w-52 sm:max-w-md"
        />
      </div>

      {/* Pedigree tree with drag-to-scroll */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="overflow-x-auto scrollbar-hide"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: isDragging ? "none" : "auto",
        }}
      >
        {pedigreePet ? (
          <PedigreeTree pet={pedigreePet} generations={generations} />
        ) : (
          <span className="text-secondary p-8 text-center font-medium block">
            No pedigree data available
          </span>
        )}
      </div>
    </div>
  );
}
