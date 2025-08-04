import React from 'react';

interface SpaceFiltersProps {
  children: React.ReactNode;
}

export function SpaceFilters({ children }: SpaceFiltersProps) {
  return (
    <div className="mt-4">
      {children}
    </div>
  );
}