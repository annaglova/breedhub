/**
 * usePedigree - Hook for loading pedigree tree from JSONB field
 *
 * Reads the pedigree JSONB from the pet entity (pre-computed on the server),
 * fetches ancestor pet data in batch, and builds the tree structure.
 *
 * @example
 * ```tsx
 * const { father, mother, isLoading } = usePedigree({
 *   pedigree: pet.pedigree,
 *   enabled: !!pet.id
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { spaceStore } from '../stores/space-store.signal-store';
import type { PedigreePet, PedigreeResult } from '../stores/space-store.signal-store';

export interface UsePedigreeOptions {
  /** Pedigree JSONB from pet entity */
  pedigree: Record<string, { id: string; bid: string }> | null | undefined;
  /** Enable/disable loading */
  enabled?: boolean;
}

export interface UsePedigreeResult {
  /** Father's pedigree tree */
  father?: PedigreePet;
  /** Mother's pedigree tree */
  mother?: PedigreePet;
  /** Ancestor count */
  ancestorCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}

export function usePedigree({
  pedigree,
  enabled = true,
}: UsePedigreeOptions): UsePedigreeResult {
  const [result, setResult] = useState<PedigreeResult>({ ancestors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadPedigree = useCallback(async () => {
    // Skip if disabled or no pedigree data
    if (!enabled || !pedigree || Object.keys(pedigree).length === 0) {
      setResult({ ancestors: [] });
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) return;

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

      const pedigreeResult = await spaceStore.loadPedigreeFromJsonb(pedigree);

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
  }, [pedigree, enabled]);

  // Load on mount and when pedigree changes
  useEffect(() => {
    mountedRef.current = true;
    loadPedigree();

    return () => {
      mountedRef.current = false;
    };
  }, [loadPedigree]);

  return {
    father: result.father,
    mother: result.mother,
    ancestorCount: result.ancestors.length,
    isLoading,
    error,
  };
}
