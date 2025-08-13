import React from 'react';
import { cn } from '@ui/lib/utils';

interface NameContainerOutletProps {
  className?: string;
  children?: React.ReactNode;
}

export function NameContainerOutlet({ className, children }: NameContainerOutletProps) {
  return (
    <div className={cn("sticky top-0 z-30 bg-white dark:bg-gray-900 py-4", className)}>
      {/* Render the name component passed as children */}
      {children}
    </div>
  );
}