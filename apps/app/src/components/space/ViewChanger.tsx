import { ButtonGroup, ButtonGroupItem } from "@ui/components/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { LucideIconByName } from "@ui/lib/lucide-icons";
import { cn } from "@ui/lib/utils";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { computeSpaceBasePath } from "./view-changer.helpers";

interface ViewChangerProps {
  views?: string[];
  viewConfigs?: Array<{
    id: string;
    icon?: string;
    tooltip?: string;
  }>;
  onViewChange?: (view: string) => void;
  /**
   * Current space slug (e.g. "pets"). Used to compute the base path so we
   * strip only the entity-slug portion of the URL — not the workspace prefix.
   * Without this, /my/pets/dreamberry would naively get sliced to /my, breaking
   * private workspaces.
   */
  spaceSlug?: string;
}

export function ViewChanger({
  views = ["list"],
  viewConfigs,
  onViewChange,
  spaceSlug,
}: ViewChangerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = searchParams.get("view") || views[0];

  const handleViewChange = (view: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", view);

    const basePath = computeSpaceBasePath(location.pathname, spaceSlug);
    navigate(`${basePath}?${newParams.toString()}`);
    onViewChange?.(view);
  };

  // Don't render if no views at all
  if (!views || views.length === 0) return null;

  // Build view configurations from provided configs
  const availableViews = views.map((viewId) => {
    // Find config for this view
    const config = viewConfigs?.find((c) => c.id === viewId);

    return {
      id: viewId,
      iconName: config?.icon || viewId,
      tooltip:
        config?.tooltip ||
        `${viewId.charAt(0).toUpperCase()}${viewId.slice(1)} view`,
    };
  });

  return (
    <TooltipProvider>
      <ButtonGroup>
        {availableViews.map((view, index) => {
          const isFirst = index === 0;
          const isLast = index === availableViews.length - 1;
          const isActive = currentView === view.id;

          return (
            <Tooltip key={view.id}>
              <TooltipTrigger asChild>
                <ButtonGroupItem
                  isFirst={isFirst}
                  isLast={isLast}
                  isActive={isActive}
                  onClick={isActive ? undefined : () => handleViewChange(view.id)}
                  className={cn(
                    "small-button-icon border border-secondary-600 transition-all",
                    isActive
                      ? "bg-secondary-600 text-white z-10 cursor-default"
                      : "bg-transparent hover:bg-secondary-600/10 text-secondary-600 hover:text-secondary-600 cursor-pointer"
                  )}
                  aria-label={view.tooltip}
                >
                  <LucideIconByName
                    name={view.iconName}
                    className="h-4 w-4"
                  />
                </ButtonGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{view.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </TooltipProvider>
  );
}
