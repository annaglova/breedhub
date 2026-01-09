import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import {
  GenerationCount,
  PedigreeGenerationSelector,
  PedigreeTree,
  type PedigreePet,
} from "@/components/shared/pedigree";
import { ToolPageLayout } from "@/layouts/ToolPageLayout";
import { Button } from "@ui/components/button";
import { Save } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/** Default generations to show */
const DEFAULT_GENERATIONS: GenerationCount = 4;

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
  const [generations, setGenerations] = useState<GenerationCount>(DEFAULT_GENERATIONS);

  // Selected pets for mating
  const [father, setFather] = useState<PedigreePet | null>(null);
  const [mother, setMother] = useState<PedigreePet | null>(null);

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

  // Build virtual pet from selected parents
  const virtualPet: PedigreePet | null = (father || mother)
    ? {
        id: "mating-preview",
        name: "Mating Preview",
        father: father || undefined,
        mother: mother || undefined,
      }
    : null;

  const hasParents = father || mother;

  const handleSaveToLitters = () => {
    // TODO: Implement save to litters
    console.log("Save mating to litters", { father, mother });
  };

  return (
    <ToolPageLayout>
      <div className="flex flex-col h-full">
        {/* Header with controls */}
        <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl">Test Mating</h1>
          <PedigreeGenerationSelector
            value={generations}
            onChange={setGenerations}
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

      {/* Pet selection */}
      <div className="flex gap-4 py-4 border-b">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Father
          </label>
          {/* TODO: Replace with PetSelector component */}
          <div className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
            {father ? father.name : "Click to select father"}
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Mother
          </label>
          {/* TODO: Replace with PetSelector component */}
          <div className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
            {mother ? mother.name : "Click to select mother"}
          </div>
        </div>
      </div>

      {/* Pedigree tree */}
      <div className="flex-1 overflow-hidden pt-4">
        {/* Custom horizontal scrollbar */}
        <div className="sticky z-10 py-2 mb-3 top-0">
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
          {virtualPet && hasParents ? (
            <PedigreeTree
              pet={virtualPet}
              generations={generations}
              hideSubject
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>Select father and/or mother to preview pedigree</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </ToolPageLayout>
  );
}
