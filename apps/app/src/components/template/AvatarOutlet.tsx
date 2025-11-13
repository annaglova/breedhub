import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { BreedAvatar } from "../breed/BreedAvatar";
import { Icon } from "@/components/shared/Icon";
import { usePageMenu, usePageMenuButtons } from "@/hooks/usePageMenu";
import { usePageActions } from "@/hooks/usePageActions";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

// Design constants - kept in code, not config
const AVATAR_SIZE = 176;

interface AvatarOutletProps {
  entity?: any;           // Entity data for avatar rendering
  hasAvatar?: boolean;    // Show/hide avatar
  hasActions?: boolean;   // Show/hide action buttons

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Legacy handlers (deprecated - use pageConfig.menus instead)
  onEdit?: () => void;
  onMoreOptions?: () => void;
}

/**
 * AvatarOutlet - Universal avatar outlet with action buttons
 *
 * Based on Angular: libs/schema/ui/template/avatar/avatar-outlet.component.ts
 * Shows entity-specific avatar with Edit and More options buttons
 * Positioned with -mt-32 to overlap cover
 *
 * Config-driven: use hasAvatar, hasActions flags to control visibility
 * Design constants (size, spacing) are kept in code
 */
export function AvatarOutlet({
  entity,
  hasAvatar = true,
  hasActions = true,
  pageConfig,
  spacePermissions = { canEdit: true, canDelete: false, canAdd: false },
  onEdit,
  onMoreOptions,
}: AvatarOutletProps) {
  // Get menu items for avatar context
  const menuItems = usePageMenu({
    pageConfig: pageConfig || null,
    context: 'avatar',
    spacePermissions,
  });

  // Get button items (duplicateOnDesktop)
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: 'avatar',
    spacePermissions,
    containerWidth: 1280, // TODO: Get real container width
  });

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    edit: onEdit,
  });

  // Check if we have menu config - if not, use fallback UI
  const hasMenuConfig = pageConfig?.menus && Object.keys(pageConfig.menus).length > 0;
  const showFallbackButtons = !hasMenuConfig && hasActions;

  // Show Edit button if:
  // 1. No menu config at all (fallback mode), OR
  // 2. Has menu config but no duplicate buttons for Edit action
  const hasEditButton = buttonItems.some(item => item.action === 'edit');
  const showEditFallback = hasActions && spacePermissions.canEdit && !hasEditButton;

  // Show More Options fallback if has menu config but no menu items (filtered out)
  const showMoreOptionsFallback = hasMenuConfig && menuItems.length === 0;

  return (
    <div className="-mt-32 flex flex-auto items-end relative pb-3 top-0 z-30 px-6 pointer-events-none">
      {/* Avatar - entity-specific rendering */}
      {hasAvatar && (
        <div className="pointer-events-auto">
          <BreedAvatar
            entity={entity}
            size={AVATAR_SIZE}
          />
        </div>
      )}

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
                  onClick={() => executeAction('edit')}
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
                    {item.hasDivider && <DropdownMenuSeparator key={`divider-${item.id}`} />}
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
                  onClick={() => console.log('[TODO] More options')}
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
                  onClick={() => executeAction('edit')}
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
                onClick={() => console.log('[TODO] More options')}
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
