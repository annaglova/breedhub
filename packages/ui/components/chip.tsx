import * as React from "react";
import { cn } from "@ui/lib/utils";
import { X } from "lucide-react";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  removable?: boolean;
  onRemove?: () => void;
  variant?: "default" | "primary" | "secondary";
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, label, removable = false, onRemove, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100",
      primary: "bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100",
      secondary: "bg-secondary-100 dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <span>{label}</span>
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = "Chip";

export { Chip };
