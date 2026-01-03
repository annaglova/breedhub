import { cn } from "@ui/lib/utils";
import { Link } from "react-router-dom";
import { PetLinkRow } from "@/components/shared/PetLinkRow";

/**
 * Child pet in a litter
 */
export interface LitterChildPet {
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
 * Litter data
 */
export interface LitterData {
  date: string;
  anotherParent?: {
    name?: string;
    url?: string;
  };
  pets: LitterChildPet[];
}

export interface LitterCardProps {
  /** Litter data */
  litter: LitterData;
  /** Label for the other parent (Father/Mother) */
  anotherParentRole: string;
  /** Is fullscreen mode */
  isFullscreen?: boolean;
  /** Additional class name */
  className?: string;
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

/**
 * LitterCard - Reusable litter card component
 *
 * Displays a litter with:
 * - Header: DOB date + link to other parent (Father/Mother)
 * - Rows: children with sex mark, name, for sale indicator
 *
 * Used in:
 * - PetChildrenTab (all children)
 * - PetServicesTab (children for sale)
 */
export function LitterCard({
  litter,
  anotherParentRole,
  isFullscreen = false,
  className,
}: LitterCardProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[110px_auto] lg:grid-cols-[115px_auto] xl:grid-cols-[130px_auto]"
    : "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]";

  return (
    <div className={cn("card card-rounded flex flex-auto flex-col p-6 lg:px-8", className)}>
      {/* Litter header */}
      <div
        className={cn(
          "grid gap-3 border-b border-border px-6 py-3 font-semibold md:px-8",
          gridCols
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
        <PetLinkRow
          key={child.id}
          id={child.id}
          name={child.name}
          url={child.url}
          sex={child.sex}
          availableForSale={child.availableForSale}
          gridCols={gridCols}
        />
      ))}
    </div>
  );
}
