/**
 * Specialized React hooks for Breeds collection
 * Provides high-level API for breed management
 */

import { useState, useEffect, useMemo } from 'react';
import { RxDocument } from 'rxdb';
import { useRxCollection, useRxData } from './useRxCollection';
import { BreedDocType } from '../schemas/breed.schema';
import { getDatabase } from '../database';

export interface UseBreedFilters {
  origin?: string;
  searchTerm?: string;
  traits?: string[];
  sortBy?: 'name' | 'origin' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Main hook for breeds management
 */
export function useBreeds(filters?: UseBreedFilters) {
  const [db, setDb] = useState<any>(null);
  
  useEffect(() => {
    getDatabase().then(setDb);
  }, []);
  
  // Build query from filters
  const query = useMemo(() => {
    const selector: any = {};
    
    if (filters?.origin) {
      selector.origin = filters.origin;
    }
    
    if (filters?.searchTerm) {
      selector.$or = [
        { name: { $regex: `.*${filters.searchTerm}.*`, $options: 'i' } },
        { description: { $regex: `.*${filters.searchTerm}.*`, $options: 'i' } }
      ];
    }
    
    if (filters?.traits && filters.traits.length > 0) {
      selector.traits = { $in: filters.traits };
    }
    
    const sort = filters?.sortBy 
      ? [{ [filters.sortBy]: filters.sortOrder || 'asc' }]
      : [{ name: 'asc' }];
    
    return {
      selector,
      sort,
      limit: filters?.limit
    };
  }, [filters]);
  
  // Get reactive data
  const { data: breeds, loading, error } = useRxData<BreedDocType>(
    db?.breeds,
    query
  );
  
  // CRUD operations
  const collection = useRxCollection<BreedDocType>('breeds');
  
  const addBreed = async (breed: Omit<BreedDocType, 'id' | 'created_at' | 'updated_at'>) => {
    const newBreed = {
      ...breed,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await collection.insert(newBreed as BreedDocType);
  };
  
  const updateBreed = async (id: string, changes: Partial<BreedDocType>) => {
    const updateData = {
      ...changes,
      updated_at: new Date().toISOString()
    };
    
    return await collection.update(id, updateData);
  };
  
  const deleteBreed = async (id: string) => {
    return await collection.remove(id);
  };
  
  // Computed values
  const breedCount = breeds.length;
  const origins = useMemo(() => {
    const uniqueOrigins = new Set(breeds.map(b => b.origin).filter(Boolean));
    return Array.from(uniqueOrigins).sort();
  }, [breeds]);
  
  const allTraits = useMemo(() => {
    const traitsSet = new Set<string>();
    breeds.forEach(breed => {
      breed.traits?.forEach(trait => traitsSet.add(trait));
    });
    return Array.from(traitsSet).sort();
  }, [breeds]);
  
  return {
    // Data
    breeds,
    loading,
    error,
    
    // CRUD operations
    addBreed,
    updateBreed,
    deleteBreed,
    
    // Computed values
    breedCount,
    origins,
    allTraits,
    
    // Collection reference
    collection: db?.breeds
  };
}

/**
 * Hook for single breed with real-time updates
 */
export function useBreed(breedId: string) {
  const [breed, setBreed] = useState<RxDocument<BreedDocType> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<any>(null);
  
  useEffect(() => {
    getDatabase().then(setDb);
  }, []);
  
  useEffect(() => {
    if (!db || !breedId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const subscription = db.breeds
      .findOne(breedId)
      .$.subscribe({
        next: (doc: RxDocument<BreedDocType> | null) => {
          setBreed(doc);
          setLoading(false);
        },
        error: (err: Error) => {
          setError(err);
          setLoading(false);
        }
      });
    
    return () => subscription.unsubscribe();
  }, [db, breedId]);
  
  const updateBreed = async (changes: Partial<BreedDocType>) => {
    if (!breed) throw new Error('Breed not loaded');
    
    const updateData = {
      ...changes,
      updated_at: new Date().toISOString()
    };
    
    return await breed.patch(updateData);
  };
  
  const deleteBreed = async () => {
    if (!breed) throw new Error('Breed not loaded');
    return await breed.remove();
  };
  
  return {
    breed: breed?.toJSON(),
    loading,
    error,
    updateBreed,
    deleteBreed
  };
}

/**
 * Hook for breed statistics
 */
export function useBreedStats() {
  const { breeds, loading } = useBreeds();
  
  const stats = useMemo(() => {
    if (loading || !breeds.length) {
      return {
        totalBreeds: 0,
        avgTraitsPerBreed: 0,
        mostCommonOrigin: null,
        newestBreed: null,
        oldestBreed: null
      };
    }
    
    // Calculate statistics
    const totalBreeds = breeds.length;
    
    const avgTraitsPerBreed = breeds.reduce((sum, breed) => 
      sum + (breed.traits?.length || 0), 0
    ) / totalBreeds;
    
    // Find most common origin
    const originCounts = breeds.reduce((acc, breed) => {
      if (breed.origin) {
        acc[breed.origin] = (acc[breed.origin] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonOrigin = Object.entries(originCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    
    // Find newest and oldest
    const sortedByDate = [...breeds].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return {
      totalBreeds,
      avgTraitsPerBreed: Math.round(avgTraitsPerBreed * 10) / 10,
      mostCommonOrigin,
      newestBreed: sortedByDate[sortedByDate.length - 1],
      oldestBreed: sortedByDate[0]
    };
  }, [breeds, loading]);
  
  return {
    stats,
    loading
  };
}

/**
 * Hook for breed search with debouncing
 */
export function useBreedSearch(initialSearchTerm = '') {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const { breeds, loading, error } = useBreeds({
    searchTerm: debouncedSearchTerm || undefined
  });
  
  return {
    breeds,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    isSearching: searchTerm !== debouncedSearchTerm
  };
}

// Helper function to generate unique IDs
function generateId(): string {
  return `breed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}