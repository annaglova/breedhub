import React, { useMemo } from 'react';
import { SpaceComponent } from '@/components/space/SpaceComponent';
import { useBreeds } from '@/hooks/useBreeds';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';
import { appConfigStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

export function BreedSpacePage() {
  useSignals();
  
  // Get dynamic config from appConfigStore
  const dynamicConfig = useMemo(() => {
    // Use static config for now - will be replaced with dynamic config later
    return breedSpaceConfig;
  }, []);
  
  return (
    <SpaceComponent 
      config={dynamicConfig} 
      useEntitiesHook={useBreeds}
    />
  );
}