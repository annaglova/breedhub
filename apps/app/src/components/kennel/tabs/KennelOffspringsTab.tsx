import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";

/**
 * Mock offspring pets data for development
 */
const MOCK_OFFSPRING_PETS: Pet[] = [
  {
    id: "offspring-1",
    name: "Ajax von Bergmann",
    avatarUrl: "",
    url: "/pet/ajax-von-bergmann",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2024-02-10",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Show dog",
    father: {
      id: "father-1",
      name: "Champion Rex von Wunderbar",
      url: "/pet/champion-rex-von-wunderbar",
    },
    mother: {
      id: "mother-1",
      name: "Bella vom Wunderbar",
      url: "/pet/bella-vom-wunderbar",
    },
  },
  {
    id: "offspring-2",
    name: "Aurora von Stein",
    avatarUrl: "",
    url: "/pet/aurora-von-stein",
    sex: "female",
    countryOfBirth: "AT",
    dateOfBirth: "2024-02-10",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Breeding female",
    father: {
      id: "father-1",
      name: "Champion Rex von Wunderbar",
      url: "/pet/champion-rex-von-wunderbar",
    },
    mother: {
      id: "mother-1",
      name: "Bella vom Wunderbar",
      url: "/pet/bella-vom-wunderbar",
    },
  },
  {
    id: "offspring-3",
    name: "Baron vom Rhein",
    avatarUrl: "",
    url: "/pet/baron-vom-rhein",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2023-08-20",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Champion",
    father: {
      id: "father-2",
      name: "Bruno vom Wunderbar",
      url: "/pet/bruno-vom-wunderbar",
    },
    mother: {
      id: "mother-2",
      name: "Heidi aus Wien",
      url: "/pet/heidi-aus-wien",
    },
  },
  {
    id: "offspring-4",
    name: "Cleo von Hamburg",
    avatarUrl: "",
    url: "/pet/cleo-von-hamburg",
    sex: "female",
    countryOfBirth: "DE",
    dateOfBirth: "2023-05-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Pet",
    father: {
      id: "father-1",
      name: "Champion Rex von Wunderbar",
      url: "/pet/champion-rex-von-wunderbar",
    },
    mother: {
      id: "mother-3",
      name: "Greta vom Wunderbar",
      url: "/pet/greta-vom-wunderbar",
    },
  },
  {
    id: "offspring-5",
    name: "Duke von Berlin",
    avatarUrl: "",
    url: "/pet/duke-von-berlin",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2022-11-01",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Working dog",
    father: {
      id: "father-1",
      name: "Champion Rex von Wunderbar",
      url: "/pet/champion-rex-von-wunderbar",
    },
    mother: {
      id: "mother-1",
      name: "Bella vom Wunderbar",
      url: "/pet/bella-vom-wunderbar",
    },
  },
];

interface KennelOffspringsTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
}

/**
 * KennelOffspringsTab - Kennel's offspring pets
 *
 * Displays pets bred by this kennel in a grid format using PetCard.
 * Shows offspring that were born in this kennel but may live elsewhere.
 *
 * Based on Angular: kennel-offsprings.component.ts
 */
export function KennelOffspringsTab({
  onLoadedCount,
  mode,
}: KennelOffspringsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Check if entity has actual data
  const hasEntityData = selectedEntity && selectedEntity.name;

  // Get offspring pets from entity or use mock data
  const offspringPets: Pet[] = hasEntityData
    ? selectedEntity?.offspring_pets || selectedEntity?.OffspringPets || []
    : MOCK_OFFSPRING_PETS;

  // Report loaded count to parent
  if (onLoadedCount) {
    onLoadedCount(offspringPets.length);
  }

  // Check if we have pets
  const hasPets = offspringPets && offspringPets.length > 0;

  return (
    <div className="mt-3">
      {hasPets ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
          }`}
        >
          {offspringPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="default" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No offspring pets
        </span>
      )}
    </div>
  );
}
