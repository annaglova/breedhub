import { EntityPageConfig } from '@/core/entity-page/types';
import { Breed } from '@/domain/entities/breed';
import { 
  Trophy, 
  Heart, 
  Dog, 
  Building, 
  BarChart3,
  History,
  FileText,
  Image
} from 'lucide-react';

// Import tab components (to be created)
import { BreedHeaderComponent } from '@/components/breed/page/BreedHeaderComponent';
import { BreedAchievementsComponent } from '@/components/breed/page/BreedAchievementsComponent';
import { BreedTopPetsComponent } from '@/components/breed/page/BreedTopPetsComponent';
import { BreedKennelsComponent } from '@/components/breed/page/BreedKennelsComponent';
import { BreedStatisticsComponent } from '@/components/breed/page/BreedStatisticsComponent';
import { BreedHistoryComponent } from '@/components/breed/page/BreedHistoryComponent';
import { BreedDescriptionComponent } from '@/components/breed/page/BreedDescriptionComponent';
import { BreedGalleryComponent } from '@/components/breed/page/BreedGalleryComponent';
import { BreedPatronsComponent } from '@/components/breed/page/BreedPatronsComponent';

import { mockBreeds } from '@/mocks/breeds.mock';

// Mock data loader (will be replaced with real API)
async function loadBreed(id: string): Promise<Breed> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Find breed by ID in mock data
  const breed = mockBreeds.find(b => b.id === id);
  if (!breed) {
    throw new Error(`Breed with ID ${id} not found`);
  }
  
  return breed;
}

export const breedPageConfig: EntityPageConfig<Breed> = {
  entityName: 'Breed',
  headerComponent: BreedHeaderComponent,
  achievementsComponent: BreedAchievementsComponent,
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      component: BreedDescriptionComponent,
      fragment: 'overview',
      order: 1
    },
    {
      id: 'pets',
      label: 'Pets',
      icon: Dog,
      component: BreedTopPetsComponent,
      fragment: 'pets',
      order: 2
    },
    {
      id: 'kennels',
      label: 'Kennels',
      icon: Building,
      component: BreedKennelsComponent,
      fragment: 'kennels',
      order: 3
    },
    {
      id: 'stats',
      label: 'Statistics',
      icon: BarChart3,
      component: BreedStatisticsComponent,
      fragment: 'stats',
      order: 4
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      component: BreedHistoryComponent,
      fragment: 'history',
      order: 5
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: Image,
      component: BreedGalleryComponent,
      fragment: 'gallery',
      order: 6
    },
    {
      id: 'patrons',
      label: 'Patrons',
      icon: Heart,
      component: BreedPatronsComponent,
      fragment: 'patrons',
      order: 7
    }
  ],
  loadEntity: loadBreed,
  getTitle: (breed) => breed.name,
  getDescription: (breed) => breed.authentic_name || breed.name
};