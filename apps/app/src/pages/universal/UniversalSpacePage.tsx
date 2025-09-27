import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { appConfigStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { SpaceConfig } from '@/core/space/types';
import { 
  createSpaceConfig, 
  DEFAULT_LIST_VIEW,
  DEFAULT_GRID_VIEW, 
  FIELD_NAMES_SPACE_MINIMUM,
  NAME_FILTER 
} from '@/core/space/config';

// Generic hook for entities (will be replaced with SpaceStore later)
function useGenericEntities(entityType: string) {
  return (params: { rows: number; from: number }) => {
    // TODO: Replace with SpaceStore.getEntityStore(entityType)
    return {
      data: { entities: [], total: 0 },
      isLoading: false,
      error: null,
      isFetching: false,
    };
  };
}

export function UniversalSpacePage() {
  useSignals();
  const { entityType } = useParams<{ entityType: string }>();
  
  // Get space config from appConfigStore
  const spaceConfig = useMemo(() => {
    if (!entityType) return null;
    
    // Find the space config for this entity type
    const configKey = `${entityType}_space`;
    const config = appConfigStore.getConfig(configKey);
    
    if (!config?.data) {
      // Fallback to basic config if not found
      return createSpaceConfig({
        id: entityType,
        url: entityType.toLowerCase(),
        entitySchemaName: entityType,
        
        viewConfig: [
          {
            ...DEFAULT_LIST_VIEW,
            component: () => import('@/components/space/GenericListCard').then(m => ({ default: m.GenericListCard })),
          },
          {
            ...DEFAULT_GRID_VIEW,
            component: () => import('@/components/space/GenericGridCard').then(m => ({ default: m.GenericGridCard })),
          },
        ],
        
        entitiesColumns: FIELD_NAMES_SPACE_MINIMUM,
        
        naming: {
          title: entityType,
          plural: {
            no: `no ${entityType.toLowerCase()}s`,
            one: entityType.toLowerCase(),
            other: `${entityType.toLowerCase()}s`,
          },
          searchPlaceholder: `Search ${entityType.toLowerCase()}s`,
          noSearchResults: `There are no ${entityType.toLowerCase()}s!`,
        },
        
        filterConfig: [NAME_FILTER],
        
        isPublic: true,
        canAdd: true,
        
        defaultSort: {
          field: 'name',
          order: 'asc' as const,
        },
      });
    }
    
    // Build SpaceConfig from app_config data
    const spaceData = config.data;
    
    return createSpaceConfig({
      id: spaceData.id || entityType,
      url: spaceData.url || entityType.toLowerCase(),
      entitySchemaName: spaceData.entitySchemaName || entityType,
      
      viewConfig: spaceData.viewConfig || [
        {
          ...DEFAULT_LIST_VIEW,
          component: () => import('@/components/space/GenericListCard').then(m => ({ default: m.GenericListCard })),
        },
      ],
      
      entitiesColumns: spaceData.entitiesColumns || FIELD_NAMES_SPACE_MINIMUM,
      
      naming: spaceData.naming || {
        title: spaceData.entitySchemaName || entityType,
        plural: {
          no: `no ${entityType.toLowerCase()}s`,
          one: entityType.toLowerCase(),
          other: `${entityType.toLowerCase()}s`,
        },
        searchPlaceholder: `Search ${entityType.toLowerCase()}s`,
        noSearchResults: `There are no ${entityType.toLowerCase()}s!`,
      },
      
      filterConfig: spaceData.filterConfig || [NAME_FILTER],
      
      isPublic: spaceData.isPublic !== undefined ? spaceData.isPublic : true,
      canAdd: spaceData.canAdd !== undefined ? spaceData.canAdd : true,
      canEdit: spaceData.canEdit,
      canDelete: spaceData.canDelete,
      
      defaultSort: spaceData.defaultSort || {
        field: 'name',
        order: 'asc' as const,
      },
    }) as SpaceConfig;
  }, [entityType]);
  
  // Create entities hook for this entity type
  const useEntitiesHook = useGenericEntities(entityType || '');
  
  if (!spaceConfig) {
    return <div>Entity type not found</div>;
  }
  
  return (
    <SpaceComponent 
      config={spaceConfig} 
      useEntitiesHook={useEntitiesHook}
    />
  );
}