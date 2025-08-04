import React from 'react';
import { cn } from '@ui/lib/utils';

interface SpaceScrollerProps {
  scrollHeight: string;
  children: React.ReactNode;
  className?: string;
}

export function SpaceScroller({ scrollHeight, children, className }: SpaceScrollerProps) {
  return (
    <div 
      className={cn("overflow-auto", className)}
      style={{ height: scrollHeight }}
    >
      {children}
    </div>
  );
}