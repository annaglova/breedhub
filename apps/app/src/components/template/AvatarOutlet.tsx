import { Icon } from "@/components/shared/Icon";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenu, usePageMenuButtons } from "@/hooks/usePageMenu";
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
import { MoreVertical } from "lucide-react";

// Avatar sizing per mode:
// - До sm: size-40, -mt-[88px] (обидва режими)
// - sm до xl: drawer size-40/-mt-[88px], fullscreen size-44/-mt-[108px]
// - Від xl: size-44, -mt-[108px] (обидва режими)
const AVATAR_DRAWER = {
  size: "size-40 xl:size-44",
  offset: "-mt-[100px] xl:-mt-[108px]",
};
const AVATAR_FULLSCREEN = {
  size: "size-40 sm:size-44",
  offset: "-mt-[100px] sm:-mt-[108px]",
};

interface AvatarOutletProps {
  entity?: any;
  component: string;
  hasAvatar?: boolean;
  hasActions?: boolean;
  className?: string;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Loading state - shows skeleton when true
  isLoading?: boolean;

  // Fullscreen mode - larger avatar from sm breakpoint
  isFullscreenMode?: boolean;

  // Legacy handlers (deprecated - use pageConfig.menus instead)
  onEdit?: () => void;
  onMoreOptions?: () => void;

  // Component to render inside the outlet
  children?: React.ReactNode;
}

/**
 * AvatarOutlet - Universal avatar outlet with action buttons
 *
 * Based on Angular: libs/schema/ui/template/avatar/avatar-outlet.component.ts
 * Shows entity-specific avatar (via children) with Edit and More options buttons
 * Positioned with -mt-32 to overlap cover
 *
 * Config-driven: use hasAvatar, hasActions flags to control visibility
 * Wraps EntityAvatar component (universal for all entity types)
 */
export function AvatarOutlet({
  entity,
  component,
  hasAvatar = true,
  hasActions = true,
  className = "",
  pageConfig,
  spacePermissions = { canEdit: true, canDelete: false, canAdd: false },
  isLoading = false,
  isFullscreenMode = false,
  onEdit,
  onMoreOptions,
  children,
}: AvatarOutletProps) {
  // Select avatar config based on mode
  const avatarConfig = isFullscreenMode ? AVATAR_FULLSCREEN : AVATAR_DRAWER;

  // Show skeleton when loading - respects hasAvatar/hasActions from config
  if (isLoading) {
    return (
      <div
        className={`${avatarConfig.offset} flex flex-auto items-end relative pb-3 top-0 z-30 px-6 pointer-events-none ${className}`}
      >
        {/* Avatar skeleton - only if hasAvatar */}
        {hasAvatar && (
          <div
            className={`rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-900 shrink-0 animate-pulse ${avatarConfig.size}`}
          />
        )}

        {/* Action buttons skeleton - only if hasActions */}
        {hasActions && (
          <div className="mb-1 ml-auto flex gap-2">
            <div className="w-20 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Get menu items for avatar context
  const menuItems = usePageMenu({
    pageConfig: pageConfig || null,
    context: "avatar",
    spacePermissions,
  });

  // Get button items (duplicateOnDesktop)
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: "avatar",
    spacePermissions,
    containerWidth: 1280, // TODO: Get real container width
  });

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    edit: onEdit,
  });

  // Check if we have menu config - if not, use fallback UI
  const hasMenuConfig =
    pageConfig?.menus && Object.keys(pageConfig.menus).length > 0;
  const showFallbackButtons = !hasMenuConfig && hasActions;

  // Show Edit button if:
  // 1. No menu config at all (fallback mode), OR
  // 2. Has menu config but no duplicate buttons for Edit action
  const hasEditButton = buttonItems.some((item) => item.action === "edit");
  const showEditFallback =
    hasActions && spacePermissions.canEdit && !hasEditButton;

  // Show More Options fallback if has menu config but no menu items (filtered out)
  const showMoreOptionsFallback = hasMenuConfig && menuItems.length === 0;

  return (
    <div
      className={`${avatarConfig.offset} flex flex-auto items-end relative pb-3 top-0 z-30 px-6 pointer-events-none ${className}`}
    >
      {/* Avatar - entity-specific component via children */}
      {hasAvatar && <div className="pointer-events-auto">{children}</div>}

      {/* Action buttons - config-driven */}
      {hasActions && (hasMenuConfig || showEditFallback) && (
        <div className="mb-1 ml-auto flex gap-2 pointer-events-auto">
          {/* Separate buttons for items with duplicateOnDesktop */}
          {buttonItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.6rem] px-4 text-base font-semibold"
                  onClick={() => executeAction(item.action)}
                  type="button"
                >
                  <Icon icon={item.icon} size={16} />
                  <span className="ml-2">{item.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Fallback Edit button if not in buttonItems */}
          {showEditFallback && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.6rem] px-4 text-base font-semibold"
                  onClick={() => executeAction("edit")}
                  type="button"
                >
                  <Icon icon={{ name: "Pencil", source: "lucide" }} size={16} />
                  <span className="ml-2">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>
          )}

          {/* More options dropdown menu */}
          {menuItems.length > 0 && (
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
                      onClick={() => executeAction(item.action)}
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
          )}

          {/* Fallback More Options button if no menu items */}
          {showMoreOptionsFallback && (
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

      {/* Fallback buttons when no menu config */}
      {showFallbackButtons && (
        <div className="mb-1 ml-auto flex gap-2 pointer-events-auto">
          {/* Edit button */}
          {spacePermissions.canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.6rem] px-4 text-base font-semibold"
                  onClick={() => executeAction("edit")}
                  type="button"
                >
                  <Icon icon={{ name: "Pencil", source: "lucide" }} size={16} />
                  <span className="ml-2">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>
          )}

          {/* More options button */}
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
        </div>
      )}
    </div>
  );
}
