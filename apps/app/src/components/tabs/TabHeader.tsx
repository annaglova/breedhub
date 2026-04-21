import { Icon } from "@/components/shared/Icon";
import type { IconConfig } from "@breedhub/rxdb-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";

interface TabHeaderProps {
  label: string;
  icon: IconConfig; // Changed from React.ReactNode to IconConfig for universal icon support
  mode?: "list" | "compact";
  badge?: string; // "Coming soon", "New", "Beta", etc.
  fullscreenUrl?: string;
  isFirst?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
  badge,
  fullscreenUrl,
  isFirst = false,
  className,
  style,
}: TabHeaderProps) {
  if (mode === "list") {
    return (
      <div className={cn(className)} style={style}>
        <div
          className={cn(
            "mb-6 flex w-full items-center text-2xl font-display font-semibold tracking-wide",
            "text-sub-header-color bg-header-ground/75 backdrop-blur-sm shadow-[0_1px_2px_rgba(17,17,26,0.1),0_2px_6px_rgba(17,17,26,0.08)]",
            "px-4 sm:px-6 py-3",
            isFirst ? "mt-6" : "mt-12"
          )}
        >
          {/* Icon */}
          <div className="mr-3 flex-shrink-0">
            <Icon icon={icon} size={20} />
          </div>

          {/* Label */}
          <h2 className="text-2xl font-display font-semibold tracking-wide">{label}</h2>

          {/* Badge label (Coming soon, New, Beta, etc.) */}
          {badge && (
            <div className="text-center text-sm font-sans font-bold uppercase tracking-wide text-primary ml-auto">
              {badge}
            </div>
          )}

          {/* Fullscreen button */}
          {fullscreenUrl && !badge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={fullscreenUrl}
                  className="ml-auto text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none"
                >
                  <Icon icon={{ name: "Expand", source: "lucide" }} size={18} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Full screen view</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  // Compact mode - small button on the right (only render if fullscreen URL exists)
  if (!fullscreenUrl) return null;

  return (
    <div className="relative w-full py-2">
      <div className="ml-auto flex w-[3.1rem] items-center space-x-3 md:w-[10.4rem]">
        <span className="text-secondary-400 hidden md:block">
          Full screen view
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={fullscreenUrl}
              className="text-secondary border border-secondary-500 flex size-9 items-center justify-center rounded-full hover:text-foreground/70 transition-colors"
            >
              <Icon icon={{ name: "Expand", source: "lucide" }} size={16} />
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom">Full screen view</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
