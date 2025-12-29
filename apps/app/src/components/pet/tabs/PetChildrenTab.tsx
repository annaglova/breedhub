import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { PetSexMark } from "@/components/shared/PetSexMark";

/**
 * Child pet in a litter
 */
interface ChildPet {
  id: string;
  name: string;
  url?: string;
  sex?: {
    code?: string;
    name?: string;
  };
  availableForSale?: boolean;
}

/**
 * Litter group (children grouped by date and other parent)
 */
interface LitterGroup {
  date: string;
  anotherParent?: {
    name?: string;
    url?: string;
  };
  pets: ChildPet[];
}

// Mock data for visual development
const MOCK_LITTERS: LitterGroup[] = [
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
            "mt-3 grid gap-3",
            isFullscreen && "lg:grid-cols-2"
          )}
        >
          {litters.map((litter, litterIndex) => (
            <div
              key={`${litter.date}-${litterIndex}`}
              className="card flex flex-auto flex-col p-6 lg:px-8"
            >
              {/* Litter header */}
              <div
                className={cn(
                  "grid gap-3 border-b border-border px-6 py-3 font-semibold md:px-8",
                  isFullscreen
                    ? "grid-cols-[110px_auto] lg:grid-cols-[115px_auto] xl:grid-cols-[130px_auto]"
                    : "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]"
                )}
              >
                {/* DOB */}
                <div className="flex flex-col">
                  <div>{formatDate(litter.date)}</div>
                  <p className="text-secondary hidden text-sm font-light sm:block">
                    DOB
                  </p>
                </div>

                {/* Other parent */}
                <div className="flex flex-col">
                  {litter.anotherParent?.url ? (
                    <Link
                      to={`/${litter.anotherParent.url}`}
                      className="text-primary hover:underline font-medium truncate"
                    >
                      {litter.anotherParent.name}
                    </Link>
                  ) : (
                    <span className="truncate">{litter.anotherParent?.name || "—"}</span>
                  )}
                  <p className="text-secondary text-sm font-light">
                    {anotherParentRole}
                  </p>
                </div>
              </div>

              {/* Children rows */}
              {litter.pets.map((child) => (
                <div
                  key={child.id}
                  className={cn(
                    "grid items-center gap-3 px-6 py-2 lg:px-8",
                    isFullscreen
                      ? "grid-cols-[110px_auto] lg:grid-cols-[115px_auto] xl:grid-cols-[130px_auto]"
                      : "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]"
                  )}
                >
                  {/* Sex */}
                  <div className="flex flex-row items-center space-x-2.5">
                    <PetSexMark sex={child.sex?.code} style="vertical" />
                    <span className="hidden sm:block">{child.sex?.name}</span>
                    {child.availableForSale && (
                      <ShoppingCart
                        className="h-4 w-4 text-secondary-400 ml-1.5"
                        title="For Sale"
                      />
                    )}
                  </div>

                  {/* Pet name */}
                  {child.url ? (
                    <Link
                      to={`/${child.url}`}
                      className="text-primary hover:underline truncate"
                    >
                      {child.name}
                    </Link>
                  ) : (
                    <span className="truncate">{child.name}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-5 flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center font-medium">
            There are no children!
          </span>
        </div>
      )}
    </>
  );
}
