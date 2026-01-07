import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect } from "react";

/**
 * Mock kennel pets data for development
 */
const MOCK_KENNEL_PETS: Pet[] = [
  {
    id: "kennel-pet-1",
    name: "Champion Rex von Wunderbar",
    avatarUrl: "",
    url: "/pet/champion-rex-von-wunderbar",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2020-03-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Active producer",
    father: {
      id: "father-1",
      name: "Grand Champion Kaiser",
      url: "/pet/grand-champion-kaiser",
    },
    mother: {
      id: "mother-1",
      name: "Schöne Bella",
      url: "/pet/schone-bella",
    },
  },
  {
    id: "kennel-pet-2",
    name: "Bella vom Wunderbar",
    avatarUrl: "",
    url: "/pet/bella-vom-wunderbar",
    sex: "female",
    countryOfBirth: "DE",
    dateOfBirth: "2021-06-20",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Active producer",
    father: {
      id: "father-2",
      name: "Sieger Max",
      url: "/pet/sieger-max",
    },
    mother: {
      id: "mother-2",
      name: "Luna aus München",
      url: "/pet/luna-aus-munchen",
    },
  },
  {
    id: "kennel-pet-3",
    name: "Bruno vom Wunderbar",
    avatarUrl: "",
    url: "/pet/bruno-vom-wunderbar",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2022-01-10",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Show dog",
    father: {
      id: "father-1",
      name: "Grand Champion Kaiser",
      url: "/pet/grand-champion-kaiser",
    },
    mother: {
      id: "mother-3",
      name: "Heidi vom Schwarzwald",
      url: "/pet/heidi-vom-schwarzwald",
    },
  },
  {
    id: "kennel-pet-4",
    name: "Greta vom Wunderbar",
    avatarUrl: "",
    url: "/pet/greta-vom-wunderbar",
    sex: "female",
    countryOfBirth: "DE",
    dateOfBirth: "2023-04-05",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Young promising",
    father: {
      id: "father-1",
      name: "Grand Champion Kaiser",
      url: "/pet/grand-champion-kaiser",
    },
    mother: {
      id: "mother-1",
      name: "Schöne Bella",
      url: "/pet/schone-bella",
    },
  },
];

interface KennelPetsTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
}

/**
 * KennelPetsTab - Kennel's own pets
 *
 * Displays the kennel's pets in a grid format using PetCard.
 * Shows all pets registered under this kennel.
 *
 * Based on Angular: kennel-pets.component.ts
 */
export function KennelPetsTab({
  onLoadedCount,
  mode,
}: KennelPetsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Check if entity has actual data
  const hasEntityData = selectedEntity && selectedEntity.name;

  // Get kennel pets from entity or use mock data
  const kennelPets: Pet[] = hasEntityData
    ? selectedEntity?.kennel_pets || selectedEntity?.KennelPets || []
    : MOCK_KENNEL_PETS;

  // Report loaded count to parent (in useEffect to avoid setState during render)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(kennelPets.length);
    }
  }, [onLoadedCount, kennelPets.length]);

  // Check if we have pets
  const hasPets = kennelPets && kennelPets.length > 0;

  return (
    <div className="mt-3">
      {hasPets ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
          }`}
        >
          {kennelPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="default" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No pets in kennel
        </span>
      )}
    </div>
  );
}
