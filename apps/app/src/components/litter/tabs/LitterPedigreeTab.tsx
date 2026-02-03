import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  PedigreeTree,
  type PedigreePet,
} from "@/components/shared/pedigree";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useLitterPedigree } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

  // Load pedigree from parent pets
  const { father, mother, ancestorCount, isLoading, error } = useLitterPedigree({
    fatherId: selectedEntity?.father_id,
    fatherBreedId: selectedEntity?.father_breed_id,
    motherId: selectedEntity?.mother_id,
    motherBreedId: selectedEntity?.mother_breed_id,
    enabled: !!selectedEntity?.id,
  });

  // Report loaded count to parent
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(ancestorCount);
    }
  }, [isLoading, ancestorCount, onLoadedCount]);

  // Build pedigree pet from litter's father and mother
  const pedigreePet: PedigreePet | null = selectedEntity
    ? {
        id: selectedEntity.id,
        name: selectedEntity.name || "Litter",
        father,
        mother,
      }
    : null;

  // Check if we have parent data
  const hasParents = father || mother;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading pedigree...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load pedigree</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

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
