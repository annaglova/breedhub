import { Icon } from "@/components/shared/Icon";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenuButtons } from "@/hooks/usePageMenu";
import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { useNavigate } from "react-router-dom";
import { NavigationButtons } from "./cover/NavigationButtons";

interface EditNameOutletProps {
  entity?: any;
  onTop?: boolean;
  isLoading?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;
  entityType?: string;
  onNavigateAway?: (url: string) => void;
}

/**
 * EditNameOutlet - Sticky name bar for edit pages
 *
 * Shows entity name (truncated, links to public page), navigation buttons,
 * and config-driven action buttons (Save) when sticky with unsaved changes.
 */
export function EditNameOutlet({
  entity,
  onTop = false,
  isLoading = false,
  onSave,
  hasUnsavedChanges = false,
  pageConfig,
  spacePermissions = { canEdit: false, canDelete: false, canAdd: false },
  entityType,
  onNavigateAway,
}: EditNameOutletProps) {
  const navigate = useNavigate();
  const displayName = entity?.name || "";
  const slug = entity?.slug;

  // Entity type display labels
  const ENTITY_TYPE_LABELS: Record<string, string> = {
    pet: "Pet profile",
    breed: "Breed profile",
    kennel: "Kennel profile",
    litter: "Litter profile",
    contact: "Contact profile",
    event: "Event",
  };
  const entityTypeLabel = entityType ? ENTITY_TYPE_LABELS[entityType] || entityType : "";

  // Get button items from config (duplicateOnDesktop items for sticky context)
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: "sticky",
    spacePermissions,
    containerWidth: 1280,
  });

  // Action handlers with custom save
  const { executeAction } = usePageActions(entity, {
    ...(onSave ? { save: onSave } : {}),
  });

  return (
    <div
      className={`relative bg-card-ground px-4 sm:px-0 pt-4 sm:pt-0 pb-3 ${
        onTop ? "border-b border-surface-border" : ""
      }`}
    >
      {/* Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-card-ground px-4 sm:px-0">
          <div className="flex flex-col space-y-4 pt-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="h-7 w-72 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Entity type label + Name with link to public page */}
      <div className={isLoading ? "invisible" : ""}>
        <div className="text-md mb-2 min-h-[1.5rem]">
          {entityTypeLabel && (
            <span className="uppercase">{entityTypeLabel}</span>
          )}
        </div>
        <div className="truncate py-0.5 text-2xl sm:text-3xl font-bold">
          {slug ? (
            <a
              href={`/${slug}`}
              className="text-foreground hover:text-primary cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                const url = `/${slug}`;
                if (hasUnsavedChanges && onNavigateAway) {
                  onNavigateAway(url);
                } else {
                  navigate(url);
                }
              }}
            >
              {displayName}
            </a>
          ) : (
            <span className="cursor-default">{displayName}</span>
          )}
        </div>
      </div>

      {/* Navigation buttons - top right when sticky */}
      {onTop && (
        <div className="absolute right-4 sm:right-0 top-0">
          <NavigationButtons mode="default" entityType={entityType} />
        </div>
      )}

      {/* Action buttons - bottom right when sticky and has unsaved changes */}
      {onTop && !isLoading && buttonItems.length > 0 && (
        <div className="absolute bottom-1 right-4 sm:right-0 flex gap-1">
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
        </div>
      )}
    </div>
  );
}
