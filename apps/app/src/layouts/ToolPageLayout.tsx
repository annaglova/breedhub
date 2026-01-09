import { cn } from "@ui/lib/utils";
import { ReactNode } from "react";

interface ToolPageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * ToolPageLayout - wrapper for tool pages (non-entity workspaces)
 *
 * Styled like fullscreen drawer mode (PublicPageTemplate):
 * - Card surface background with border
 * - Rounded corners from md breakpoint
 * - Full height with scroll container
 * - Content padding matching other pages
 *
 * Used for pages like MatingPage, calculators, etc.
 */
export function ToolPageLayout({ children, className }: ToolPageLayoutProps) {
  return (
    <div
      className={cn(
        "size-full overflow-hidden",
        "card-surface",
        "md:rounded-xl",
        className
      )}
    >
      <div className="size-full overflow-auto content-padding">
        {children}
      </div>
    </div>
  );
}
