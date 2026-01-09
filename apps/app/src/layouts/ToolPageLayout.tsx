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
    <div className="relative size-full">
      <div
        className={cn(
          "absolute inset-0 flex flex-col content-padding overflow-hidden",
          "card-surface",
          "md:rounded-xl",
          className
        )}
      >
        {/* Scrollable content container */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
