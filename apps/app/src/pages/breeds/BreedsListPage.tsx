import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpaceContainer } from '@/components/space/SpaceContainer';
import { VirtualSpaceView } from '@/components/space/VirtualSpaceView';
import { useBreeds } from '@/hooks/useBreeds';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';
import { Breed } from '@/services/api';

export function BreedsListPage() {
  const [page, setPage] = useState(0);
  const [allBreeds, setAllBreeds] = useState<Breed[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { data, isLoading, error, isFetching } = useBreeds({ 
    rows: 50, 
    from: page * 50 
  });
  const navigate = useNavigate();
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(breedSpaceConfig.viewConfig[0].id);

  // Accumulate breeds as we load more
  React.useEffect(() => {
    if (data?.entities && !isLoading) {
      if (page === 0) {
        setAllBreeds(data.entities);
        setIsInitialLoad(false);
      } else {
        setAllBreeds(prev => [...prev, ...data.entities]);
      }
      // Update total count only when we have data
      if (data.total) {
        setTotalCount(data.total);
      }
    }
  }, [data, page, isLoading]);

  const handleBreedClick = useCallback((breed: Breed) => {
    setSelectedBreedId(breed.Id);
    navigate(`/breeds/${breed.Id}`);
  }, [navigate]);

  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading breeds. Please try again later.</p>
      </div>
    );
  }

  // Show loading state only on initial load
  if (isInitialLoad && isLoading) {
    return (
      <SpaceContainer
        config={{
          title: breedSpaceConfig.naming.title,
          searchPlaceholder: breedSpaceConfig.naming.searchPlaceholder,
          canAdd: breedSpaceConfig.canAdd,
          model: breedSpaceConfig.entitySchemaName,
          views: breedSpaceConfig.viewConfig.map(v => v.id),
        }}
        entitiesCount={0}
        isLoading={true}
        total={0}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading breeds...</div>
        </div>
      </SpaceContainer>
    );
  }

  return (
    <SpaceContainer
      config={{
        title: breedSpaceConfig.naming.title,
        searchPlaceholder: breedSpaceConfig.naming.searchPlaceholder,
        canAdd: breedSpaceConfig.canAdd,
        model: breedSpaceConfig.entitySchemaName,
        views: breedSpaceConfig.viewConfig.map(v => v.id),
      }}
      entitiesCount={allBreeds.length}
      isLoading={false}
      total={totalCount}
    >
      <VirtualSpaceView
        config={breedSpaceConfig}
        entities={allBreeds}
        viewMode={viewMode}
        selectedId={selectedBreedId}
        onEntityClick={handleBreedClick}
        onLoadMore={handleLoadMore}
        hasMore={allBreeds.length < totalCount}
        isLoadingMore={isFetching}
      />
    </SpaceContainer>
  );
}