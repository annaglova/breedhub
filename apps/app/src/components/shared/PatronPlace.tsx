import { cn } from "@ui/lib/utils";
import * as CustomIcons from "@shared/icons";

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
 * PatronPlace component
 * Displays placement badge icon with appropriate styling
 *
 * Uses custom SVG icons from @shared/icons (patron-places)
 * Similar to Angular patron-place.component.ts
 */
export function PatronPlace({
  iconName,
  iconSize = 18,
  mode = "default",
  className
}: PatronPlaceProps) {
  // Convert iconName to export name (e.g., "place-1" -> "PatronPlacesPlace1Icon")
  const placeNumber = iconName.replace("place-", "");
  const exportName = `PatronPlacesPlace${placeNumber}Icon`;
  const IconComponent = (CustomIcons as any)[exportName];

  if (!IconComponent) {
    console.warn(`[PatronPlace] Icon not found: ${exportName}`);
    return null;
  }

  if (mode === "default") {
    return (
      <div className={cn("bg-accent-600 rounded-full p-1", className)}>
        <IconComponent
          width={iconSize}
          height={iconSize}
          style={{ fill: "white" }}
        />
      </div>
    );
  }

  // Secondary mode
  return (
    <IconComponent
      width={iconSize}
      height={iconSize}
      className={className}
      style={{ fill: "rgb(var(--secondary-400))" }}
    />
  );
}
