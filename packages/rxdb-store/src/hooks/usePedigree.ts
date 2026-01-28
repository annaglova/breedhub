/**
 * usePedigree - Hook for loading pedigree tree data
 *
 * Loads ancestors for both parents using RPC function `get_pedigree_ancestors`.
 * Caches pet data in RxDB for future lookups.
 * Returns tree structure ready for PedigreeTree component.
 *
 * @example
 * ```tsx
 * const { father, mother, isLoading, error, refetch } = usePedigree({
 *   fatherId: pet.father_id,
 *   fatherBreedId: pet.father_breed_id,
 *   motherId: pet.mother_id,
 *   motherBreedId: pet.mother_breed_id,
 *   depth: 5,
 *   enabled: !!pet.id
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { spaceStore } from '../stores/space-store.signal-store';
import type { PedigreePet, PedigreeResult } from '../stores/space-store.signal-store';

export interface UsePedigreeOptions {
  /** Father's pet ID (can be null if no father) */
  fatherId: string | null;
  /** Father's breed ID for partition pruning */
  fatherBreedId: string | null;
  /** Mother's pet ID (can be null if no mother) */
  motherId: string | null;
  /** Mother's breed ID for partition pruning */
  motherBreedId: string | null;
  /** Number of generations to load (2-7, default 7) */
  depth?: number;
  /** Enable/disable loading */
  enabled?: boolean;
}

export interface UsePedigreeResult {
  /** Father's pedigree tree */
  father?: PedigreePet;
  /** Mother's pedigree tree */
  mother?: PedigreePet;
  /** Raw ancestor data (for debugging/caching) */
  ancestors: any[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
}

export function usePedigree({
  fatherId,
  fatherBreedId,
  motherId,
  motherBreedId,
  depth = 7,
  enabled = true,
}: UsePedigreeOptions): UsePedigreeResult {
  const [result, setResult] = useState<PedigreeResult>({ ancestors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadPedigree = useCallback(async () => {
    // Skip if disabled or no parents
    if (!enabled || (!fatherId && !motherId)) {
      setResult({ ancestors: [] });
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Wait for SpaceStore initialization
      let retries = 20;
      while (!spaceStore.initialized.value && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }

      if (!spaceStore.initialized.value) {
        throw new Error('SpaceStore not initialized');
      }

      // Load pedigree via SpaceStore
      const pedigreeResult = await spaceStore.loadPedigree(
        fatherId,
        fatherBreedId,
        motherId,
        motherBreedId,
        depth
      );

      if (mountedRef.current) {
        setResult(pedigreeResult);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[usePedigree] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [fatherId, fatherBreedId, motherId, motherBreedId, depth, enabled]);

  // Load on mount and when params change
  useEffect(() => {
    mountedRef.current = true;
    loadPedigree();

    return () => {
      mountedRef.current = false;
    };
  }, [loadPedigree]);

  // Manual refetch
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    await loadPedigree();
  }, [loadPedigree]);

  return {
    father: result.father,
    mother: result.mother,
    ancestors: result.ancestors,
    isLoading,
    error,
    refetch,
  };
}
