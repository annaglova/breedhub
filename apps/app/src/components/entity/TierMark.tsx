import { cn } from "@ui/lib/utils";
import { User, Home } from "lucide-react";

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
  if (!tierMarks) return null;

  // Transform tier marks from object format to array for rendering
  const tiers: Array<{
    color: string;
    contactName: string;
    name: string;
    shortName: string;
    type: "owner" | "breeder";
  }> = [];

  // Process breeder first (will appear first in UI)
  if (tierMarks.breeder?.product_name) {
    const productName = tierMarks.breeder.product_name;
    tiers.push({
      color: "bg-primary", // breeder = primary color
      contactName: tierMarks.breeder.contact_name || "",
      name: productName,
      shortName: productName === "Supreme Patron" ? "Suprm" : "Pro",
      type: "breeder",
    });
  }

  // Then owner
  if (tierMarks.owner?.product_name) {
    const productName = tierMarks.owner.product_name;
    tiers.push({
      color: "bg-accent-600", // owner = accent color
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

  return (
    <div className={cn("flex", className)}>
      {/* Mobile view - just dots */}
      {mode === "list" && (
        <div className="flex space-x-1 pr-4 sm:hidden">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={cn("size-4 rounded-full", tier.color)}
              title={`${tier.name}\n${tier.contactName}`}
            />
          ))}
        </div>
      )}

      {/* Desktop view - full badges */}
      {tiers.map((tier, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center space-x-2 rounded-l-full px-3 py-1 text-xs font-bold uppercase text-white",
            tier.color,
            mode === "list" && "hidden sm:flex"
          )}
          title={`${tier.name}\n${tier.contactName}`}
        >
          <IconComponent type={tier.type} />
          <span>{tier.shortName}</span>
        </div>
      ))}
    </div>
  );
}
