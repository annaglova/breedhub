import { cn } from "@ui/lib/utils";
import { User, Home, Crown } from "lucide-react";

interface TierMarkData {
  Contact?: { Id?: string; Name?: string };
  Product?: { Name?: string };
  Type?: "breeder" | "contact" | "owner";
}

interface TierMarkProps {
  tierMarks?: TierMarkData[];
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
 * - contact/owner (accent color)
 */
export function TierMark({
  tierMarks,
  mode = "list",
  className,
}: TierMarkProps) {
  if (!tierMarks || tierMarks.length === 0) return null;

  // Transform tier marks
  const tiers = tierMarks.map((tierMark) => {
    const isBreeder = tierMark.Type === "breeder";
    const productName = tierMark.Product?.Name || "Professional";
    const shortName =
      productName === "Supreme Patron" ? "Suprm" : "Pro";

    return {
      color: isBreeder
        ? "bg-primary-500"
        : "bg-accent-600",
      contactName: tierMark.Contact?.Name || "",
      iconType: tierMark.Type,
      name: productName,
      shortName,
      type: tierMark.Type,
    };
  });

  const IconComponent = ({ type }: { type?: string }) => {
    switch (type) {
      case "breeder":
        return <Home className="w-3.5 h-3.5 text-white" />;
      case "owner":
        return <User className="w-3.5 h-3.5 text-white" />;
      case "contact":
        return <Crown className="w-3.5 h-3.5 text-white" />;
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
