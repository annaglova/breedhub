import React from 'react';
import { MatingPage } from './MatingPage';

/**
 * Page component registry for tool pages (non-entity workspaces)
 *
 * Maps component names from app_config to actual React components.
 * Used by AppRouter to dynamically create routes for workspace pages.
 */
const pageRegistry = new Map<string, React.ComponentType<any>>();

export function registerPage(name: string, component: React.ComponentType<any>) {
  pageRegistry.set(name, component);
}

export function getPage(name: string): React.ComponentType<any> | undefined {
  return pageRegistry.get(name);
}

export function hasPage(name: string): boolean {
  return pageRegistry.has(name);
}

// Register tool pages
registerPage('MatingPage', MatingPage);

// Fallback component for unknown pages
export const PageNotFound: React.FC<{ componentName?: string }> = ({ componentName }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8">
      <p className="text-slate-500">Page component not found</p>
      {componentName && (
        <p className="text-xs text-slate-400 mt-2">
          Component: {componentName}
        </p>
      )}
    </div>
  </div>
);
