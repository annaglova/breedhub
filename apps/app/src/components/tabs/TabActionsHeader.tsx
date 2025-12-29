import { Children, isValidElement } from "react";
import { cn } from "@ui/lib/utils";

interface TabActionsHeaderProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Check if children array contains any truthy/valid elements
 */
function hasValidChildren(children: React.ReactNode): boolean {
  let hasValid = false;
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      hasValid = true;
    }
  });
  return hasValid;
}

/**
 * TabActionsHeader - Sticky actions header for fullscreen tab mode
 *
 * Features:
 * - Sticky positioning consistent with TabHeader
 * - Renders custom actions (generation selector, edit button, etc.)
 * - Returns null if no valid children (don't render empty header)
 *
 * Usage:
 * <TabActionsHeader>
 *   <PedigreeGenerationSelector ... />
 * </TabActionsHeader>
 */
export function TabActionsHeader({
  children,
  className,
  style,
}: TabActionsHeaderProps) {
  // Don't render if no valid actions
  if (!hasValidChildren(children)) return null;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-end",
        "text-sub-header-color bg-header-ground/75 backdrop-blur-sm",
        "px-6 py-2",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
