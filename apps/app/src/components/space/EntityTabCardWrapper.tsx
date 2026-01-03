import { ReactNode, useState } from "react";
import { cn } from "@ui/lib/utils";

interface EntityTabCardWrapperProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * EntityTabCardWrapper - Wrapper for tab/grid view entity cards
 *
 * Height: 280px (fixed)
 * Padding: 0.75rem (p-3)
 * Border radius: 0.375rem (rounded-md)
 */
export function EntityTabCardWrapper({
  children,
  selected = false,
  onClick,
  className = "",
}: EntityTabCardWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getBackgroundColor = () => {
    if (selected) {
      return "rgb(var(--primary-50) / 0.5)"; // bg-primary-50/50
    }
    if (isHovered) {
      return "rgb(var(--hover-card-ground))";
    }
    return "transparent";
  };

  return (
    <div
      className={cn(
        "flex flex-col h-[280px] p-3 rounded-md cursor-pointer group",
        className
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        transition: "background-color 150ms",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * TabCardSkeletonGrid - Skeleton placeholder grid for loading state
 */
interface TabCardSkeletonGridProps {
  count?: number;
}

export function TabCardSkeletonGrid({ count = 6 }: TabCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col h-[280px] p-3 rounded-md animate-pulse"
        >
          {/* Image skeleton */}
          <div className="relative h-[206px] rounded-xl bg-slate-200 dark:bg-slate-700" />

          {/* Content skeleton */}
          <div className="w-full p-2 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
