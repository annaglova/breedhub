import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect } from "react";

/**
 * Mock children data for development
 */
const MOCK_CHILDREN: Pet[] = [
  {
    id: "child-1",
    name: "Rex Junior",
    avatarUrl: "",
    url: "/pet/rex-junior",
    sex: "male",
    countryOfBirth: "UA",
    dateOfBirth: "2024-03-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Available",
  },
  {
    id: "child-2",
    name: "Luna Belle",
    avatarUrl: "",
    url: "/pet/luna-belle",
    sex: "female",
    countryOfBirth: "UA",
    dateOfBirth: "2024-03-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Reserved",
  },
  {
    id: "child-3",
    name: "Max Power",
    avatarUrl: "",
    url: "/pet/max-power",
    sex: "male",
    countryOfBirth: "UA",
    dateOfBirth: "2024-03-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Sold",
  },
  {
    id: "child-4",
    name: "Bella Star",
    avatarUrl: "",
    url: "/pet/bella-star",
    sex: "female",
    countryOfBirth: "UA",
    dateOfBirth: "2024-03-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Available",
  },
];

interface LitterChildrenTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
}

/**
 * LitterChildrenTab - Litter's children (puppies/kittens)
 *
 * Displays the litter's children in a grid format using PetCard.
 * Shows breed and status instead of father/mother (litter mode).
 *
 * Based on Angular: litter-children.component.ts
 */
export function LitterChildrenTab({
  onLoadedCount,
  mode,
}: LitterChildrenTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Get children from entity or use mock data
  // TODO: Load real children data from entity
  const children: Pet[] =
    selectedEntity?.children || selectedEntity?.Children || MOCK_CHILDREN;

  // Report loaded count to parent (in useEffect to avoid setState during render)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(children.length);
    }
  }, [onLoadedCount, children.length]);

  // Check if we have children data
  const hasChildren = children && children.length > 0;

  return (
    <div className="mt-3">
      {hasChildren ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
          }`}
        >
          {children.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="litter" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No children data available
        </span>
      )}
    </div>
  );
}
