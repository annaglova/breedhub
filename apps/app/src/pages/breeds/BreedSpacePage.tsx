import React from 'react';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { useBreeds } from '@/hooks/useBreeds';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';

export function BreedSpacePage() {
  return (
    <SpaceComponent 
      config={breedSpaceConfig} 
      useEntitiesHook={useBreeds}
    />
  );
}