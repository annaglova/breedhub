import React from 'react';
import { SpaceContainer } from '@/components/space/SpaceContainer';

const breedsConfig = {
  title: 'Breeds',
  searchPlaceholder: 'Search breeds...',
  canAdd: false, // Public view
  model: 'Breed',
  views: ['list', 'grid']
};

export function BreedsPage() {
  // Mock data for now
  const mockData = {
    entitiesCount: 25,
    isLoading: false,
    total: 150
  };

  return (
    <SpaceContainer
      config={breedsConfig}
      entitiesCount={mockData.entitiesCount}
      isLoading={mockData.isLoading}
      total={mockData.total}
    >
      {/* Content will go here */}
      <div className="p-4">
        <p>Breeds list will be displayed here</p>
      </div>
    </SpaceContainer>
  );
}