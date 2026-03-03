import { Button } from "@ui/components/button";
import { Save } from "lucide-react";
import { Link } from "react-router-dom";

interface EditNameOutletProps {
  entity?: any;
  onTop?: boolean;
  isLoading?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
}

/**
 * EditNameOutlet - Sticky name bar for edit pages
 *
 * Shows entity name (truncated, links to public page) and Save button.
 * Save button appears only when sticky (onTop) and there are unsaved changes.
 */
export function EditNameOutlet({
  entity,
  onTop = false,
  isLoading = false,
  onSave,
  hasUnsavedChanges = false,
}: EditNameOutletProps) {
  const displayName = entity?.name || "";
  const slug = entity?.slug;

  return (
    <div
      className={`relative bg-card-ground px-4 sm:px-0 pb-4 flex items-center min-h-[44px] ${
        onTop ? "border-b border-surface-border" : ""
      }`}
    >
      {/* Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-card-ground flex items-center px-4 sm:px-0">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        </div>
      )}

      {/* Name with link to public page */}
      <div className={`flex-1 min-w-0 ${isLoading ? "invisible" : ""}`}>
        <div className="truncate py-0.5 text-2xl sm:text-3xl font-bold">
          {slug ? (
            <Link
              to={`/${slug}`}
              className="text-foreground hover:text-primary cursor-pointer"
            >
              {displayName}
            </Link>
          ) : (
            <span className="cursor-default">{displayName}</span>
          )}
        </div>
      </div>

      {/* Save button - visible when sticky and has unsaved changes */}
      {onTop && hasUnsavedChanges && !isLoading && (
        <Button
          variant="outline-secondary"
          className="rounded-full h-[2.25rem] px-4 text-base font-semibold ml-3 shrink-0"
          onClick={onSave}
          type="button"
        >
          <Save size={16} />
          <span className="hidden sm:inline ml-2">Save</span>
        </Button>
      )}
    </div>
  );
}
