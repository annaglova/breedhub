import { cn } from "@ui/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  removable?: boolean;
  onRemove?: () => void;
  variant?: "default" | "primary" | "secondary";
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      label,
      removable = false,
      onRemove,
      variant = "primary",
      ...props
    },
    ref
  ) => {
    // Explicitly set classes for each variant to ensure Tailwind sees them
    let variantClasses = "";
    if (variant === "primary") {
      variantClasses = "bg-primary text-primary-foreground";
    } else if (variant === "secondary") {
      variantClasses =
        "bg-secondary-100 dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100";
    } else {
      variantClasses =
        "bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100";
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 h-7 text-sm transition-colors",
          variantClasses,
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
            className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-black/10 transition-colors"
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
