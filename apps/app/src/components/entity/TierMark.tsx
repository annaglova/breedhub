import { cn } from "@ui/lib/utils";
import { User, Home } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";

// New format from DB: { owner: {...}, breeder: {...} }
interface TierMarkEntry {
  contact_name?: string;
  product_name?: string;
}

interface TierMarksData {
  owner?: TierMarkEntry;
  breeder?: TierMarkEntry;
}

interface TierMarkProps {
  tierMarks?: TierMarksData;
  mode?: "list" | "full";
  className?: string;
}

/**
 * TierMark - displays patron tier badges
 *
 * Used in: Pet, Kennel, Contact, Litter list cards
 *
 * Shows colored badges for different patron types:
 * - breeder (primary color)
 * - owner (accent color)
 *
 * Data format from DB:
 * {
 *   "owner": { "contact_name": "John Doe", "product_name": "Professional" },
 *   "breeder": { "contact_name": "Jane Smith", "product_name": "Supreme Patron" }
 * }
 */
export function TierMark({
  tierMarks,
  mode = "list",
  className,
}: TierMarkProps) {
  // Transform tier marks from object format to array for rendering
  const tiers: Array<{
    color: string;
    contactName: string;
    name: string;
    shortName: string;
    type: "owner" | "breeder";
  }> = [];

  // Process breeder first (will appear first in UI)
  if (tierMarks?.breeder?.product_name) {
    const productName = tierMarks.breeder.product_name;
    tiers.push({
      color: "rgb(var(--primary-500))", // breeder = primary color
      contactName: tierMarks.breeder.contact_name || "",
      name: productName,
      shortName: productName === "Supreme Patron" ? "Suprm" : "Pro",
      type: "breeder",
    });
  }

  // Then owner
  if (tierMarks?.owner?.product_name) {
    const productName = tierMarks.owner.product_name;
    tiers.push({
      color: "rgb(var(--accent-600))", // owner = accent color
      contactName: tierMarks.owner.contact_name || "",
      name: productName,
      shortName: productName === "Supreme Patron" ? "Suprm" : "Pro",
      type: "owner",
    });
  }

  if (tiers.length === 0) return null;

  const IconComponent = ({ type }: { type?: string }) => {
    switch (type) {
      case "breeder":
        return <Home className="w-3.5 h-3.5" />;
      case "owner":
        return <User className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  // Host classes - matches Angular @HostBinding
  const hostClasses = cn(
    "absolute right-0 z-10 flex rounded-l-full",
    mode === "list" ? "bg-transparent sm:bg-primary" : "bg-primary",
    className
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className={hostClasses}>
        {/* Mobile view - just dots (only in list mode) */}
        {mode === "list" && (
          <div className="flex space-x-1 pr-4 sm:hidden">
            {tiers.map((tier, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className="size-4 rounded-full"
                    style={{ background: tier.color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{tier.name}</p>
                  <p className="text-muted-foreground">{tier.contactName}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Desktop view - full badges */}
        {tiers.map((tier, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center space-x-2 rounded-l-full px-3 py-1 text-xs font-bold uppercase text-white",
                  mode === "list" && "hidden sm:flex"
                )}
                style={{ background: tier.color }}
              >
                <IconComponent type={tier.type} />
                <span>{tier.shortName}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{tier.name}</p>
              <p className="text-muted-foreground">{tier.contactName}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
