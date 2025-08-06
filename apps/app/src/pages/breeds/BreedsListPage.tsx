import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpaceContainer } from '@/components/space/SpaceContainer';
import { SpaceView } from '@/components/space/SpaceView';
import { useBreeds } from '@/hooks/useBreeds';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';
import { Breed } from '@/services/api';

export function BreedsListPage() {
  const { data, isLoading, error } = useBreeds({ rows: 60 });
  const navigate = useNavigate();
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(breedSpaceConfig.viewConfig[0].id);

  const handleBreedClick = (breed: Breed) => {
    setSelectedBreedId(breed.Id);
    navigate(`/breeds/${breed.Id}`);
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading breeds. Please try again later.</p>
      </div>
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
      entitiesCount={data?.entities.length || 0}
      isLoading={isLoading}
      total={data?.total || 0}
    >
      <SpaceView
        config={breedSpaceConfig}
        entities={data?.entities || []}
        viewMode={viewMode}
        selectedId={selectedBreedId}
        onEntityClick={handleBreedClick}
      />
    </SpaceContainer>
  );
}