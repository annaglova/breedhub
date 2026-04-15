import { ButtonGroup, ButtonGroupItem } from "@ui/components/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn, getIconComponent } from "@ui/lib/utils";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

interface ViewChangerProps {
  views?: string[];
  viewConfigs?: Array<{
    id: string;
    icon?: string;
    tooltip?: string;
  }>;
  onViewChange?: (view: string) => void;
}

export function ViewChanger({
  views = ["list"],
  viewConfigs,
  onViewChange,
}: ViewChangerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = searchParams.get("view") || views[0];

  const handleViewChange = (view: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", view);

    // When switching to grid/tab view, strip entity slug from path
    // e.g., /pets/rosalago-mms-ronaldinho → /pets
    const basePath = location.pathname.split("/").slice(0, 2).join("/");
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
      icon: getIconComponent(config?.icon || viewId),
      tooltip:
        config?.tooltip ||
        `${viewId.charAt(0).toUpperCase()}${viewId.slice(1)} view`,
    };
  });

  return (
    <TooltipProvider>
      <ButtonGroup>
        {availableViews.map((view, index) => {
          const Icon = view.icon;
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
                      : "bg-transparent hover:bg-secondary-600/10 text-secondary-600 cursor-pointer"
                  )}
                  aria-label={view.tooltip}
                >
                  <Icon className="h-4 w-4" />
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
