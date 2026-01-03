import { ReactNode, useState } from "react";

interface EntityListCardWrapperProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  dividers?: boolean;
}

export function EntityListCardWrapper({
  children,
  selected = false,
  onClick,
  className = "",
  dividers = true,
}: EntityListCardWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Визначаємо колір фону залежно від стану (як в Angular версії)
  const getBackgroundColor = () => {
    if (selected) {
      return "rgb(var(--focus-card-ground))";
    }
    if (isHovered) {
      return "rgb(var(--hover-card-ground))";
    }
    return "transparent";
  };

  return (
    <div
      className={`relative flex items-center h-full cursor-pointer px-4 sm:px-7 ${dividers ? "border-b border-surface-border" : ""} ${className}`}
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
 * ListCardSkeletonList - Skeleton placeholder list for loading state
 *
 * Shows animated placeholders while entities are loading.
 * Renders multiple skeleton items based on count from config.
 */
interface ListCardSkeletonListProps {
  count?: number;
  itemHeight?: number;
  dividers?: boolean;
  hasAvatar?: boolean;
}

export function ListCardSkeletonList({
  count = 8,
  itemHeight = 68,
  dividers = true,
  hasAvatar = false
}: ListCardSkeletonListProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 sm:px-7 animate-pulse ${dividers ? "border-b border-surface-border" : ""}`}
          style={{ height: itemHeight }}
        >
          {/* Avatar skeleton - only if hasAvatar is true */}
          {hasAvatar && (
            <div className="size-11 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          )}

          {/* Text content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
            {/* Subtitle */}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
