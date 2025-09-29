import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ButtonGroup, ButtonGroupItem } from '@ui/components/button-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import * as Icons from 'lucide-react';
import { cn } from '@ui/lib/utils';

interface ViewChangerProps {
  views?: string[];
  viewConfigs?: Array<{
    id: string;
    icon?: string;
    tooltip?: string;
  }>;
  onViewChange?: (view: string) => void;
}

// Helper function to get icon component by name
function getIconComponent(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return Icons.List; // Default fallback

  // Convert icon name to PascalCase if needed (e.g., "grid-2x2" -> "Grid2x2")
  const pascalCase = iconName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Try to get icon from lucide-react
  const IconComponent = (Icons as any)[pascalCase];

  // Return found icon or default
  return IconComponent || Icons.List;
}

export function ViewChanger({
  views = ['list'],
  viewConfigs,
  onViewChange
}: ViewChangerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || views[0];

  const handleViewChange = (view: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
    onViewChange?.(view);
  };

  // Don't render if no views at all
  if (!views || views.length === 0) return null;

  // Build view configurations from provided configs
  const availableViews = views.map(viewId => {
    // Find config for this view
    const config = viewConfigs?.find(c => c.id === viewId);

    return {
      id: viewId,
      icon: getIconComponent(config?.icon || viewId),
      tooltip: config?.tooltip || `${viewId.charAt(0).toUpperCase()}${viewId.slice(1)} view`
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
                  onClick={() => handleViewChange(view.id)}
                  className={cn(
                    "size-[2.6rem] p-0 border-slate-600 transition-all",
                    isActive
                      ? "bg-slate-600 hover:bg-slate-500 text-white z-10"
                      : "bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-600"
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