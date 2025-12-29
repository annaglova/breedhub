import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import {
  PedigreeTree,
  GenerationCount,
  MOCK_PEDIGREE_PET,
} from "@/components/shared/pedigree";

/** Default generations to show in scroll mode */
const DEFAULT_GENERATIONS: GenerationCount = 4;

interface PetPedigreeTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
  /** Generations passed from parent (fullscreen mode) */
  pedigreeGenerations?: GenerationCount;
  /** Callback to update generations (fullscreen mode) */
  onPedigreeGenerationsChange?: (count: GenerationCount) => void;
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
}: PetPedigreeTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Use passed generations in fullscreen mode, default in scroll mode
  const generations = isFullscreen && pedigreeGenerations !== undefined
    ? pedigreeGenerations
    : DEFAULT_GENERATIONS;

  // TODO: Load real pedigree data from entity
  // For now using mock data
  const pedigreePet = MOCK_PEDIGREE_PET;

  return (
    <div className="mt-3">
      {/* Hint about generations - only in scroll mode */}
      {!isFullscreen && (
        <p className="text-secondary text-sm mb-3">
          Showing {DEFAULT_GENERATIONS} generations. View in fullscreen for more options.
        </p>
      )}

      {/* Pedigree tree */}
      <div className="overflow-x-auto">
        {pedigreePet ? (
          <PedigreeTree pet={pedigreePet} generations={generations} />
        ) : (
          <span className="text-secondary p-8 text-center font-medium block">
            No pedigree data available
          </span>
        )}
      </div>
    </div>
  );
}
