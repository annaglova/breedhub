import { Icon } from "@/components/shared/Icon";
import { mediaQueries } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenu } from "@/hooks/usePageMenu";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Heart, MoreVertical, Pencil } from "lucide-react";
import { NavigationButtons } from "./cover/NavigationButtons";

interface NameOutletProps {
  entity?: any;
  component: string;
  className?: string;
  isLoading?: boolean;
  onTop?: boolean;

  // Always show navigation buttons (for tab fullscreen mode without cover)
  alwaysShowNavigation?: boolean;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Entity type for per-space navigation history
  entityType?: string;

  // Legacy handlers (deprecated - use pageConfig.menus instead)
  onSupport?: () => void;
  onMoreOptions?: () => void;

  // Component to render inside the outlet
  children?: React.ReactNode;
}

/**
 * NameOutlet - Universal name outlet with sticky behavior and actions
 *
 * Based on Angular: libs/schema/ui/template/name/name-container-outlet.component.ts
 * Sticky container that shows entity name (via children) and action buttons
 * Adds border when stuck to top (onTop state)
 *
 * Config-driven: use pageConfig.menus for action buttons
 * Wraps entity-specific name components (BreedName, KennelName, etc.)
 */
export function NameOutlet({
  entity,
  component,
  className = "",
  isLoading = false,
  onTop = false,
  alwaysShowNavigation = false,
  pageConfig,
  spacePermissions = { canEdit: true, canDelete: false, canAdd: false },
  entityType,
  onSupport,
  onMoreOptions,
  children,
}: NameOutletProps) {
  useSignals();

  // Check if screen is md+ (768px) and xl+ (1440px)
  const isMdScreen = useMediaQuery(mediaQueries.md);
  const isXlScreen = useMediaQuery(mediaQueries.xl);
  const isFullscreen = spaceStore.isFullscreen.value;

  // Show full Patronate button only on xl+ screens AND in fullscreen mode
  const showFullPatronateButton = isXlScreen && isFullscreen;

  // Get menu items for sticky context (when onTop)
  const allMenuItems = usePageMenu({
    pageConfig: pageConfig || null,
    context: "sticky",
    spacePermissions,
  });

  // On md+ fullscreen, filter out Edit from dropdown (it will be shown as separate button)
  const menuItems = (isMdScreen && isFullscreen)
    ? allMenuItems.filter((item) => item.action !== "edit")
    : allMenuItems;

  // Check if Edit action is available (for showing separate button on md+ fullscreen)
  const editMenuItem = allMenuItems.find((item) => item.action === "edit");
  const showEditButton = isMdScreen && isFullscreen && editMenuItem && spacePermissions.canEdit;

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    ...(onSupport && { support: onSupport }),
  });

  if (isLoading) {
    return (
      <div className={`relative bg-card-ground ${className}`}>
        <div className="flex flex-col space-y-4 pb-5 pt-1">
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
      } ${className}`}
    >
      {/* Name content slot - entity-specific component via children */}
      {children}

      {/* Navigation buttons - top right (default/gray when sticky or alwaysShowNavigation) */}
      {(onTop || alwaysShowNavigation) && (
        <div className="absolute right-0 top-0">
          <NavigationButtons mode="default" entityType={entityType} />
        </div>
      )}

      {/* Action buttons - bottom right */}
      {onTop && (
        <div className="absolute bottom-1 right-0 flex gap-1">
          {/* Edit button - only on md+ screens, with extra spacing from action buttons */}
          {showEditButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.6rem] px-4 text-base font-semibold mr-4"
                  onClick={() => executeAction("edit")}
                  type="button"
                >
                  <Pencil size={16} />
                  <span className="ml-2">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>
          )}

          {/* Support button - full size with text on xl+ fullscreen, icon-only otherwise */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className={
                  showFullPatronateButton
                    ? "rounded-full h-[2.6rem] px-4 flex items-center"
                    : "rounded-full h-[2.6rem] w-[2.6rem] flex items-center justify-center"
                }
                onClick={() => executeAction("support")}
                type="button"
              >
                <Heart size={16} fill="currentColor" />
                {showFullPatronateButton && (
                  <span className="ml-2 text-base font-semibold">Patronate</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support your breed</TooltipContent>
          </Tooltip>

          {/* More options dropdown menu */}
          {menuItems.length > 0 ? (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost-secondary"
                      className="size-[2.6rem] rounded-full p-0"
                      type="button"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">More options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {menuItems.map((item) => (
                  <>
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => executeAction(item.action, item.actionParams)}
                    >
                      <Icon icon={item.icon} size={16} />
                      {item.label}
                    </DropdownMenuItem>
                    {item.hasDivider && (
                      <DropdownMenuSeparator key={`divider-${item.id}`} />
                    )}
                  </>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Fallback More Options button if no menu items */
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost-secondary"
                  className="size-[2.6rem] rounded-full p-0"
                  onClick={() => console.log("[TODO] More options")}
                  type="button"
                >
                  <MoreVertical size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">More options</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
