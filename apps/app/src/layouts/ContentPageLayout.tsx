import { cn } from "@ui/lib/utils";
import { ReactNode } from "react";

interface ContentPageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * ContentPageLayout - wrapper for content-focused pages
 *
 * Similar to PublicPageTemplate styling:
 * - Centered content with max-width constraints
 * - Responsive width: max-w-3xl → lg:max-w-4xl → xxl:max-w-5xl
 * - Card surface background with border
 * - Rounded corners from md breakpoint
 * - Full height with scroll container
 *
 * Used for pages like WelcomePage, settings, profile, etc.
 * where content readability is more important than space.
 */
export function ContentPageLayout({ children, className }: ContentPageLayoutProps) {
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
          {/* Centered content with max-width */}
          <div className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
