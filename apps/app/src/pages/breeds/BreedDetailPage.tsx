import React from 'react';
import { useParams } from 'react-router-dom';
import { EntityPageProvider } from '@/core/entity-page/EntityPageContext';
import { EntityPageComponent } from '@/core/entity-page/EntityPageComponent';
import { breedPageConfig } from '@/config/pages/breed-page.config';

export function BreedDetailPage() {
  const { breedId } = useParams<{ breedId: string }>();
  
  // TODO: In future, we'll support friendly URLs like /maine-coon
  // For now, using breed IDs like /breed-1
  
  return (
    <EntityPageProvider config={breedPageConfig}>
      <EntityPageComponent />
    </EntityPageProvider>
  );
}