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
import { Heart, MoreVertical } from "lucide-react";
import { Icon } from "@/components/shared/Icon";
import { NavigationButtons } from "./cover/NavigationButtons";
import { usePageMenu, usePageMenuButtons } from "@/hooks/usePageMenu";
import { usePageActions } from "@/hooks/usePageActions";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

interface NameOutletProps {
  entity?: any;
  component: string;
  className?: string;
  isLoading?: boolean;
  onTop?: boolean;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

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
  className = '',
  isLoading = false,
  onTop = false,
  pageConfig,
  spacePermissions = { canEdit: true, canDelete: false, canAdd: false },
  onSupport,
  onMoreOptions,
  children,
}: NameOutletProps) {
  // Get menu items for sticky context (when onTop)
  const menuItems = usePageMenu({
    pageConfig: pageConfig || null,
    context: 'sticky',
    spacePermissions,
  });

  // Get button items (duplicateOnDesktop) for sticky context
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: 'sticky',
    spacePermissions,
    containerWidth: 1280, // TODO: Get real container width
  });

  // Action handlers
  const { executeAction } = usePageActions(entity, {
    // Custom handlers can be passed here
    support: onSupport,
  });

  // Check if we have menu config
  const hasMenuConfig = pageConfig?.menus && Object.keys(pageConfig.menus).length > 0;

  if (isLoading) {
    return (
      <div className={`relative bg-card-ground ${className}`}>
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
      } ${className}`}
    >
      {/* Name content slot - entity-specific component via children */}
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
          {/* Separate buttons for items with duplicateOnDesktop (e.g., Edit) */}
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

          {/* Support button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className="rounded-full h-[2.6rem] w-[2.6rem] flex items-center justify-center"
                onClick={() => executeAction('support')}
                type="button"
              >
                <Heart size={16} fill="currentColor" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support</TooltipContent>
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
          ) : (
            /* Fallback More Options button if no menu items */
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
    </div>
  );
}
