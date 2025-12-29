import { PedigreeCard } from "./PedigreeCard";
import type { PedigreePet, GenerationCount } from "./types";
import { UNKNOWN_PET } from "./mock-data";

interface PedigreeTreeProps {
  /** Root pet of the pedigree */
  pet: PedigreePet;
  /** Number of generations to display (2-7) */
  generations: GenerationCount;
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
 * Matches Angular logic from pedigree-card.component.ts
 */
function calculateLevel(gen: number, limit: number): number {
  if (limit >= 5) {
    const value = gen - limit + 3;
    return value > 0 ? value : 0;
  } else {
    return gen - 1;
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
export function PedigreeTree({ pet, generations }: PedigreeTreeProps) {
  // limit = generations - 1 (як в Angular: this.pedigreeStore.generationsDisplayCount() - 1)
  const limit = generations - 1;

  return (
    <div className="flex flex-row gap-3 w-max">
      {/* Subject (level -1) - vertical sidebar card */}
      <PedigreeCard pet={pet} sex={pet.sex?.code} level={-1} />

      {/* Ancestors tree */}
      <div className="flex w-full flex-auto flex-col gap-3">
        <PedigreeNode pet={pet.father} sex="male" gen={1} limit={limit} />
        <PedigreeNode pet={pet.mother} sex="female" gen={1} limit={limit} />
      </div>
    </div>
  );
}
