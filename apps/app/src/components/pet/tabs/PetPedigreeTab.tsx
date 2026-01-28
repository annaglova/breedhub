import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  PedigreeTree,
} from "@/components/shared/pedigree";
import type { PedigreePet } from "@/components/shared/pedigree/types";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, usePedigree } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  // Load pedigree data via hook - always load max 7 generations
  // Display is controlled by `generations` prop passed to PedigreeTree
  const { father, mother, ancestors, isLoading, error } = usePedigree({
    fatherId: (selectedEntity as any)?.father_id || null,
    fatherBreedId: (selectedEntity as any)?.father_breed_id || null,
    motherId: (selectedEntity as any)?.mother_id || null,
    motherBreedId: (selectedEntity as any)?.mother_breed_id || null,
    depth: 7, // Always load max, display fewer based on `generations`
    enabled: !!selectedEntity?.id,
  });

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
      sex: pet.sex_code
        ? { code: pet.sex_code, name: pet.sex_name }
        : undefined,
      countryOfBirth: pet.country_code ? { code: pet.country_code } : undefined,
      father,
      mother,
    };
  }, [selectedEntity, father, mother]);

  // Report ancestors count
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(ancestors.length);
    }
  }, [isLoading, ancestors.length, onLoadedCount]);

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
        {pedigreePet ? (
          <PedigreeTree pet={pedigreePet} generations={generations} />
        ) : (
          <span className="text-secondary p-8 text-center block">
            No pedigree data available
          </span>
        )}
      </div>
    </div>
  );
}
