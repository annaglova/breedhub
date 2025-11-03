import { Maximize2 } from "lucide-react";
import { cn } from "@ui/lib/utils";

interface TabHeaderProps {
  label: string;
  icon: React.ReactNode;
  mode?: "list" | "compact";
  comingSoon?: boolean;
  fullscreenUrl?: string;
  isFirst?: boolean;
  className?: string;
}

/**
 * TabHeader - Header для scroll-based tab
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/ui/template/tab-header.component.ts
 *
 * Features:
 * - Two modes: list (large header in content) | compact (small fullscreen button)
 * - Optional "Coming soon" label
 * - Optional fullscreen button
 */
export function TabHeader({
  label,
  icon,
  mode = "list",
  comingSoon = false,
  fullscreenUrl,
  isFirst = false,
  className,
}: TabHeaderProps) {
  if (mode === "list") {
    return (
      <div
        className={cn(
          "mb-5 flex w-full items-center text-2xl font-semibold",
          "text-sub-header-color bg-header-ground/75 backdrop-blur-sm",
          "px-6 py-2",
          isFirst ? "mt-5" : "mt-10",
          className
        )}
      >
        {/* Icon */}
        <div className="mr-2 flex-shrink-0">{icon}</div>

        {/* Label */}
        <span>{label}</span>

        {/* Coming soon label */}
        {comingSoon && (
          <div className="text-center text-sm font-bold uppercase text-primary ml-auto">
            Coming soon
          </div>
        )}

        {/* Fullscreen button */}
        {fullscreenUrl && !comingSoon && (
          <a
            href={fullscreenUrl}
            className="ml-auto hover:bg-hover-surface-header p-2 rounded transition-colors"
            title="Full screen view"
          >
            <Maximize2 size={16} className="text-sub-header-color" />
          </a>
        )}
      </div>
    );
  }

  // Compact mode - small button on the right
  return (
    <div className="relative w-full py-2">
      <div className="ml-auto flex w-[3.1rem] items-center space-x-3 md:w-[10.4rem]">
        <span className="text-secondary-400 hidden md:block">
          Full screen view
        </span>
        {fullscreenUrl && (
          <a
            href={fullscreenUrl}
            className="text-secondary border border-secondary-500 flex size-9 items-center justify-center rounded-full hover:bg-secondary/10 transition-colors"
            title="Full screen view"
          >
            <Maximize2 size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
