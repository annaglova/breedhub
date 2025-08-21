import { CollectionService } from './collection.service';
import { RxCollection } from 'rxdb';
import { computed } from '@preact/signals-react';
import type { BreedDocType as Breed } from '../types/breed.types';

// Re-export the Breed type
export type { BreedDocType as Breed } from '../types/breed.types';

/**
 * Breed-specific collection service with domain logic
 */
export class BreedService extends CollectionService<Breed> {
  // Domain-specific computed values
  readonly breedsByGroup = computed(() => {
    const grouped = new Map<string, Breed[]>();
    
    this._items.value.forEach(breed => {
      const group = breed.group || 'Other';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(breed);
    });
    
    return grouped;
  });
  
  readonly breedsBySize = computed(() => {
    const sized = new Map<string, Breed[]>();
    const sizes = ['small', 'medium', 'large', 'giant'];
    
    sizes.forEach(size => sized.set(size, []));
    
    this._items.value.forEach(breed => {
      if (breed.size) {
        sized.get(breed.size)!.push(breed);
      }
    });
    
    return sized;
  });
  
  readonly popularBreeds = computed(() => 
    this._items.value
      .filter(breed => breed.traits?.includes('popular'))
      .slice(0, 10)
  );
  
  constructor(collection: RxCollection<Breed>) {
    super(collection);
  }
  
  /**
   * Search breeds by name or description
   */
  async searchBreeds(query: string): Promise<Breed[]> {
    const searchQuery = {
      selector: {
        $or: [
          { name: { $regex: `.*${query}.*`, $options: 'i' } },
          { description: { $regex: `.*${query}.*`, $options: 'i' } }
        ]
      }
    };
    
    return this.find(searchQuery);
  }
  
  /**
   * Find breeds by group
   */
  async findByGroup(group: string): Promise<Breed[]> {
    return this.find({
      selector: { group: { $eq: group } }
    });
  }
  
  /**
   * Find breeds by size
   */
  async findBySize(size: 'small' | 'medium' | 'large' | 'giant'): Promise<Breed[]> {
    return this.find({
      selector: { size: { $eq: size } }
    });
  }
  
  /**
   * Find breeds with specific traits
   */
  async findByTraits(traits: string[]): Promise<Breed[]> {
    return this.find({
      selector: {
        traits: { $in: traits }
      }
    });
  }
  
  /**
   * Get breed recommendations based on criteria
   */
  async getRecommendations(criteria: {
    size?: string;
    temperament?: string[];
    livingSpace?: 'apartment' | 'house' | 'farm';
  }): Promise<Breed[]> {
    const query: any = { selector: { $and: [] } };
    
    if (criteria.size) {
      query.selector.$and.push({ size: criteria.size });
    }
    
    if (criteria.temperament?.length) {
      query.selector.$and.push({
        temperament: { $in: criteria.temperament }
      });
    }
    
    if (criteria.livingSpace === 'apartment') {
      query.selector.$and.push({
        size: { $in: ['small', 'medium'] }
      });
    }
    
    return query.selector.$and.length > 0 
      ? this.find(query)
      : this.find();
  }
  
  /**
   * Import breeds from external source
   */
  async importBreeds(breeds: Partial<Breed>[]): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const breedsWithDefaults = breeds.map(breed => ({
      id: breed.id || `breed-${Date.now()}-${Math.random()}`,
      name: breed.name || 'Unknown Breed',
      createdAt: breed.createdAt || timestamp,
      updatedAt: breed.updatedAt || timestamp,
      ...breed
    }));
    
    await this.insert(breedsWithDefaults as Breed[]);
  }
}

/**
 * Factory function to create BreedService
 */
export function createBreedService(collection: RxCollection<Breed>): BreedService {
  return new BreedService(collection);
}