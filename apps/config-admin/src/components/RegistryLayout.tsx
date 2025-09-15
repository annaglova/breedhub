import React from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import type { WorkspaceHeaderProps } from './WorkspaceHeader';

interface RegistryLayoutProps {
  children: React.ReactNode;
  headerProps: WorkspaceHeaderProps;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared layout component for all registry pages (Properties, Templates, Fields, etc.)
 * Provides consistent structure and styling across all registry views.
 */
export default function RegistryLayout({
  children,
  headerProps,
  className = '',
  contentClassName = ''
}: RegistryLayoutProps) {
  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full">
        <div className={`bg-white rounded-lg shadow-md p-6 h-[calc(100vh-7rem)] flex flex-col ${className}`}>
          <WorkspaceHeader {...headerProps} />
          
          <div className={`flex-1 overflow-y-auto ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}