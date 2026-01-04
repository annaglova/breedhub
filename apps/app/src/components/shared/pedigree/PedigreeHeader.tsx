import { cn } from "@ui/lib/utils";
import { GENERATION_OPTIONS, GenerationCount } from "./types";

interface PedigreeHeaderProps {
  /** Current number of generations displayed */
  generations: GenerationCount;
  /** Callback when generation count changes */
  onGenerationsChange: (count: GenerationCount) => void;
  /** Optional title */
  title?: string;
  /** Optional class name */
  className?: string;
}

/**
 * PedigreeHeader - Header with generation selector
 *
 * Allows user to select how many generations to display (2-7)
 */
export function PedigreeHeader({
  generations,
  onGenerationsChange,
  title = "Pedigree",
  className,
}: PedigreeHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}

      {/* Generation selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="pedigree-generations"
          className="text-sm  text-secondary whitespace-nowrap"
        >
          Generations
        </label>
        <select
          id="pedigree-generations"
          value={generations}
          onChange={(e) =>
            onGenerationsChange(Number(e.target.value) as GenerationCount)
          }
          className={cn(
            "rounded-md border border-border bg-card px-3 py-1.5 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "cursor-pointer"
          )}
        >
          {GENERATION_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count} generations
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
