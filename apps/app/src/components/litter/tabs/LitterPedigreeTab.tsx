import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  MOCK_PEDIGREE_PET,
  PedigreeTree,
  type PedigreePet,
} from "@/components/shared/pedigree";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useRef, useState } from "react";

/** Default generations to show in scroll mode */
const DEFAULT_GENERATIONS: GenerationCount = 4;

/** TabHeader height in list mode (py-2 + content) */
const TAB_HEADER_HEIGHT = 48;

interface LitterPedigreeTabProps {
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
 * LitterPedigreeTab - Litter's pedigree (parents' family tree)
 *
 * Displays the litter's parents ancestry in a tree format.
 * Shows father and mother trees without subject card.
 *
 * Based on PetPedigreeTab with hideSubject mode.
 */
export function LitterPedigreeTab({
  onLoadedCount,
  mode,
  pedigreeGenerations,
  onPedigreeGenerationsChange,
  tabHeaderTop = 0,
  stickyScrollbarTop,
}: LitterPedigreeTabProps) {
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      e.preventDefault();
      const deltaX = e.clientX - dragStartX.current;
      scrollRef.current.scrollLeft = scrollStartLeft.current - deltaX;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Use passed generations in fullscreen mode, default in scroll mode
  const generations =
    isFullscreen && pedigreeGenerations !== undefined
      ? pedigreeGenerations
      : DEFAULT_GENERATIONS;

  // Build pedigree pet from litter's father and mother
  // Father and mother from litter become the root ancestors
  // TODO: Load real pedigree data from entity
  // For now using mock data (same as PetPedigreeTab)
  const pedigreePet: PedigreePet | null = selectedEntity
    ? {
        id: selectedEntity.id,
        name: selectedEntity.name || "Litter",
        // Father and mother from litter entity (or mock for now)
        father: selectedEntity.father || selectedEntity.Father || MOCK_PEDIGREE_PET.father,
        mother: selectedEntity.mother || selectedEntity.Mother || MOCK_PEDIGREE_PET.mother,
      }
    : null;

  // Check if we have parent data
  const hasParents = pedigreePet?.father || pedigreePet?.mother;

  return (
    <div>
      {/* Custom horizontal scrollbar - sticky under TabHeader */}
      <div
        className="sticky z-10 py-2 mb-3"
        style={{
          top: `${stickyScrollbarTop ?? tabHeaderTop + TAB_HEADER_HEIGHT}px`,
        }}
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
        {pedigreePet && hasParents ? (
          <PedigreeTree
            pet={pedigreePet}
            generations={generations}
            hideSubject
          />
        ) : (
          <span className="text-secondary p-8 text-center block">
            No pedigree data available
          </span>
        )}
      </div>
    </div>
  );
}
