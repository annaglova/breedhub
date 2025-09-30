import {
  createSpaceConfig,
  DEFAULT_LIST_VIEW,
  FIELD_NAMES_SPACE_MINIMUM,
  NAME_FILTER
} from '@/core/space/config';
import { SpaceConfig } from '@/core/space/types';
import { Breed } from '@/services/api';

const PET_TYPE_FILTER = {
  id: 'petType',
  type: 'select' as const,
  label: 'Pet Type',
  placeholder: 'All pet types',
  options: [
    { value: 'dog', label: 'Dogs' },
    { value: 'cat', label: 'Cats' },
  ],
};

export const breedSpaceConfig: SpaceConfig<Breed> = createSpaceConfig({
  id: 'breed',
  url: 'breeds',
  entitySchemaName: 'breed',
  
  viewConfig: [
    {
      ...DEFAULT_LIST_VIEW,
      component: () => import('@/components/breed/BreedListCard').then(m => ({ default: m.BreedListCard })),
    },
  ],
  
  entitiesColumns: [
    ...FIELD_NAMES_SPACE_MINIMUM,
    'PetProfileCount',
    'KennelCount',
    'PatronCount', 
    'AchievementProgress',
    'HasNotes',
    'Avatar',
    'TopPatrons',
  ],
  
  naming: {
    title: 'Breeds',
    plural: {
      no: 'no breeds',
      one: 'breed',
      other: 'breeds',
    },
    searchPlaceholder: 'Search breeds',
    noSearchResults: 'There are no breeds!',
  },
  
  filterConfig: [NAME_FILTER, PET_TYPE_FILTER],
  
  isPublic: true,
  canAdd: false,
  
  defaultSort: {
    field: 'Name',
    order: 'asc',
  },
});