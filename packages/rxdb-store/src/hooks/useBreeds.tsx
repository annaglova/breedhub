import { useState, useEffect, useCallback } from 'react';
import { Subscription } from 'rxjs';
import { MangoQuery } from 'rxdb';
import { databaseService } from '../services/database.service';
import { BreedDocument, BreedDocType, BreedCollection } from '../types/breed.types';

export interface UseBreedsOptions {
  query?: MangoQuery<BreedDocType>;
  sort?: keyof BreedDocType | { [K in keyof BreedDocType]?: 'asc' | 'desc' };
  limit?: number;
  skip?: number;
  workspaceId?: string;
  spaceId?: string;
}

export interface UseBreedsResult {
  breeds: BreedDocument[];
  loading: boolean;
  error: Error | null;
  collection: BreedCollection | null;
  refresh: () => Promise<void>;
  addBreed: (breed: Partial<BreedDocType>) => Promise<BreedDocument>;
  updateBreed: (id: string, updates: Partial<BreedDocType>) => Promise<void>;
  deleteBreed: (id: string) => Promise<void>;
  searchBreeds: (query: string) => Promise<BreedDocument[]>;
}

export function useBreeds(options: UseBreedsOptions = {}): UseBreedsResult {
  const [breeds, setBreeds] = useState<BreedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [collection, setCollection] = useState<BreedCollection | null>(null);

  // Build query from options
  const buildQuery = useCallback(() => {
    let query: any = options.query || {};
    
    // Ensure selector exists and _deleted is false
    if (!query.selector) {
      query.selector = {};
    }
    query.selector._deleted = { $eq: false };

    // Add workspace/space filters
    if (options.workspaceId) {
      query.selector.workspaceId = options.workspaceId;
    }
    if (options.spaceId) {
      query.selector.spaceId = options.spaceId;
    }

    // Add sort - always provide a sort to avoid undefined
    if (options.sort) {
      if (typeof options.sort === 'string') {
        query.sort = [{ [options.sort]: 'asc' }, { id: 'asc' }];
      } else {
        query.sort = [options.sort, { id: 'asc' }];
      }
    } else {
      // Default sort
      query.sort = [{ name: 'asc' }, { id: 'asc' }];
    }

    // Add pagination - only add if explicitly set
    if (typeof options.limit === 'number' && options.limit > 0) {
      query.limit = options.limit;
    }
    // Always set skip to avoid undefined
    query.skip = (typeof options.skip === 'number' && options.skip >= 0) ? options.skip : 0;

    return query;
  }, [options]);

  // Load collection and subscribe to changes
  useEffect(() => {
    let subscription: Subscription | null = null;
    let mounted = true;

    const loadBreeds = async () => {
      try {
        setLoading(true);
        setError(null);

        const db = await databaseService.getDatabase();
        const breedsCollection = db.breeds;
        
        if (mounted) {
          setCollection(breedsCollection);

          // Build and execute query
          const query = buildQuery();
          const queryBuilder = breedsCollection.find(query);

          // Subscribe to changes
          subscription = queryBuilder.$.subscribe({
            next: (documents) => {
              if (mounted) {
                setBreeds(documents);
                setLoading(false);
              }
            },
            error: (err) => {
              if (mounted) {
                setError(err);
                setLoading(false);
              }
            }
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadBreeds();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [buildQuery]);

  // CRUD operations
  const addBreed = useCallback(async (breedData: Partial<BreedDocType>): Promise<BreedDocument> => {
    if (!collection) throw new Error('Collection not initialized');

    const breed: BreedDocType = {
      id: breedData.id || `breed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: breedData.name || '',
      description: breedData.description,
      origin: breedData.origin,
      size: breedData.size || 'medium',
      lifespan: breedData.lifespan,
      traits: breedData.traits || [],
      colors: breedData.colors || [],
      image: breedData.image,
      workspaceId: breedData.workspaceId || options.workspaceId,
      spaceId: breedData.spaceId || options.spaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _deleted: false
    };

    return await collection.insert(breed);
  }, [collection, options.workspaceId, options.spaceId]);

  const updateBreed = useCallback(async (id: string, updates: Partial<BreedDocType>): Promise<void> => {
    if (!collection) throw new Error('Collection not initialized');

    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Breed with id ${id} not found`);

    await doc.update({
      $set: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  }, [collection]);

  const deleteBreed = useCallback(async (id: string): Promise<void> => {
    if (!collection) throw new Error('Collection not initialized');

    const doc = await collection.findOne(id).exec();
    if (!doc) throw new Error(`Breed with id ${id} not found`);

    // Soft delete
    await doc.update({
      $set: {
        _deleted: true,
        updatedAt: new Date().toISOString()
      }
    });
  }, [collection]);

  const searchBreeds = useCallback(async (searchQuery: string): Promise<BreedDocument[]> => {
    if (!collection) return [];

    return await collection.find({
      selector: {
        $or: [
          { name: { $regex: new RegExp(searchQuery, 'i') } },
          { description: { $regex: new RegExp(searchQuery, 'i') } },
          { origin: { $regex: new RegExp(searchQuery, 'i') } }
        ]
      }
    }).exec();
  }, [collection]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!collection) return;
    
    // Force re-query
    const query = buildQuery();
    const documents = await collection.find(query).exec();
    setBreeds(documents);
  }, [collection, buildQuery]);

  return {
    breeds,
    loading,
    error,
    collection,
    refresh,
    addBreed,
    updateBreed,
    deleteBreed,
    searchBreeds
  };
}