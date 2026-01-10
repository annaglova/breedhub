import { PedigreeCard } from "./PedigreeCard";
import type { PedigreePet, GenerationCount, OnSelectPetCallback } from "./types";
import { UNKNOWN_PET } from "./mock-data";

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
function PedigreeNode({ pet, sex, gen, limit, matingMode, onSelectPet, isSelected }: PedigreeNodeProps) {
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
      />

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
        />
        <PedigreeNode
          pet={pet.mother}
          sex="female"
          gen={1}
          limit={limit}
          matingMode={matingMode}
          onSelectPet={onSelectPet}
          isSelected={!!selectedMother}
        />
      </div>
    </div>
  );
}
