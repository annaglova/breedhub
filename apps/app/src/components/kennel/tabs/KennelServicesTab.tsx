import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect } from "react";

/**
 * Mock pets for sale data for development
 */
const MOCK_PETS_FOR_SALE: Pet[] = [
  {
    id: "sale-1",
    name: "Apollo vom Wunderbar",
    avatarUrl: "",
    url: "/pet/apollo-vom-wunderbar",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2025-08-10",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Available",
    father: {
      id: "father-1",
      name: "Champion Rex von Bayern",
      url: "/pet/champion-rex-von-bayern",
    },
    mother: {
      id: "mother-1",
      name: "Bella aus München",
      url: "/pet/bella-aus-munchen",
    },
  },
  {
    id: "sale-2",
    name: "Athena vom Wunderbar",
    avatarUrl: "",
    url: "/pet/athena-vom-wunderbar",
    sex: "female",
    countryOfBirth: "DE",
    dateOfBirth: "2025-08-10",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Available",
    father: {
      id: "father-1",
      name: "Champion Rex von Bayern",
      url: "/pet/champion-rex-von-bayern",
    },
    mother: {
      id: "mother-1",
      name: "Bella aus München",
      url: "/pet/bella-aus-munchen",
    },
  },
  {
    id: "sale-3",
    name: "Ares vom Wunderbar",
    avatarUrl: "",
    url: "/pet/ares-vom-wunderbar",
    sex: "male",
    countryOfBirth: "DE",
    dateOfBirth: "2025-06-15",
    breed: {
      id: "breed-1",
      name: "German Shepherd",
      url: "/breed/german-shepherd",
    },
    status: "Reserved",
    father: {
      id: "father-2",
      name: "Max von Königsberg",
      url: "/pet/max-von-konigsberg",
    },
    mother: {
      id: "mother-2",
      name: "Luna vom Schwarzwald",
      url: "/pet/luna-vom-schwarzwald",
    },
  },
];

interface KennelServicesTabProps {
  onLoadedCount?: (count: number) => void;
  mode?: "scroll" | "fullscreen";
}

/**
 * KennelServicesTab - Kennel's pets for sale
 *
 * Displays the kennel's available pets in a grid format using PetCard.
 * Shows pets that are currently for sale or available.
 *
 * Based on Angular: kennel-offers.component.ts
 */
export function KennelServicesTab({
  onLoadedCount,
  mode,
}: KennelServicesTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value || mode === "fullscreen";

  // Check if entity has actual data
  const hasEntityData = selectedEntity && selectedEntity.name;

  // Get pets for sale from entity or use mock data
  const petsForSale: Pet[] = hasEntityData
    ? selectedEntity?.pets_for_sale || selectedEntity?.PetsForSale || []
    : MOCK_PETS_FOR_SALE;

  // Report loaded count to parent (in useEffect to avoid setState during render)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(petsForSale.length);
    }
  }, [onLoadedCount, petsForSale.length]);

  // Check if we have pets for sale
  const hasPets = petsForSale && petsForSale.length > 0;

  return (
    <div className="mt-3">
      {hasPets ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isFullscreen ? "lg:grid-cols-3 xxl:grid-cols-4" : ""
          }`}
        >
          {petsForSale.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="default" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No pets available for sale
        </span>
      )}
    </div>
  );
}
