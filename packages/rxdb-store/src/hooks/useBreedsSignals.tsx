import { useSignals } from '@preact/signals-react/runtime';
import { 
  breeds, 
  breedsBySize, 
  breedsCount,
  loading, 
  error, 
  collection,
  replicationState,
  breedsStore
} from '../stores/breeds.signal-store';

/**
 * Hook for using breeds with signals
 * Provides reactive data that automatically updates UI
 */
export function useBreedsSignals() {
  useSignals(); // Enable signals tracking in this component
  
  return {
    // Reactive data (automatically updates UI when changed)
    breeds: breeds.value,
    breedsBySize: breedsBySize.value,
    breedsCount: breedsCount.value,
    loading: loading.value,
    error: error.value,
    collection: collection.value,
    replicationState: replicationState.value,
    
    // Operations (don't need .value)
    addBreed: breedsStore.addBreed.bind(breedsStore),
    updateBreed: breedsStore.updateBreed.bind(breedsStore),
    deleteBreed: breedsStore.deleteBreed.bind(breedsStore),
    searchBreeds: breedsStore.searchBreeds.bind(breedsStore),
    setFilter: breedsStore.setFilter.bind(breedsStore),
    clearFilter: breedsStore.clearFilter.bind(breedsStore),
    getBreedById: breedsStore.getBreedById.bind(breedsStore),
    enableSync: breedsStore.enableSync.bind(breedsStore),
    disableSync: breedsStore.disableSync.bind(breedsStore)
  };
}

/**
 * Hook for specific breed by ID with signals
 */
export function useBreedByIdSignal(id: string) {
  useSignals();
  
  const breed = breedsStore.getBreedById(id);
  
  return {
    breed,
    loading: loading.value,
    error: error.value,
    updateBreed: (updates: any) => breedsStore.updateBreed(id, updates),
    deleteBreed: () => breedsStore.deleteBreed(id)
  };
}

/**
 * Hook for breeds by size with signals
 */
export function useBreedsBySizeSignal(size: string) {
  useSignals();
  
  const allBySize = breedsBySize.value;
  const breedsOfSize = allBySize.get(size) || [];
  
  return {
    breeds: breedsOfSize,
    count: breedsOfSize.length,
    loading: loading.value,
    error: error.value
  };
}