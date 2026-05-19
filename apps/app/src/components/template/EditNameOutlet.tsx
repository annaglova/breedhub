import { Icon } from "@/components/shared/Icon";
import { useSpaceConfig } from "@/contexts/SpaceContext";
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
import { NavigationButtonsSkeleton } from "./cover/NavigationButtonsSkeleton";

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
  showActionButtons?: boolean;
  isCreateMode?: boolean;
  createModeName?: string;
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
  showActionButtons = true,
  isCreateMode,
  createModeName,
}: EditNameOutletProps) {
  const navigate = useNavigate();

  // Resolve display model from space config (entitySchemaModel) — falls back
  // to the route's entityType when config is not yet hydrated. This is what
  // distinguishes e.g. "Kennel profile" from raw schema name "account".
  const spaceConfig = useSpaceConfig();
  const modelKey = (spaceConfig?.entitySchemaModel as string | undefined) || entityType || "";
  const modelLabel = modelKey ? modelKey.charAt(0).toUpperCase() + modelKey.slice(1) : "";

  const displayName = isCreateMode
    ? (createModeName || (modelLabel ? `New ${modelLabel}` : ""))
    : (entity?.name || "");
  const slug = entity?.slug;

  const entityTypeLabel = modelLabel ? `${modelLabel} profile` : "";

  // Get button items from config (duplicateOnDesktop items for sticky context)
  const buttonItems = usePageMenuButtons({
    pageConfig: pageConfig || null,
    context: "sticky",
    spacePermissions,
    containerWidth: 1280,
  });

  // Action handlers with custom save
  const { executeAction } = usePageActions(
    entity,
    {
      ...(onSave ? { save: onSave } : {}),
    },
    entityType,
  );

  return (
    <div
      className={`adaptive-action-container relative bg-card-ground px-4 sm:px-0 pt-4 sm:pt-0 pb-3 ${
        onTop ? "border-b border-surface-border" : ""
      }`}
    >
      {/* Skeleton placeholder — kept in normal DOM flow so it owns the block
          height during cold-load. Real children render absolute+invisible
          behind it to avoid the layout jump that happens when skeleton ↔
          real swap with mismatched heights. Same pattern as public
          NameOutlet. Row dimensions mirror Row 1 (entity-type label) and
          Row 2 (name) of public NameOutlet. Edit has no statistics row. */}
      {isLoading && (
        /* Skeleton drops into the same DOM shape as the real header so the
           text-line-height stack drives row heights instead of bespoke
           `h-[30px]` numbers. An invisible `&nbsp;` glyph inside each row
           forces the browser to apply font-size + line-height even though
           there is no visible text — without it the empty wrapper collapses
           to the bar height and renders ~2px shorter than the real text,
           causing a downward jump on hand-off. The pulsing bar is absolutely
           positioned and vertically centered so changing its height never
           affects the row outer height. */
        <div aria-hidden="true">
          <div className="text-md mb-2 min-h-[1.5rem] relative">
            <span className="invisible">{"\u00A0"}</span>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          <div className="truncate py-0.5 text-2xl sm:text-3xl font-bold relative">
            <span className="invisible">{"\u00A0"}</span>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-72 max-w-full bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Entity type label + Name. Always rendered to keep the data path
          consistent; absolute+invisible during loading so its height
          doesn't drive layout (the skeleton above does). */}
      <div className={isLoading ? "invisible absolute inset-0" : ""}>
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

      {/* Navigation buttons - top right when sticky. Swapped for a
          same-shape skeleton during cold-load so the sticky header doesn't
          show real arrows next to a still-skeletoned name. */}
      {onTop && (
        <div className="absolute right-4 sm:right-0 top-0">
          {isLoading ? (
            <NavigationButtonsSkeleton mode="default" />
          ) : (
            <NavigationButtons mode="default" entityType={entityType} />
          )}
        </div>
      )}

      {/* Action buttons - bottom right when sticky and has unsaved changes.
          `bottom-2` (8px) mirrors NameOutlet so Save / Patronate / etc. sit
          at the same vertical baseline across public and edit sticky
          headers — Anna noticed Save was 4px lower than the heart/⋮ row. */}
      {onTop && showActionButtons && !isLoading && buttonItems.length > 0 && (
        <div className="absolute bottom-2 right-4 sm:right-0 flex gap-1">
          {buttonItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline-secondary"
                  // Width / padding / label visibility are driven by the
                  // `.adaptive-action-btn` + `.adaptive-action-btn-label` CSS
                  // classes (container-query in index.css), so the button
                  // collapses to a round icon when the drawer is narrow
                  // and stretches with text when there's room — viewport
                  // size is irrelevant.
                  className="adaptive-action-btn rounded-full h-[2.25rem] text-base font-semibold"
                  onClick={() => executeAction(item.action, item.actionParams)}
                  type="button"
                >
                  <Icon icon={item.icon} size={16} />
                  <span className="adaptive-action-btn-label">{item.label}</span>
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
