import { Trophy, Medal, Award, Star } from "lucide-react";
import { cn } from "@ui/lib/utils";

/**
 * Props for PatronPlace component
 */
interface PatronPlaceProps {
  iconName: string; // e.g., "place-1", "place-2", etc.
  iconSize?: number;
  mode?: "default" | "secondary";
  className?: string;
}

/**
 * Get appropriate icon component based on place number
 */
function getPlaceIcon(place: number) {
  if (place === 1) return Trophy;
  if (place === 2) return Medal;
  if (place === 3) return Award;
  return Star;
}

/**
 * PatronPlace component
 * Displays placement badge icon with appropriate styling
 *
 * Similar to Angular patron-place.component.ts
 * Uses Lucide icons instead of svg-icon
 */
export function PatronPlace({
  iconName,
  iconSize = 18,
  mode = "default",
  className
}: PatronPlaceProps) {
  // Extract place number from iconName (e.g., "place-1" -> 1)
  const place = parseInt(iconName.replace("place-", ""), 10);
  const Icon = getPlaceIcon(place);

  if (mode === "default") {
    return (
      <div className={cn("bg-accent-600 rounded-full p-1", className)}>
        <Icon
          size={iconSize}
          className="text-white"
          strokeWidth={2}
        />
      </div>
    );
  }

  // Secondary mode
  return (
    <Icon
      size={iconSize}
      className={cn("text-secondary-400", className)}
      strokeWidth={2}
    />
  );
}
