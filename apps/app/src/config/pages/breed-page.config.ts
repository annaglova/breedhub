import { EntityPageConfig } from '@/core/entity-page/types';
import { Breed } from '@/services/api';
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

// Mock data loader (will be replaced with real API)
async function loadBreed(id: string): Promise<Breed> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    Id: id,
    Name: 'Maine Coon',
    Description: 'The Maine Coon is a large domesticated cat breed. It is one of the oldest natural breeds in North America.',
    Origin: 'United States',
    Size: 'Large',
    CoatLength: 'Long',
    LifeSpan: '12-15 years',
    Weight: '4-8 kg',
    Temperament: ['Gentle', 'Intelligent', 'Playful'],
    Colors: ['All colors and patterns'],
    PetProfileCount: 156,
    KennelCount: 23,
    Images: ['/mock/maine-coon-1.jpg', '/mock/maine-coon-2.jpg']
  } as Breed;
}

export const breedPageConfig: EntityPageConfig<Breed> = {
  entityName: 'Breed',
  headerComponent: BreedHeaderComponent,
  achievementsComponent: BreedAchievementsComponent,
  tabs: [
    {
      id: 'top-pets',
      label: 'Top Pets',
      icon: Dog,
      component: BreedTopPetsComponent,
      fragment: 'pets',
      order: 1
    },
    {
      id: 'kennels',
      label: 'Kennels',
      icon: Building,
      component: BreedKennelsComponent,
      fragment: 'kennels',
      order: 2
    },
    {
      id: 'statistics',
      label: 'Statistics',
      icon: BarChart3,
      component: BreedStatisticsComponent,
      fragment: 'stats',
      order: 3
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      component: BreedHistoryComponent,
      fragment: 'history',
      order: 4
    },
    {
      id: 'description',
      label: 'Description',
      icon: FileText,
      component: BreedDescriptionComponent,
      fragment: 'description',
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
  getTitle: (breed) => breed.Name,
  getDescription: (breed) => breed.Description
};