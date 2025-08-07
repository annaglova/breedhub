import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SpaceContainer } from './SpaceContainer';
import { VirtualSpaceView } from './VirtualSpaceView';
import { SpaceConfig } from '@/core/space/types';

interface SpacePageProps<T> {
  config: SpaceConfig<T>;
  useEntitiesHook: (params: { rows: number; from: number }) => {
    data: { entities: T[]; total: number } | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  };
}

export function SpacePage<T extends { Id: string }>({ 
  config, 
  useEntitiesHook 
}: SpacePageProps<T>) {
  const [page, setPage] = useState(0);
  const [allEntities, setAllEntities] = useState<T[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const { data, isLoading, error, isFetching } = useEntitiesHook({ 
    rows: 50, 
    from: page * 50 
  });
  
  const navigate = useNavigate();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view') || config.viewConfig[0].id;

  // Accumulate entities as we load more
  useEffect(() => {
    if (data?.entities && !isLoading) {
      if (page === 0) {
        setAllEntities(data.entities);
        setIsInitialLoad(false);
      } else {
        setAllEntities(prev => [...prev, ...data.entities]);
      }
      // Update total count only when we have data
      if (data.total) {
        setTotalCount(data.total);
      }
    }
  }, [data, page, isLoading]);

  const handleEntityClick = useCallback((entity: T) => {
    setSelectedEntityId(entity.Id);
    navigate(`${entity.Id}`);
  }, [navigate]);

  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading {config.naming.plural.other}. Please try again later.</p>
      </div>
    );
  }

  // Show loading state only on initial load
  if (isInitialLoad && isLoading) {
    return (
      <SpaceContainer
        config={{
          title: config.naming.title,
          searchPlaceholder: config.naming.searchPlaceholder,
          canAdd: config.canAdd,
          model: config.entitySchemaName,
          views: config.viewConfig.map(v => v.id),
        }}
        entitiesCount={0}
        isLoading={true}
        total={0}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading {config.naming.plural.other}...</div>
        </div>
      </SpaceContainer>
    );
  }

  return (
    <SpaceContainer
      config={{
        title: config.naming.title,
        searchPlaceholder: config.naming.searchPlaceholder,
        canAdd: config.canAdd,
        model: config.entitySchemaName,
        views: config.viewConfig.map(v => v.id),
      }}
      entitiesCount={allEntities.length}
      isLoading={false}
      total={totalCount}
    >
      <VirtualSpaceView
        config={config}
        entities={allEntities}
        viewMode={viewMode}
        selectedId={selectedEntityId}
        onEntityClick={handleEntityClick}
        onLoadMore={handleLoadMore}
        hasMore={allEntities.length < totalCount}
        isLoadingMore={isFetching}
      />
    </SpaceContainer>
  );
}