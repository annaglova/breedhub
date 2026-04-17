import { cn } from "@ui/lib/utils";
import { resolvePatronPlaceIcon } from "./patron-place-icons";

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
 * Uses the local patron-place icon registry
 * Similar to Angular patron-place.component.ts
 */
export function PatronPlace({
  iconName,
  iconSize = 18,
  mode = "default",
  className
}: PatronPlaceProps) {
  const IconComponent = resolvePatronPlaceIcon(iconName);

  if (!IconComponent) {
    console.warn(`[PatronPlace] Icon not found: ${iconName}`);
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
