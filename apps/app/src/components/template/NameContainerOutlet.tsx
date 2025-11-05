import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Heart, MoreVertical } from "lucide-react";
import { ReactNode } from "react";
import { NavigationButtons } from "./cover";

interface NameContainerOutletProps {
  children?: ReactNode;
  isLoading?: boolean;
  onTop?: boolean;
  onSupport?: () => void;
  onMoreOptions?: () => void;
}

/**
 * NameContainerOutlet - Sticky name container with actions
 *
 * EXACT COPY from Angular: libs/schema/ui/template/name/name-container-outlet.component.ts
 * Sticky container that shows entity name and action buttons
 * Adds border when stuck to top (onTop state)
 */
export function NameContainerOutlet({
  children,
  isLoading = false,
  onTop = false,
  onSupport,
  onMoreOptions,
}: NameContainerOutletProps) {
  if (isLoading) {
    return (
      <div className="relative bg-card-ground">
        <div className="flex flex-col space-y-5 pb-3 pt-1">
          {/* Additional info skeleton */}
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />

          {/* Name skeleton */}
          <div className="space-y-2">
            <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse my-0.5" />
            <div className="flex items-center space-x-2">
              <div className="size-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-card-ground ${
        onTop ? "border-b border-surface-border" : ""
      }`}
    >
      {/* Name content slot */}
      {children}

      {/* Navigation buttons - top right (default/gray when sticky) */}
      {onTop && (
        <div className="absolute right-0 top-0">
          <NavigationButtons mode="default" />
        </div>
      )}

      {/* Action buttons - bottom right */}
      {onTop && (
        <div className="absolute bottom-1 right-0 flex gap-1">
          {/* Support button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className="rounded-full h-[2.6rem] w-[2.6rem] flex items-center justify-center"
                onClick={onSupport}
                type="button"
              >
                <Heart size={16} fill="currentColor" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support</TooltipContent>
          </Tooltip>

          {/* More options button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost-secondary"
                className="size-[2.6rem] rounded-full p-0"
                onClick={onMoreOptions}
                type="button"
              >
                <MoreVertical size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">More options</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}