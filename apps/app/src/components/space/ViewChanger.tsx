import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@ui/components/button';
import { List, Grid3x3, Table, Map } from 'lucide-react';
import { cn } from '@ui/lib/utils';

const viewIcons = {
  list: List,
  grid: Grid3x3,
  table: Table,
  map: Map,
};

interface ViewChangerProps {
  views?: string[];
}

export function ViewChanger({ views = ['list'] }: ViewChangerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || views[0];

  const handleViewChange = (view: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
  };

  if (views.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {views.map(view => {
        const Icon = viewIcons[view as keyof typeof viewIcons] || List;
        return (
          <Button
            key={view}
            variant={currentView === view ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange(view)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline capitalize">{view}</span>
          </Button>
        );
      })}
    </div>
  );
}