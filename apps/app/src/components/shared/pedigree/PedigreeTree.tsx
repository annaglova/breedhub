import { useMemo } from "react";
import { PedigreeCard } from "./PedigreeCard";
import type { PedigreePet, GenerationCount, OnSelectPetCallback } from "./types";
import { UNKNOWN_PET } from "./mock-data";

const DUPLICATE_COLORS = [
  "outline-violet-400",
  "outline-amber-400",
  "outline-emerald-400",
  "outline-rose-400",
  "outline-sky-400",
  "outline-orange-400",
  "outline-teal-400",
  "outline-pink-400",
  "outline-lime-400",
  "outline-indigo-400",
  "outline-cyan-400",
  "outline-fuchsia-400",
  "outline-yellow-400",
  "outline-red-400",
  "outline-blue-400",
  "outline-green-400",
];

/**
 * Build a map of ancestor ID → Tailwind outline color class for ancestors that appear 2+ times
 */
function buildDuplicateColorMap(pet: PedigreePet, generations: number): Map<string, string> {
  const counts = new Map<string, number>();

  function traverse(node: PedigreePet | undefined, depth: number) {
    if (!node || node.id === "unknown" || depth > generations) return;
    counts.set(node.id, (counts.get(node.id) || 0) + 1);
    traverse(node.father, depth + 1);
    traverse(node.mother, depth + 1);
  }

  // Traverse only visible ancestors (father/mother), not the subject itself
  traverse(pet.father, 1);
  traverse(pet.mother, 1);

  const colorMap = new Map<string, string>();
  let colorIndex = 0;
  for (const [id, count] of counts) {
    if (count >= 2) {
      colorMap.set(id, DUPLICATE_COLORS[colorIndex % DUPLICATE_COLORS.length]);
      colorIndex++;
    }
  }
  return colorMap;
}

interface PedigreeTreeProps {
  /** Root pet of the pedigree */
  pet: PedigreePet;
  /** Number of generations to display (2-7) */
  generations: GenerationCount;
  /** Hide subject card (for litter mode - show only parents) */
  hideSubject?: boolean;
  /** Enable mating mode with selection buttons on parent cards */
  matingMode?: boolean;
  /** Callback when selecting a pet in mating mode */
  onSelectPet?: OnSelectPetCallback;
  /** Currently selected father (to determine if "Select" or "Change") */
  selectedFather?: PedigreePet | null;
  /** Currently selected mother (to determine if "Select" or "Change") */
  selectedMother?: PedigreePet | null;
}

interface PedigreeNodeProps {
  pet?: PedigreePet;
  sex?: "male" | "female";
  /** Current generation (1 = parents, 2 = grandparents, etc.) */
  gen: number;
  /** Max generations to show */
  limit: number;
  /** Enable mating mode with selection buttons */
  matingMode?: boolean;
  /** Callback when selecting a pet in mating mode */
  onSelectPet?: OnSelectPetCallback;
  /** Is pet already selected (for "Select" vs "Change" button text) */
  isSelected?: boolean;
  /** Map of ancestor ID → outline color class for duplicate highlighting */
  duplicateColors?: Map<string, string>;
}

/**
 * Calculate visual level based on generation and limit
 *
 * Two different behaviors:
 * - ≤4 generations (limit ≤ 3): Remove cards from END (no pill, no small, etc.)
 *   Formula: gen - 1
 *   2 gens: 0,1 | 3 gens: 0,1,2 | 4 gens: 0,1,2,3
 *
 * - ≥5 generations (limit ≥ 4): Add large cards at FRONT
 *   Formula: max(gen - limit + 2, 0)
 *   5 gens: 0,0,1,2,3 | 6 gens: 0,0,0,1,2,3 | 7 gens: 0,0,0,0,1,2,3
 */
function calculateLevel(gen: number, limit: number): number {
  if (limit <= 3) {
    // ≤4 generations: simple progression 0,1,2,3
    return gen - 1;
  } else {
    // ≥5 generations: last 3 are 1,2,3, earlier ones are 0
    return Math.max(gen - limit + 2, 0);
  }
}

/**
 * PedigreeNode - Recursive node in pedigree tree
 *
 * Structure:
 * <div class="flex flex-row">
 *   <Card />
 *   <div class="flex flex-col">
 *     <PedigreeNode father />
 *     <PedigreeNode mother />
 *   </div>
 * </div>
 */
function PedigreeNode({ pet, sex, gen, limit, matingMode, onSelectPet, isSelected, duplicateColors }: PedigreeNodeProps) {
  const petData = pet || UNKNOWN_PET;
  const level = calculateLevel(gen, limit);
  const needChildren = gen <= limit;

  // Show selection button only on first generation (parents level) in mating mode
  const canSelectPet = matingMode && gen === 1;

  return (
    <div className="flex w-full flex-row space-x-3">
      {/* Card */}
      <PedigreeCard
        pet={petData}
        sex={sex}
        level={level}
        canSelectPet={canSelectPet}
        isSelected={isSelected}
        onSelectPet={onSelectPet}
        duplicateColor={duplicateColors?.get(petData.id)}
      />

      {/* Children (Father/Mother) */}
      {needChildren && (
        <div className="flex flex-auto flex-col gap-3">
          <PedigreeNode
            pet={pet?.father}
            sex="male"
            gen={gen + 1}
            limit={limit}
            duplicateColors={duplicateColors}
          />
          <PedigreeNode
            pet={pet?.mother}
            sex="female"
            gen={gen + 1}
            limit={limit}
            duplicateColors={duplicateColors}
          />
        </div>
      )}
    </div>
  );
}

/**
 * PedigreeTree - Tree-based pedigree display
 *
 * Displays pedigree as horizontal tree:
 * - Subject pet on the left (vertical card)
 * - Each pet card has Father/Mother to the right
 * - Recursive structure builds the full tree
 *
 * Based on Angular: pedigree-page.component.ts
 */
export function PedigreeTree({
  pet,
  generations,
  hideSubject = false,
  matingMode = false,
  onSelectPet,
  selectedFather,
  selectedMother,
}: PedigreeTreeProps) {
  // limit = generations - 1 (як в Angular: this.pedigreeStore.generationsDisplayCount() - 1)
  const limit = generations - 1;
  const duplicateColors = useMemo(() => buildDuplicateColorMap(pet, generations), [pet, generations]);

  return (
    <div className="flex flex-row gap-3 w-max">
      {/* Subject (level -1) - vertical sidebar card (hidden in litter mode) */}
      {!hideSubject && (
        <PedigreeCard pet={pet} sex={pet.sex?.code} level={-1} />
      )}

      {/* Ancestors tree */}
      <div className="flex w-full flex-auto flex-col gap-3">
        <PedigreeNode
          pet={pet.father}
          sex="male"
          gen={1}
          limit={limit}
          matingMode={matingMode}
          onSelectPet={onSelectPet}
          isSelected={!!selectedFather}
          duplicateColors={duplicateColors}
        />
        <PedigreeNode
          pet={pet.mother}
          sex="female"
          gen={1}
          limit={limit}
          matingMode={matingMode}
          onSelectPet={onSelectPet}
          isSelected={!!selectedMother}
          duplicateColors={duplicateColors}
        />
      </div>
    </div>
  );
}
