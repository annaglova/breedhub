import { Children, isValidElement } from "react";
import { cn } from "@ui/lib/utils";

interface TabActionsHeaderProps {
  /** Content aligned to the left */
  left?: React.ReactNode;
  /** Content aligned to the right */
  right?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Check if a ReactNode has valid content
 */
function hasValidContent(node: React.ReactNode): boolean {
  if (!node) return false;
  let hasValid = false;
  Children.forEach(node, (child) => {
    if (isValidElement(child)) {
      hasValid = true;
    }
  });
  return hasValid;
}

/**
 * TabActionsHeader - Minimalist actions header for fullscreen tab mode
 *
 * Features:
 * - Sticky positioning consistent with TabHeader
 * - Left and right slots for actions
 * - Returns null if no valid content in either slot
 *
 * Usage:
 * <TabActionsHeader
 *   left={<EditLink />}
 *   right={<PedigreeGenerationSelector />}
 * />
 */
export function TabActionsHeader({
  left,
  right,
  className,
  style,
}: TabActionsHeaderProps) {
  const hasLeft = hasValidContent(left);
  const hasRight = hasValidContent(right);

  // Don't render if no valid actions
  if (!hasLeft && !hasRight) return null;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between",
        "text-sub-header-color bg-header-ground/75 backdrop-blur-sm",
        "px-6 h-[3.25rem]",
        className
      )}
      style={style}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
