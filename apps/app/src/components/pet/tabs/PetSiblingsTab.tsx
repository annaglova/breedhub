import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { PetLinkRow } from "@/components/shared/PetLinkRow";

/**
 * Sibling pet
 */
interface SiblingPet {
  id: string;
  name: string;
  url?: string;
  sex?: {
    code?: string;
    name?: string;
  };
  dateOfBirth?: string;
}

/**
 * Sibling group (siblings grouped by DOB)
 */
interface SiblingGroup {
  date?: string;
  pets: SiblingPet[];
}

// Mock data for visual development
const MOCK_SIBLINGS: SiblingPet[] = [
  {
    id: "1",
    name: "Strong Max vom Königsberg",
    url: "strong-max-vom-konigsberg",
    sex: { code: "male", name: "Male" },
    dateOfBirth: "2021-05-15",
  },
  {
    id: "2",
    name: "Beautiful Luna vom Königsberg",
    url: "beautiful-luna-vom-konigsberg",
    sex: { code: "female", name: "Female" },
    dateOfBirth: "2021-05-15",
  },
  {
    id: "3",
    name: "Brave Rex vom Königsberg",
    url: "brave-rex-vom-konigsberg",
    sex: { code: "male", name: "Male" },
    dateOfBirth: "2021-05-15",
  },
  {
    id: "4",
    name: "Sweet Bella vom Königsberg",
    url: "sweet-bella-vom-konigsberg",
    sex: { code: "female", name: "Female" },
    dateOfBirth: "2021-05-15",
  },
];

/**
 * Group siblings by date of birth
 */
function groupSiblingsByDate(siblings: SiblingPet[]): SiblingGroup[] {
  const grouped: SiblingGroup[] = [];

  // Sort by date (newest first)
  const sorted = [...siblings].sort((a, b) => {
    if (!a.dateOfBirth || !b.dateOfBirth) return 0;
    return new Date(b.dateOfBirth).getTime() - new Date(a.dateOfBirth).getTime();
  });

  sorted.forEach((pet) => {
    const existingGroup = grouped.find(
      (g) => g.date === pet.dateOfBirth
    );

    if (existingGroup) {
      existingGroup.pets.push(pet);
    } else {
      grouped.push({
        date: pet.dateOfBirth,
        pets: [pet],
      });
    }
  });

  // Sort pets within each group (males first)
  grouped.forEach((group) => {
    group.pets.sort((a, b) => (b.sex?.code === "male" ? 1 : -1));
  });

  return grouped;
}

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

interface PetSiblingsTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetSiblingsTab - Pet's siblings (brothers/sisters)
 *
 * Displays siblings grouped by DOB:
 * - Header: DOB date
 * - Rows: sex mark, sex name, link to sibling
 *
 * Based on Angular: pet-siblings.component.ts
 */
export function PetSiblingsTab({ onLoadedCount }: PetSiblingsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const siblingGroups = groupSiblingsByDate(MOCK_SIBLINGS);

  return (
    <>
      {siblingGroups.length > 0 ? (
        <div
          className={cn(
            "grid flex-col-reverse gap-3",
            isFullscreen && "lg:grid-cols-2"
          )}
        >
          {siblingGroups.map((group, groupIndex) => (
            <div
              key={group.date || groupIndex}
              className="card flex flex-auto flex-col p-6 md:px-10"
            >
              {/* Group header - DOB date */}
              <div className="grid gap-3 border-b border-border px-6 py-3 font-semibold lg:px-8">
                <div>{formatDate(group.date)}</div>
              </div>

              {/* Sibling rows */}
              {group.pets.map((sibling) => (
                <PetLinkRow
                  key={sibling.id}
                  id={sibling.id}
                  name={sibling.name}
                  url={sibling.url}
                  sex={sibling.sex}
                  gridCols={
                    isFullscreen
                      ? "grid-cols-[82px_auto] lg:grid-cols-[64px_auto]"
                      : "grid-cols-[28px_auto] sm:grid-cols-[72px_auto] md:grid-cols-[82px_auto]"
                  }
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center font-medium">
            There are no siblings!
          </span>
        </div>
      )}
    </>
  );
}
