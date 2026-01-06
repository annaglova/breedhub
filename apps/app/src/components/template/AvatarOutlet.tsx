import { Icon } from "@/components/shared/Icon";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenuButtons, usePageMenuDropdown } from "@/hooks/usePageMenu";
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
  size: "size-32 xl:size-40",
  offset: "-mt-[88px] xl:-mt-[102px]",
  padding: "pl-6 xl:pl-12",
};
const AVATAR_FULLSCREEN = {
  size: "size-32 sm:size-40",
  offset: "-mt-[88px] sm:-mt-[102px]",
  padding: "pl-6 sm:pl-12",
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
        className={`${avatarConfig.offset} ${avatarConfig.padding} flex flex-auto items-end relative pb-3 top-0 z-30 pointer-events-none ${className}`}
      >
        {/* Avatar skeleton - only if hasAvatar */}
        {hasAvatar && (
          <div
            className={`rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900 shrink-0 animate-pulse ${avatarConfig.size}`}
          />
        )}

        {/* Action buttons skeleton - only if hasActions */}
        {hasActions && (
          <div className="mb-1 ml-auto flex gap-2">
            <div className="w-20 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Buttons are always shown (icon-only on mobile, with label on sm+)
  // So we always use "desktop" width to exclude duplicateOnDesktop from menu
  const containerWidth = 1280;

  // Get button items (duplicateOnDesktop items - shown on all screens)
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: "avatar",
    spacePermissions,
    containerWidth,
  });

  // Get dropdown menu items (excludes duplicateOnDesktop items on all screens)
  const menuItems = usePageMenuDropdown({
    pageConfig: pageConfig || null,
    context: "avatar",
    spacePermissions,
    containerWidth,
  });

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    edit: onEdit,
  });

  // Check if we have any buttons or menu items to show
  const hasButtons = buttonItems.length > 0;
  const hasMenuItems = menuItems.length > 0;

  return (
    <div
      className={`${avatarConfig.offset} ${avatarConfig.padding} flex flex-auto items-end relative pb-3 top-0 z-30 pointer-events-none ${className}`}
    >
      {/* Avatar - entity-specific component via children, or spacer to maintain layout */}
      {hasAvatar ? (
        <div className="pointer-events-auto">{children}</div>
      ) : (
        <div className={avatarConfig.size} />
      )}

      {/* Action buttons - strictly config-driven, no fallbacks */}
      {hasActions && (hasButtons || hasMenuItems) && (
        <div className="mb-1 ml-auto flex gap-2 pointer-events-auto">
          {/* Buttons from config (duplicateOnDesktop items) - icon only on mobile, with label on sm+ */}
          {buttonItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="rounded-full h-[2.25rem] w-[2.25rem] sm:w-auto sm:px-4 text-base font-semibold"
                  onClick={() => executeAction(item.action, item.actionParams)}
                  type="button"
                >
                  <Icon icon={item.icon} size={16} />
                  <span className="hidden sm:inline ml-2">{item.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          {/* More options dropdown menu */}
          {hasMenuItems && (
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
                      onClick={() =>
                        executeAction(item.action, item.actionParams)
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
