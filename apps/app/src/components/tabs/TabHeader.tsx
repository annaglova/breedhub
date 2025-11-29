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
            "mb-6 flex w-full items-center text-2xl font-semibold",
            "text-sub-header-color bg-header-ground/75 backdrop-blur-sm",
            "px-6 py-2",
            isFirst ? "mt-6" : "mt-12"
          )}
        >
          {/* Icon */}
          <div className="mr-3 flex-shrink-0">
            <Icon icon={icon} size={20} />
          </div>

          {/* Label */}
          <span>{label}</span>

          {/* Badge label (Coming soon, New, Beta, etc.) */}
          {badge && (
            <div className="text-center text-sm font-bold uppercase text-primary ml-auto">
              {badge}
            </div>
          )}

          {/* Fullscreen button */}
          {fullscreenUrl && !badge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={fullscreenUrl}
                  className="ml-auto hover:bg-hover-surface-header p-2 rounded transition-colors"
                >
                  <Icon
                    icon={{ name: "Expand", source: "lucide" }}
                    size={16}
                    className="text-sub-header-color"
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Full screen view</TooltipContent>
            </Tooltip>
          )}
        </div>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={fullscreenUrl}
                className="text-secondary border border-secondary-500 flex size-9 items-center justify-center rounded-full hover:bg-secondary/10 transition-colors"
              >
                <Icon icon={{ name: "Expand", source: "lucide" }} size={16} />
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">Full screen view</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
