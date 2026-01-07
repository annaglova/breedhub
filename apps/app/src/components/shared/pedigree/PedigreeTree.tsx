import { PedigreeCard } from "./PedigreeCard";
import type { PedigreePet, GenerationCount } from "./types";
import { UNKNOWN_PET } from "./mock-data";

interface PedigreeTreeProps {
  /** Root pet of the pedigree */
  pet: PedigreePet;
  /** Number of generations to display (2-7) */
  generations: GenerationCount;
  /** Hide subject card (for litter mode - show only parents) */
  hideSubject?: boolean;
}

interface PedigreeNodeProps {
  pet?: PedigreePet;
  sex?: "male" | "female";
  /** Current generation (1 = parents, 2 = grandparents, etc.) */
  gen: number;
  /** Max generations to show */
  limit: number;
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
function PedigreeNode({ pet, sex, gen, limit }: PedigreeNodeProps) {
  const petData = pet || UNKNOWN_PET;
  const level = calculateLevel(gen, limit);
  const needChildren = gen <= limit;

  return (
    <div className="flex w-full flex-row space-x-3">
      {/* Card */}
      <PedigreeCard pet={petData} sex={sex} level={level} />

      {/* Children (Father/Mother) */}
      {needChildren && (
        <div className="flex flex-auto flex-col gap-3">
          <PedigreeNode
            pet={pet?.father}
            sex="male"
            gen={gen + 1}
            limit={limit}
          />
          <PedigreeNode
            pet={pet?.mother}
            sex="female"
            gen={gen + 1}
            limit={limit}
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
export function PedigreeTree({ pet, generations, hideSubject = false }: PedigreeTreeProps) {
  // limit = generations - 1 (як в Angular: this.pedigreeStore.generationsDisplayCount() - 1)
  const limit = generations - 1;

  return (
    <div className="flex flex-row gap-3 w-max">
      {/* Subject (level -1) - vertical sidebar card (hidden in litter mode) */}
      {!hideSubject && (
        <PedigreeCard pet={pet} sex={pet.sex?.code} level={-1} />
      )}

      {/* Ancestors tree */}
      <div className="flex w-full flex-auto flex-col gap-3">
        <PedigreeNode pet={pet.father} sex="male" gen={1} limit={limit} />
        <PedigreeNode pet={pet.mother} sex="female" gen={1} limit={limit} />
      </div>
    </div>
  );
}
