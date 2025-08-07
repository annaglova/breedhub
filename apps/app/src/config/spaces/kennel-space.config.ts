import { 
  createSpaceConfig, 
  DEFAULT_LIST_VIEW,
  DEFAULT_GRID_VIEW, 
  FIELD_NAMES_SPACE_MINIMUM,
  NAME_FILTER 
} from '@/core/space/config';
import { SpaceConfig } from '@/core/space/types';

// Тимчасовий тип для Kennel
interface Kennel {
  Id: string;
  Name: string;
  BreedCount: number;
  PetCount: number;
  Rating: number;
  Location: string;
  Avatar?: string;
}

export const kennelSpaceConfig: SpaceConfig<Kennel> = createSpaceConfig({
  id: 'Kennel',
  url: 'kennels',
  entitySchemaName: 'Kennel',
  
  viewConfig: [
    {
      ...DEFAULT_LIST_VIEW,
      component: () => import('@/components/kennel/KennelListCard').then(m => ({ default: m.KennelListCard })),
    },
    {
      ...DEFAULT_GRID_VIEW,
      component: () => import('@/components/kennel/KennelGridCard').then(m => ({ default: m.KennelGridCard })),
    },
  ],
  
  entitiesColumns: [
    ...FIELD_NAMES_SPACE_MINIMUM,
    'BreedCount',
    'PetCount',
    'Rating',
    'Location',
    'Avatar',
  ],
  
  naming: {
    title: 'Kennels',
    plural: {
      no: 'no kennels',
      one: 'kennel',
      other: 'kennels',
    },
    searchPlaceholder: 'Search kennels',
    noSearchResults: 'There are no kennels!',
  },
  
  filterConfig: [
    NAME_FILTER,
    {
      id: 'location',
      type: 'text',
      label: 'Location',
      placeholder: 'Filter by location...',
    },
  ],
  
  isPublic: true,
  canAdd: true,
  
  defaultSort: {
    field: 'Name',
    order: 'asc',
  },
});