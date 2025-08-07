import React from 'react';
import { SpacePage } from '@/components/space/SpacePage';
import { useBreeds } from '@/hooks/useBreeds';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';

export function BreedSpacePage() {
  return (
    <SpacePage 
      config={breedSpaceConfig} 
      useEntitiesHook={useBreeds}
    />
  );
}