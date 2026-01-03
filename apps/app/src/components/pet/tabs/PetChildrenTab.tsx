import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { LitterCard, LitterData } from "@/components/shared/LitterCard";

// Mock data for visual development
const MOCK_LITTERS: LitterData[] = [
  {
    date: "2023-06-15",
    anotherParent: {
      name: "Beautiful Bella aus Bayern",
      url: "beautiful-bella-aus-bayern",
    },
    pets: [
      {
        id: "1",
        name: "Champion Junior vom Königsberg",
        url: "champion-junior-vom-konigsberg",
        sex: { code: "male", name: "Male" },
        availableForSale: false,
      },
      {
        id: "2",
        name: "Princess Luna vom Königsberg",
        url: "princess-luna-vom-konigsberg",
        sex: { code: "female", name: "Female" },
        availableForSale: true,
      },
      {
        id: "3",
        name: "Prince Max vom Königsberg",
        url: "prince-max-vom-konigsberg",
        sex: { code: "male", name: "Male" },
        availableForSale: false,
      },
    ],
  },
  {
    date: "2022-03-20",
    anotherParent: {
      name: "Elegant Emma von München",
      url: "elegant-emma-von-munchen",
    },
    pets: [
      {
        id: "4",
        name: "Strong Rex vom Königsberg",
        url: "strong-rex-vom-konigsberg",
        sex: { code: "male", name: "Male" },
        availableForSale: false,
      },
      {
        id: "5",
        name: "Sweet Daisy vom Königsberg",
        url: "sweet-daisy-vom-konigsberg",
        sex: { code: "female", name: "Female" },
        availableForSale: false,
      },
    ],
  },
];

// Mock current pet sex (to determine "Father" or "Mother" label)
const MOCK_PET_SEX_CODE = "male";

interface PetChildrenTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetChildrenTab - Pet's offspring grouped by litter
 *
 * Displays litters (children grouped by DOB and other parent):
 * - Header: DOB date + link to other parent (Father/Mother)
 * - Rows: sex mark, sex name, "for sale" badge, link to child
 *
 * Based on Angular: pet-children.component.ts
 */
export function PetChildrenTab({ onLoadedCount }: PetChildrenTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const litters = MOCK_LITTERS;
  const petSexCode = MOCK_PET_SEX_CODE;

  // Determine label for the other parent based on current pet's sex
  const anotherParentRole = petSexCode === "male" ? "Mother" : "Father";

  return (
    <>
      {litters.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            isFullscreen && "lg:grid-cols-2"
          )}
        >
          {litters.map((litter, litterIndex) => (
            <LitterCard
              key={`${litter.date}-${litterIndex}`}
              litter={litter}
              anotherParentRole={anotherParentRole}
              isFullscreen={isFullscreen}
            />
          ))}
        </div>
      ) : (
        <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center font-medium">
            There are no children!
          </span>
        </div>
      )}
    </>
  );
}
