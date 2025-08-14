import { createSignalStore, createSelectors } from '../create-signal-store';
import { withEntities, withSelection, withFirstAsDefault } from '../features/with-entities';
import { withFiltering, withFilteredEntities, withDebouncedSearch } from '../features/with-filtering';
import { withRequestStatus, withOptimisticUpdate } from '../features/with-request-status';
import { composeFeatures } from '../core/create-store-feature';
import { Entity } from '../types';

/**
 * Breed entity type
 */
export interface Breed extends Entity {
  id: string;
  name: string;
  description: string;
  origin: string;
  temperament: string[];
  lifeSpan: string;
  weight: {
    min: number;
    max: number;
  };
  height: {
    min: number;
    max: number;
  };
  colors: string[];
  imageUrl?: string;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Breed store with all features
 */
const useBreedStoreBase = createSignalStore<Breed>(
  'breed',
  [
    // Entity management
    withEntities<Breed>(),
    withSelection<Breed>(),
    withFirstAsDefault<Breed>(),
    
    // Filtering and search
    withFiltering<Breed>(),
    withFilteredEntities<Breed>(),
    withDebouncedSearch<Breed>(300),
    
    // Request status
    withRequestStatus(),
    withOptimisticUpdate<Breed>(),
  ]
);

/**
 * Breed store selectors
 */
export const breedSelectors = createSelectors<Breed>(useBreedStoreBase);

/**
 * Breed store hook with custom methods
 */
export function useBreedStore() {
  const store = useBreedStoreBase();
  const actions = breedSelectors.useActions();
  
  // Custom methods
  const fetchBreeds = async () => {
    actions.setLoading();
    
    try {
      // Simulate API call
      const response = await fetch('/api/breeds');
      const breeds = await response.json();
      
      actions.setAllEntities(breeds);
      actions.setSuccess();
    } catch (error) {
      actions.setError(error as Error);
    }
  };
  
  const createBreed = async (breed: Omit<Breed, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBreed: Breed = {
      ...breed,
      id: `breed-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Optimistic update
    actions.addEntity(newBreed);
    store.applyOptimistic?.(newBreed.id, newBreed, newBreed);
    
    try {
      // Simulate API call
      const response = await fetch('/api/breeds', {
        method: 'POST',
        body: JSON.stringify(newBreed),
      });
      const savedBreed = await response.json();
      
      // Update with server response
      actions.updateEntity(newBreed.id, savedBreed);
      store.commitOptimistic?.(newBreed.id);
    } catch (error) {
      // Rollback on error
      const original = store.rollbackOptimistic?.(newBreed.id);
      if (original) {
        actions.removeEntity(newBreed.id);
      }
      throw error;
    }
  };
  
  const searchBreeds = (query: string) => {
    store.setDebouncedSearch?.(query);
  };
  
  const filterByOrigin = (origin: string) => {
    actions.setFilter({
      field: 'origin',
      operator: 'equals',
      value: origin,
    });
  };
  
  const filterByTemperament = (temperaments: string[]) => {
    actions.setFilter({
      field: 'temperament',
      operator: 'in',
      value: temperaments,
    });
  };
  
  const filterByPopularity = (min: number, max: number) => {
    actions.setFilter({
      field: 'popularity',
      operator: 'between',
      value: [min, max],
    });
  };
  
  return {
    ...store,
    ...actions,
    // Custom methods
    fetchBreeds,
    createBreed,
    searchBreeds,
    filterByOrigin,
    filterByTemperament,
    filterByPopularity,
  };
}

/**
 * Example mock data generator
 */
export function generateMockBreeds(count: number = 20): Breed[] {
  const origins = ['Germany', 'France', 'England', 'USA', 'Japan', 'Canada'];
  const temperaments = ['Friendly', 'Loyal', 'Playful', 'Intelligent', 'Protective', 'Calm', 'Energetic'];
  const colors = ['Black', 'White', 'Brown', 'Golden', 'Grey', 'Mixed'];
  
  const breeds: Breed[] = [];
  
  for (let i = 1; i <= count; i++) {
    breeds.push({
      id: `breed-${i}`,
      name: `Breed ${i}`,
      description: `Description for breed ${i}. This is a wonderful breed with unique characteristics.`,
      origin: origins[Math.floor(Math.random() * origins.length)],
      temperament: temperaments
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 2),
      lifeSpan: `${10 + Math.floor(Math.random() * 8)}-${15 + Math.floor(Math.random() * 5)} years`,
      weight: {
        min: 20 + Math.floor(Math.random() * 30),
        max: 50 + Math.floor(Math.random() * 50),
      },
      height: {
        min: 40 + Math.floor(Math.random() * 20),
        max: 60 + Math.floor(Math.random() * 30),
      },
      colors: colors
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 1),
      imageUrl: `https://placedog.net/400/300?id=${i}`,
      popularity: Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
      updatedAt: new Date(),
    });
  }
  
  return breeds;
}