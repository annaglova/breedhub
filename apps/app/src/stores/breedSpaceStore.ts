import { createSpaceStore } from './createSpaceStore';
import { breedSpaceConfig } from '@/config/spaces/breed-space.config';
import { Breed } from '@/services/api';

export const useBreedSpaceStore = createSpaceStore<Breed>(
  breedSpaceConfig,
  'breed-space'
);