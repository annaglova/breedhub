import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  PedigreeTree,
} from "@/components/shared/pedigree";
import type { PedigreePet } from "@/components/shared/pedigree/types";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { spaceStore, usePedigree } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Build a skeleton pedigree tree with UNKNOWN ancestors for loading state.
 * Subject uses real entity data; all ancestors are placeholders.
 */
function buildSkeletonAncestor(depth: number): PedigreePet | undefined {
  if (depth <= 0) return undefined;
  return {
    id: "unknown",
    name: "Unknown",
    father: buildSkeletonAncestor(depth - 1),
    mother: buildSkeletonAncestor(depth - 1),
  };
}

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
  /** Zoom level percentage (fullscreen mode) */
  pedigreeZoom?: number;
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
  pedigreeZoom,
}: PetPedigreeTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Drag-to-scroll with click-through: only starts dragging after 5px movement
  const DRAG_THRESHOLD = 5;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDown = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current || e.button !== 0) return;
    isMouseDown.current = true;
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown.current || !scrollRef.current) return;
      const deltaX = e.clientX - dragStartX.current;

      if (!hasDragged.current && Math.abs(deltaX) >= DRAG_THRESHOLD) {
        hasDragged.current = true;
        setIsDragging(true);
      }

      if (hasDragged.current) {
        e.preventDefault();
        scrollRef.current.scrollLeft = scrollStartLeft.current - deltaX;
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    // Don't reset hasDragged here — click event fires after mouseUp
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseDown.current = false;
    hasDragged.current = false;
    setIsDragging(false);
  }, []);

  // Prevent click on links after a drag gesture (fires after mouseUp)
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  }, []);

  // Use passed generations in fullscreen mode, default in scroll mode
  const generations =
    isFullscreen && pedigreeGenerations !== undefined
      ? pedigreeGenerations
      : DEFAULT_GENERATIONS;

  // Load pedigree from JSONB field - already contains all 7 generations
  // Display is controlled by `generations` prop passed to PedigreeTree
  const { father, mother, ancestorCount, isLoading, error } = usePedigree({
    pedigree: (selectedEntity as any)?.pedigree,
    enabled: !!selectedEntity?.id,
  });

  // Resolve subject pet's FK fields via dictionaryStore (Pattern C)
  const sexCode = useDictionaryValue("sex", (selectedEntity as any)?.sex_id, "code");
  const countryCode = useDictionaryValue("country", (selectedEntity as any)?.country_of_birth_id, "code");

  // Build unified pedigree pet from subject + ancestors
  const pedigreePet = useMemo<PedigreePet | null>(() => {
    if (!selectedEntity) return null;

    // Build subject pet from entity
    const pet = selectedEntity as any;
    return {
      id: pet.id,
      name: pet.name || "",
      slug: pet.slug,
      breedId: pet.breed_id,
      dateOfBirth: pet.date_of_birth,
      titles: pet.titles,
      avatarUrl: pet.avatar_url,
      sex: sexCode ? { code: sexCode } : undefined,
      countryOfBirth: countryCode ? { code: countryCode } : undefined,
      father,
      mother,
    };
  }, [selectedEntity, father, mother, sexCode, countryCode]);

  // Report ancestors count
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(ancestorCount);
    }
  }, [isLoading, ancestorCount, onLoadedCount]);

  // Build skeleton pet for loading state (subject with real data + skeleton ancestors)
  const skeletonPet = useMemo<PedigreePet | null>(() => {
    if (!isLoading || !selectedEntity) return null;
    const pet = selectedEntity as any;
    return {
      id: pet.id,
      name: pet.name || "",
      slug: pet.slug,
      avatarUrl: pet.avatar_url,
      sex: sexCode ? { code: sexCode } : undefined,
      father: buildSkeletonAncestor(generations - 1),
      mother: buildSkeletonAncestor(generations - 1),
    };
  }, [isLoading, selectedEntity, sexCode, generations]);

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
        onClickCapture={handleClickCapture}
        className="overflow-x-auto scrollbar-hide"
        style={{
          cursor: isDragging ? "grabbing" : undefined,
          userSelect: isDragging ? "none" : undefined,
        }}
      >
        <div style={pedigreeZoom && pedigreeZoom !== 100 ? { zoom: pedigreeZoom / 100 } : undefined}>
          {isLoading && skeletonPet ? (
            <div className="animate-pulse">
              <PedigreeTree pet={skeletonPet} generations={generations} />
            </div>
          ) : pedigreePet ? (
            <PedigreeTree pet={pedigreePet} generations={generations} />
          ) : (
            <span className="text-secondary p-8 text-center block">
              No pedigree data available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
