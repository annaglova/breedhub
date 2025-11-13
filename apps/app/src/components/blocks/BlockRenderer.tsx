import React from 'react';
import { getBlockComponent } from './ComponentRegistry';
import type { BlockConfig, PageConfig } from '../../types/page-config.types';
import type { SpacePermissions } from '../../types/page-menu.types';

interface BlockRendererProps {
  blockConfig: BlockConfig;
  entity: any;
  className?: string;
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;
}

/**
 * BlockRenderer - Universal component for rendering blocks dynamically from config
 *
 * Takes a block configuration and entity data, looks up the component in the registry,
 * and renders it with the provided props.
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
  blockConfig,
  entity,
  className,
  pageConfig,
  spacePermissions,
}) => {
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[BlockRenderer] Rendering block:', {
      component: blockConfig.component,
      blockConfig,
      entity,
      hasEntity: !!entity
    });
  }

  // Get component from registry
  const BlockComponent = getBlockComponent(blockConfig.component);

  // Debug: Check what we got
  if (process.env.NODE_ENV === 'development') {
    console.log('[BlockRenderer] Component lookup:', {
      componentName: blockConfig.component,
      found: !!BlockComponent,
      componentType: typeof BlockComponent,
      BlockComponent
    });
  }

  // Handle missing component
  if (!BlockComponent) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`border-2 border-dashed border-red-400 bg-red-50 p-4 rounded-lg ${className || ''}`}>
          <div className="text-red-700 font-semibold">
            Block component not found: {blockConfig.component}
          </div>
          <div className="text-red-600 text-sm mt-2">
            Make sure the component is registered in ComponentRegistry
          </div>
          <div className="text-gray-600 text-xs mt-2 font-mono">
            Config: {JSON.stringify(blockConfig, null, 2)}
          </div>
        </div>
      );
    }

    // In production, fail silently or show minimal error
    console.error(`[BlockRenderer] Component not found: ${blockConfig.component}`);
    return null;
  }

  // Render the component with entity and all block config props
  // Note: No wrapper div - parent is responsible for layout/spacing
  return (
    <BlockComponent
      entity={entity}
      {...blockConfig}
      className={className}
      pageConfig={pageConfig}
      spacePermissions={spacePermissions}
    />
  );
};
