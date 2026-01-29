import React from 'react';
import { getBlockComponent, getOutletComponent } from './ComponentRegistry';
import type { BlockConfig, PageConfig } from '../../types/page-config.types';
import type { SpacePermissions } from '../../types/page-menu.types';

interface BlockRendererProps {
  blockConfig: BlockConfig;
  entity: any;
  className?: string;
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;
  /**
   * Loading state for skeleton rendering
   * When true, outlet shows skeleton but component STILL renders (invisible)
   * This allows components to trigger their data loading
   */
  isLoading?: boolean;
}

/**
 * BlockRenderer - Universal component for rendering blocks dynamically from config
 *
 * Supports outlet + component pattern:
 * - outlet: Universal structural wrapper (CoverOutlet, NameOutlet, etc.)
 * - component: Entity-specific content (BreedCoverV1, BreedName, etc.)
 *
 * If outlet is specified, wraps component in outlet.
 * If no outlet, renders component directly (backward compatibility).
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
  blockConfig,
  entity,
  className,
  pageConfig,
  spacePermissions,
  isLoading = false,
}) => {
  const { outlet, component: configComponent, ...restConfig } = blockConfig;

  // Auto-detect cover component based on entity data
  // If component is not specified or "auto" for CoverOutlet, determine automatically
  let component = configComponent;
  if (outlet === 'CoverOutlet' && (!configComponent || configComponent === 'auto')) {
    // Has breed data (is breed with top_patrons, or has breed_id reference)
    const hasBreedData = entity?.top_patrons || entity?.breed_id;
    component = hasBreedData ? 'BreedCoverV1' : 'DefaultCover';
  }

  // TabOutlet is special - it renders tabs directly without a block component
  // The tabs config is passed directly to the outlet
  if (outlet === 'TabOutlet') {
    const OutletComponent = getOutletComponent(outlet);
    if (!OutletComponent) {
      console.error(`[BlockRenderer] TabOutlet not found in registry`);
      return null;
    }
    return (
      <OutletComponent
        entity={entity}
        component={component}
        {...restConfig}
        className={className}
        pageConfig={pageConfig}
        spacePermissions={spacePermissions}
        isLoading={isLoading}
      />
    );
  }

  // Get component from registry
  const BlockComponent = getBlockComponent(component);

  // Handle missing component
  if (!BlockComponent) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`border-2 border-dashed border-red-400 bg-red-50 p-4 rounded-lg ${className || ''}`}>
          <div className="text-red-700 font-semibold">
            Block component not found: {component}
          </div>
          <div className="text-red-600 text-sm mt-2">
            Make sure the component is registered in ComponentRegistry
          </div>
          <div className="text-slate-600 text-xs mt-2 font-mono">
            Config: {JSON.stringify(blockConfig, null, 2)}
          </div>
        </div>
      );
    }

    // In production, fail silently or show minimal error
    console.error(`[BlockRenderer] Component not found: ${component}`);
    return null;
  }

  // If no outlet, render component directly (backward compatibility)
  if (!outlet) {
    return (
      <BlockComponent
        entity={entity}
        {...restConfig}
        className={className}
        pageConfig={pageConfig}
        spacePermissions={spacePermissions}
      />
    );
  }

  // Get outlet from registry
  const OutletComponent = getOutletComponent(outlet);

  // Handle missing outlet
  if (!OutletComponent) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`border-2 border-dashed border-orange-400 bg-orange-50 p-4 rounded-lg ${className || ''}`}>
          <div className="text-orange-700 font-semibold">
            Outlet component not found: {outlet}
          </div>
          <div className="text-orange-600 text-sm mt-2">
            Make sure the outlet is registered in ComponentRegistry
          </div>
          <div className="text-slate-600 text-xs mt-2 font-mono">
            Config: {JSON.stringify(blockConfig, null, 2)}
          </div>
        </div>
      );
    }

    console.error(`[BlockRenderer] Outlet not found: ${outlet}`);
    return null;
  }

  // Render outlet wrapping component
  // Pass isLoading to outlet - outlet shows skeleton when loading
  // IMPORTANT: Always render BlockComponent so it can trigger data loading
  // The outlet handles visibility (skeleton overlay when loading)
  return (
    <OutletComponent
      entity={entity}
      component={component}
      {...restConfig}
      className={className}
      pageConfig={pageConfig}
      spacePermissions={spacePermissions}
      isLoading={isLoading}
    >
      {/* Always render block component to trigger data loading */}
      {/* Outlet handles visibility via isLoading prop */}
      <BlockComponent
        entity={entity}
        {...restConfig}
        pageConfig={pageConfig}
        spacePermissions={spacePermissions}
      />
    </OutletComponent>
  );
};
