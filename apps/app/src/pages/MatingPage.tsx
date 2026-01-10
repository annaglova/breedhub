import { PetSelectorModal } from "@/components/pet/PetSelectorModal";
import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  PedigreeGenerationSelector,
  PedigreeTree,
  type PedigreePet,
} from "@/components/shared/pedigree";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { mediaQueries } from "@/config/breakpoints";
import { ToolPageLayout } from "@/layouts/ToolPageLayout";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import { Save, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/** Get default generations based on screen size */
function getDefaultGenerations(): GenerationCount {
  if (window.matchMedia(mediaQueries.xl).matches) return 5;
  if (window.matchMedia(mediaQueries.lg).matches) return 4;
  if (window.matchMedia(mediaQueries.md).matches) return 3;
  return 2;
}

/**
 * MatingPage - Test mating calculator
 *
 * Allows users to select father and mother to preview
 * the pedigree of potential offspring.
 *
 * Similar to LitterPedigreeTab but as standalone page
 * with pet selection controls.
 */
export function MatingPage() {
  const [generations, setGenerations] = useState<GenerationCount>(getDefaultGenerations);

  // Selected pets for mating
  const [father, setFather] = useState<PedigreePet | null>(null);
  const [mother, setMother] = useState<PedigreePet | null>(null);

  // Modal state
  const [fatherModalOpen, setFatherModalOpen] = useState(false);
  const [motherModalOpen, setMotherModalOpen] = useState(false);

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

  // Build virtual pet from selected parents (always show structure)
  const virtualPet: PedigreePet = {
    id: "mating-preview",
    name: "Offspring",
    father: father || undefined,
    mother: mother || undefined,
  };

  const handleSaveToLitters = () => {
    // TODO: Implement save to litters
    console.log("Save mating to litters", { father, mother });
  };

  return (
    <ToolPageLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30">
        {/* Header row */}
        <div className="flex items-center justify-between pb-4 bg-white dark:bg-zinc-900 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl">Test Mating</h1>
            <PedigreeGenerationSelector
              generations={generations}
              onGenerationsChange={setGenerations}
            />
          </div>

          <Button
            variant="accent"
            onClick={handleSaveToLitters}
            className="rounded-full h-[2.25rem] px-4 gap-2"
          >
            <Save className="h-4 w-4 flex-shrink-0" />
            <span className="text-base font-semibold">Save mating to litters</span>
          </Button>
        </div>

        {/* Parent selectors */}
        <div className="flex items-center gap-3 py-2 bg-header-ground/75 backdrop-blur-sm">
          {/* Father selector chip */}
          <div
            onClick={() => setFatherModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors",
              "border border-blue-300 dark:border-blue-400",
              father
                ? "bg-blue-50 dark:bg-blue-900/30"
                : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
            )}
          >
            <PetSexMark sex="male" style="round" className="shrink-0" />
            <span className="text-sm font-medium truncate max-w-32">
              {father?.name || "Select father"}
            </span>
            {father && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFather(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Mother selector chip */}
          <div
            onClick={() => setMotherModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors",
              "border border-pink-300 dark:border-pink-400",
              mother
                ? "bg-pink-50 dark:bg-pink-900/30"
                : "hover:bg-pink-50 dark:hover:bg-pink-900/20"
            )}
          >
            <PetSexMark sex="female" style="round" className="shrink-0" />
            <span className="text-sm font-medium truncate max-w-32">
              {mother?.name || "Select mother"}
            </span>
            {mother && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMother(null);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal scrollbar */}
        <div className="py-4">
          <HorizontalScrollbar
            scrollContainerRef={scrollRef}
            className="mx-auto max-w-52 sm:max-w-md"
          />
        </div>
      </div>

      {/* Pet selector modals */}
      <PetSelectorModal
        open={fatherModalOpen}
        onOpenChange={setFatherModalOpen}
        onSelect={(pet) => {
          setFather({
            id: pet.id,
            name: pet.name || "Unknown",
            avatarUrl: pet.avatar_url,
          });
        }}
        sexFilter="male"
        title="Select Father"
        excludeIds={mother ? [mother.id] : []}
      />

      <PetSelectorModal
        open={motherModalOpen}
        onOpenChange={setMotherModalOpen}
        onSelect={(pet) => {
          setMother({
            id: pet.id,
            name: pet.name || "Unknown",
            avatarUrl: pet.avatar_url,
          });
        }}
        sexFilter="female"
        title="Select Mother"
        excludeIds={father ? [father.id] : []}
      />

      {/* Pedigree tree */}
      <div>
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
          <PedigreeTree
            pet={virtualPet}
            generations={generations}
            hideSubject
            matingMode
            selectedFather={father}
            selectedMother={mother}
            onSelectPet={(sex) => {
              if (sex === "male") {
                setFatherModalOpen(true);
              } else {
                setMotherModalOpen(true);
              }
            }}
          />
        </div>
      </div>
    </ToolPageLayout>
  );
}
