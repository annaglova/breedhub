import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { PetSexMark, SexCode } from "@/components/shared/PetSexMark";
import { cn } from "@ui/lib/utils";

export interface PetLinkRowProps {
  /** Pet ID */
  id: string;
  /** Pet name */
  name: string;
  /** Pet URL/slug for navigation */
  url?: string;
  /** Sex info */
  sex?: {
    code?: string;
    name?: string;
  };
  /** Show "for sale" indicator */
  availableForSale?: boolean;
  /** Grid columns class for responsive layout */
  gridCols?: string;
  /** Additional class name */
  className?: string;
}

/**
 * PetLinkRow - Reusable pet row with sex mark, name link, and optional for sale indicator
 *
 * Used in:
 * - PetChildrenTab (children in litters)
 * - PetServicesTab (children for sale)
 * - PetSiblingsTab (siblings)
 */
export function PetLinkRow({
  id,
  name,
  url,
  sex,
  availableForSale,
  gridCols = "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]",
  className,
}: PetLinkRowProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-3 px-6 py-2 lg:px-8",
        gridCols,
        className
      )}
    >
      {/* Sex */}
      <div className="flex flex-row items-center space-x-2.5">
        <PetSexMark sex={sex?.code as SexCode} style="vertical" />
        <span className="hidden sm:block">{sex?.name}</span>
        {availableForSale && (
          <ShoppingCart className="h-4 w-4 text-secondary-400 ml-1.5" />
        )}
      </div>

      {/* Pet name */}
      {url ? (
        <Link
          to={`/${url}`}
          className="text-primary hover:underline truncate"
        >
          {name}
        </Link>
      ) : (
        <span className="truncate">{name}</span>
      )}
    </div>
  );
}
