import * as React from "react";
import { cn } from "../lib/utils";

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("inline-flex -space-x-px", className)}
    {...props}
  />
));
ButtonGroup.displayName = "ButtonGroup";

const ButtonGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isFirst?: boolean;
    isLast?: boolean;
    isActive?: boolean;
  }
>(({ className, isFirst, isLast, isActive, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center px-3 py-2",
      "text-sm  transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // Border and shape
      "border border-input",
      isFirst && "rounded-l-md",
      isLast && "rounded-r-md",
      !isFirst && !isLast && "rounded-none",
      // Colors - no hover effect when active
      isActive
        ? "bg-primary text-primary-foreground z-10"
        : "bg-background hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  />
));
ButtonGroupItem.displayName = "ButtonGroupItem";

export { ButtonGroup, ButtonGroupItem };
