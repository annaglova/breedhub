import React from 'react';
import { EntityPageProvider } from '@/core/entity-page/EntityPageContext';
import { EntityPageComponent } from '@/core/entity-page/EntityPageComponent';
import { breedPageConfig } from '@/config/pages/breed-page.config';

export function BreedDetailPage() {
  return (
    <EntityPageProvider config={breedPageConfig}>
      <EntityPageComponent />
    </EntityPageProvider>
  );
}