import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ButtonGroup, ButtonGroupItem } from '@ui/components/button-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { List, Grid2x2, Table, Map, Share2 } from 'lucide-react';
import { ViewMode } from '@/core/space/types';
import { cn } from '@ui/lib/utils';

interface ViewConfig {
  id: ViewMode;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

const viewConfigs: ViewConfig[] = [
  { id: 'list', icon: List, tooltip: 'List view' },
  { id: 'grid', icon: Grid2x2, tooltip: 'Grid view' },
  { id: 'table', icon: Table, tooltip: 'Table view' },
  { id: 'map', icon: Map, tooltip: 'Map view' },
  { id: 'graph', icon: Share2, tooltip: 'Graph view' },
];

interface ViewChangerProps {
  views?: ViewMode[];
  onViewChange?: (view: ViewMode) => void;
}

export function ViewChanger({ views = ['list'], onViewChange }: ViewChangerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') as ViewMode || views[0];

  const handleViewChange = (view: ViewMode) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
    onViewChange?.(view);
  };

  if (views.length <= 1) return null;

  const availableViews = viewConfigs.filter(config => views.includes(config.id));

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