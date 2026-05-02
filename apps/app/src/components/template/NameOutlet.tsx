import { Icon } from "@/components/shared/Icon";
import { mediaQueries } from "@/config/breakpoints";
import { useDeleteEntity } from "@/hooks/useDeleteEntity";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenu } from "@/hooks/usePageMenu";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useLocation, useNavigate } from "react-router-dom";
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
import { NavigationButtonsSkeleton } from "./cover/NavigationButtonsSkeleton";
import {
  ActionButtonsSkeleton,
  type ActionSkeletonItem,
} from "./ActionButtonsSkeleton";

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
  spacePermissions = { canEdit: false, canDelete: false, canAdd: false },
  entityType,
  onSupport,
  onMoreOptions,
  children,
}: NameOutletProps) {
  useSignals();
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSignIn = () => {
    const currentUrl = location.pathname + location.search + location.hash;
    navigate(`/sign-in?redirectURL=${encodeURIComponent(currentUrl)}`);
  };

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
  // If edit is in menu config, show it - no additional permission checks needed
  const editMenuItem = allMenuItems.find((item) => item.action === "edit");
  const showEditButton = isMdScreen && isFullscreen && !!editMenuItem;

  // Delete entity with dependency check
  const { requestDelete, DeleteDialog } = useDeleteEntity(entityType, entity);

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    ...(onSupport && { support: onSupport }),
    delete: requestDelete,
  });

  return (
    <div
      className={`relative bg-card-ground px-4 sm:px-0 pt-4 sm:pt-0 ${
        onTop ? "border-b border-surface-border" : ""
      } ${className}`}
    >
      {/* Skeleton placeholder - mirrors BreedName/PetName layout pixel-for-pixel
          (24 + 8 + 30 + 4 + 21 + 12 = 99px). In DOM flow so it owns the block
          height; real children render absolute behind it during cold-load to
          avoid jump when entity arrives. */}
      {isLoading && (
        <div className="pb-3 bg-card-ground" aria-hidden="true">
          {/* Row 1: achievement / breed link (24px tall, mb-2 = 8px gap) */}
          <div className="h-6 mb-2 flex items-center">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          {/* Row 2: name (30px tall to match h1 text-3xl line-height, mb-1 = 4px gap) */}
          <div className="h-[30px] mb-1 flex items-center">
            <div className="h-6 w-72 max-w-full bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          {/* Row 3: statistics (21px tall, size-4 dot + bar) */}
          <div className="h-[21px] flex items-center space-x-2">
            <div className="size-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="h-4 w-64 max-w-full bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Name content slot - entity-specific component via children */}
      {/* Always rendered to trigger data loading; absolute+invisible while loading
          so its (varying) height doesn't drive layout. */}
      <div className={isLoading ? "invisible absolute inset-0" : ""}>
        {children}
      </div>

      {/* Navigation buttons - top right (default/gray when sticky or
          alwaysShowNavigation). Swapped for a same-shape skeleton while
          loading so the sticky header doesn't show real nav arrows next to
          a still-skeletoned name. */}
      {(onTop || alwaysShowNavigation) && (
        <div className="absolute right-4 sm:right-0 top-4 sm:top-0">
          {isLoading ? (
            <NavigationButtonsSkeleton mode="default" />
          ) : (
            <NavigationButtons mode="default" entityType={entityType} />
          )}
        </div>
      )}

      {/* Action buttons - bottom right. While loading we render the same
          row as a config-driven skeleton — Edit (when applicable),
          Patronate (icon-only outside xl+fullscreen), and the always-on `⋮`
          dropdown circle. Same flex slot + gap as the real buttons, so the
          swap doesn't shift anything. */}
      {onTop && isLoading && (
        <div className="absolute bottom-2 right-4 sm:right-0 flex gap-1">
          <ActionButtonsSkeleton
            items={[
              ...(showEditButton
                ? ([
                    { id: "edit", label: "Edit", extraClassName: "mr-4" },
                  ] as ActionSkeletonItem[])
                : []),
              {
                id: "support",
                label: "Patronate",
                iconOnly: !showFullPatronateButton,
              },
            ]}
            hasDropdown={true}
          />
        </div>
      )}

      {onTop && !isLoading && (
        <div className="absolute bottom-2 right-4 sm:right-0 flex gap-1">
          {/* Edit button - only on md+ screens, with extra spacing from action buttons */}
          {showEditButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.25rem] px-4 text-base font-semibold mr-4"
                  onClick={() => editMenuItem?.authRequired ? navigateToSignIn() : executeAction("edit")}
                  type="button"
                >
                  <Pencil size={16} />
                  <span className="ml-2">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {editMenuItem?.authRequired ? 'Log in to edit' : 'Edit'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Support button - full size with text on xl+ fullscreen, icon-only otherwise */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className={
                  showFullPatronateButton
                    ? "rounded-full h-[2.25rem] px-4 flex items-center"
                    : "rounded-full h-[2.25rem] w-[2.25rem] flex items-center justify-center"
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
                      className="size-[2.25rem] rounded-full p-0"
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
                      disabled={item.authRequired}
                      onClick={() =>
                        !item.authRequired && executeAction(item.action, item.actionParams)
                      }
                    >
                      <Icon icon={item.icon} size={16} />
                      {item.label}
                    </DropdownMenuItem>
                    {item.hasDivider && (
                      <DropdownMenuSeparator key={`divider-${item.id}`} />
                    )}
                  </>
                ))}
                {menuItems.some(item => item.authRequired) && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Log in to unlock all features
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Fallback More Options button if no menu items */
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost-secondary"
                  className="size-[2.25rem] rounded-full p-0"
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
      {DeleteDialog}
    </div>
  );
}
