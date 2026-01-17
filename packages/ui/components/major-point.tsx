import { cn } from "@ui/lib/utils";

interface MajorPointProps {
  /** Main label text (displayed uppercase) */
  name: string;
  /** Secondary label text (shown below name on lg screens) */
  secondaryName?: string;
  /** The main value to display */
  value: string | number;
  /** Additional CSS class for the value */
  valueClassName?: string;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * MajorPoint - Highlights a key metric or statistic
 *
 * Displays a labeled value in a prominent way, commonly used for:
 * - Progress indicators (e.g., "3 from 10 Completed steps")
 * - Key statistics (e.g., "150 Total pets")
 * - Important metrics (e.g., "$500 Balance")
 *
 * Layout:
 * - Mobile: stacked vertically
 * - Desktop: horizontal with divider between label and value
 */
export function MajorPoint({
  name,
  secondaryName,
  value,
  valueClassName,
  className,
}: MajorPointProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-center", className)}>
      {/* Label section */}
      <div className="lg:border-r lg:border-border lg:pr-3">
        <span className="text-lg font-bold uppercase">{name}</span>
        {secondaryName && (
          <div className="text-secondary-500 text-base hidden lg:block">
            {secondaryName}
          </div>
        )}
      </div>

      {/* Value section */}
      <span className={cn("text-2xl font-semibold lg:pl-3", valueClassName)}>
        {value}
      </span>

      {/* Secondary name shown inline on mobile */}
      {secondaryName && (
        <span className="text-secondary-500 text-base lg:hidden ml-1">
          {secondaryName}
        </span>
      )}
    </div>
  );
}
