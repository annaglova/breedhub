// Main exports for RxDB Store package
export {
  createBreedHubDB,
  getBreedHubDB,
  closeBreedHubDB,
  type BreedHubDatabase,
  type BreedHubCollections,
  type BreedCollection
} from './database.js';

export {
  RxDBSignalStore,
  useRxDBStore
} from './signal-integration.js';

export {
  breedSchema,
  breedMethods,
  breedStatics,
  type Breed
} from './schemas/breed.schema.js';