import { Icon } from "@/components/shared/Icon";
import { useDeleteEntity } from "@/hooks/useDeleteEntity";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenuButtons, usePageMenuDropdown } from "@/hooks/usePageMenu";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import { useLocation, useNavigate } from "react-router-dom";
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
import { ActionButtonsSkeleton } from "./ActionButtonsSkeleton";

// Avatar sizing per mode:
// - До sm: size-40, -mt-[88px] (обидва режими)
// - sm до xl: drawer size-40/-mt-[88px], fullscreen size-44/-mt-[108px]
// - Від xl: size-44, -mt-[108px] (обидва режими)
const AVATAR_DRAWER = {
  size: "size-[128px] xl:size-[160px]",
  offset: "-mt-[88px] xl:-mt-[102px]",
  padding: "sm:pl-6 xl:pl-12",
  skeletonLeft: "left-6 xl:left-12",
};
const AVATAR_FULLSCREEN = {
  size: "size-[128px] sm:size-[160px]",
  offset: "-mt-[88px] sm:-mt-[102px]",
  padding: "pl-6 sm:pl-12",
  skeletonLeft: "left-6 sm:left-12",
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

  // Entity type for delete with dependency check
  entityType?: string;

  // Save handler (from EditPageTemplate orchestration)
  onSave?: () => void;

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
  spacePermissions = { canEdit: false, canDelete: false, canAdd: false },
  isLoading = false,
  isFullscreenMode = false,
  entityType,
  onSave,
  onEdit,
  onMoreOptions,
  children,
}: AvatarOutletProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSignIn = () => {
    const currentUrl = location.pathname + location.search + location.hash;
    navigate(`/sign-in?redirectURL=${encodeURIComponent(currentUrl)}`);
  };

  // Select avatar config based on mode
  const avatarConfig = isFullscreenMode ? AVATAR_FULLSCREEN : AVATAR_DRAWER;

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

  // Delete entity with dependency check
  const { requestDelete, DeleteDialog } = useDeleteEntity(entityType, entity);

  const customActionHandlers = {
    ...(onSave ? { save: () => onSave() } : {}),
    ...(onEdit ? { edit: () => onEdit() } : {}),
    delete: () => {
      void requestDelete();
    },
  };

  // Action handlers
  const { executeAction } = usePageActions(entity, customActionHandlers, entityType);

  // Check if we have any buttons or menu items to show
  const hasButtons = buttonItems.length > 0;
  const hasMenuItems = menuItems.length > 0;

  return (
    <div
      // `adaptive-action-container` marks this row as a container query
      // root so the Save / Edit / Delete buttons below collapse to round
      // icons when the drawer is narrow and stretch to icon+label when
      // there's room (see `.adaptive-action-btn` in index.css). Without
      // this the buttons relied on the viewport `sm:` breakpoint, which
      // got Save wrong whenever the drawer was narrower than 640px.
      className={`adaptive-action-container ${avatarConfig.offset} ${avatarConfig.padding} flex flex-auto items-end relative pb-0 sm:pb-3 top-0 ${isLoading ? "z-[55]" : "z-30"} pointer-events-none px-4 sm:px-0 ${className}`}
    >
      {/* Avatar skeleton — structurally identical to EntityAvatar (white
          `p-1` frame on the outside, inner shadowed circle for the image
          area). The previous version used a `ring-4` outline that sat
          OUTSIDE the size box, so the skeleton rendered ~8px wider than the
          real avatar and the inner gray disc didn't line up with the image.
          Mirroring the live structure removes that drift. z-[60] still
          lifts it above the cover-skeleton overlay (z-50). */}
      {isLoading && hasAvatar && (
        <div
          className={`absolute z-[60] ${avatarConfig.skeletonLeft} ${avatarConfig.size} shrink-0`}
        >
          <div className="size-full rounded-full bg-white p-1 overflow-hidden">
            <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shadow-[0_0_0_1px_rgba(17,17,26,0.04),0_-1px_2px_rgba(17,17,26,0.04),0_2px_4px_rgba(17,17,26,0.1)]" />
          </div>
        </div>
      )}

      {/* Avatar - entity-specific component via children, or spacer to maintain layout */}
      {/* Always rendered to trigger data loading, invisible when loading */}
      {hasAvatar ? (
        <div className={`pointer-events-auto ${isLoading ? "invisible" : ""}`}>{children}</div>
      ) : (
        <div className={avatarConfig.size} />
      )}

      {/* Action buttons row — strictly config-driven. While loading we render
          the skeleton in the SAME flex slot (one placeholder per
          `buttonItem` + a circle for the dropdown when present), so the
          placeholder count and per-button widths match exactly what the
          real buttons will measure to. No absolute overlay, no swap jump. */}
      {hasActions && (hasButtons || hasMenuItems) && (
        <div
          className={`mb-1 ml-auto flex gap-2 ${isLoading ? "" : "pointer-events-auto"}`}
        >
          {isLoading ? (
            <ActionButtonsSkeleton
              items={buttonItems.map(({ id, label }) => ({ id, label }))}
              hasDropdown={hasMenuItems}
            />
          ) : (
            <>
          {/* Buttons from config — width/padding/label visibility driven by
              the `.adaptive-action-btn` + `.adaptive-action-btn-label` CSS
              classes (container-query in index.css). The button collapses to
              a round icon when the drawer is narrow and stretches with text
              when there's room — viewport size is irrelevant. */}
          {buttonItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  className="adaptive-action-btn rounded-full h-[2.25rem] text-base"
                  onClick={() => item.authRequired ? navigateToSignIn() : executeAction(item.action, item.actionParams)}
                  type="button"
                >
                  <Icon icon={item.icon} size={16} />
                  <span className="adaptive-action-btn-label">{item.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {item.authRequired ? 'Log in to use' : item.label}
              </TooltipContent>
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
          )}
            </>
          )}
        </div>
      )}
      {DeleteDialog}
    </div>
  );
}
