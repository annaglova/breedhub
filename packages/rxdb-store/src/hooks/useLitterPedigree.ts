/**
 * useLitterPedigree - Hook for loading litter pedigree from parent pets
 *
 * Loads father and mother pets, then uses their pedigree JSONB to build
 * the litter's ancestry tree. Uses partition pruning via breed_id.
 *
 * @example
 * ```tsx
 * const { father, mother, isLoading } = useLitterPedigree({
 *   fatherId: litter.father_id,
 *   fatherBreedId: litter.father_breed_id,
 *   motherId: litter.mother_id,
 *   motherBreedId: litter.mother_breed_id,
 *   enabled: !!litter.id
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { spaceStore } from '../stores/space-store.signal-store';
import type { PedigreePet, PedigreeResult } from '../stores/space-store.signal-store';
import { supabase } from '../supabase/client';
import { dictionaryStore } from '../stores/dictionary-store.signal-store';

export interface UseLitterPedigreeOptions {
  /** Father pet ID */
  fatherId: string | null | undefined;
  /** Father's breed ID (for partition pruning) */
  fatherBreedId: string | null | undefined;
  /** Mother pet ID */
  motherId: string | null | undefined;
  /** Mother's breed ID (for partition pruning) */
  motherBreedId: string | null | undefined;
  /** Enable/disable loading */
  enabled?: boolean;
}

export interface UseLitterPedigreeResult {
  /** Father's pedigree tree (father pet + his ancestors) */
  father?: PedigreePet;
  /** Mother's pedigree tree (mother pet + her ancestors) */
  mother?: PedigreePet;
  /** Total ancestor count */
  ancestorCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}

/**
 * Build PedigreePet from raw pet data with sex/country codes
 */
async function buildPedigreePetFromRaw(
  pet: any,
  ancestors?: { father?: PedigreePet; mother?: PedigreePet }
): Promise<PedigreePet> {
  // Resolve sex and country codes
  const [sex, country] = await Promise.all([
    pet.sex_id ? dictionaryStore.getRecordById('sex', pet.sex_id) : null,
    pet.country_of_birth_id ? dictionaryStore.getRecordById('country', pet.country_of_birth_id) : null,
  ]);

  return {
    id: pet.id,
    name: pet.name,
    slug: pet.slug || undefined,
    breedId: pet.breed_id,
    dateOfBirth: pet.date_of_birth || undefined,
    titles: pet.titles || undefined,
    avatarUrl: pet.avatar_url || undefined,
    sex: sex ? { code: String(sex.code) } : undefined,
    countryOfBirth: country ? { code: String(country.code) } : undefined,
    father: ancestors?.father,
    mother: ancestors?.mother,
  };
}

export function useLitterPedigree({
  fatherId,
  fatherBreedId,
  motherId,
  motherBreedId,
  enabled = true,
}: UseLitterPedigreeOptions): UseLitterPedigreeResult {
  const [result, setResult] = useState<{ father?: PedigreePet; mother?: PedigreePet; ancestorCount: number }>({
    ancestorCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadPedigree = useCallback(async () => {
    // Skip if disabled or no parent IDs
    if (!enabled || (!fatherId && !motherId)) {
      setResult({ ancestorCount: 0 });
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

      // Ensure dictionaryStore is initialized
      if (!dictionaryStore.initialized.value) {
        await dictionaryStore.initialize();
      }

      let fatherPet: any = null;
      let motherPet: any = null;
      let totalAncestorCount = 0;

      // ID-First: Check RxDB cache for parent pets first
      const petCollection = spaceStore.db?.collections['pet'];
      const cachedPets = new Map<string, any>();

      if (petCollection) {
        const idsToCheck = [fatherId, motherId].filter(Boolean) as string[];
        if (idsToCheck.length > 0) {
          const cached = await petCollection.find({
            selector: { id: { $in: idsToCheck } }
          }).exec();
          for (const doc of cached) {
            const pet = doc.toJSON();
            cachedPets.set(pet.id, pet);
          }
          console.log(`[useLitterPedigree] Cache check: ${cachedPets.size}/${idsToCheck.length} parents in RxDB`);
        }
      }

      // Load father pet (from cache or Supabase with partition pruning)
      if (fatherId && fatherBreedId) {
        if (cachedPets.has(fatherId)) {
          fatherPet = cachedPets.get(fatherId);
        } else {
          const { data, error: fetchError } = await supabase
            .from('pet')
            .select('*')
            .eq('breed_id', fatherBreedId)
            .eq('id', fatherId)
            .single();

          if (fetchError) {
            console.error('[useLitterPedigree] Failed to load father:', fetchError);
          } else {
            fatherPet = data;
            // Cache in RxDB
            if (petCollection && data) {
              await petCollection.upsert(spaceStore.mapToRxDBFormat(data, 'pet'));
            }
          }
        }
      }

      // Load mother pet (from cache or Supabase with partition pruning)
      if (motherId && motherBreedId) {
        if (cachedPets.has(motherId)) {
          motherPet = cachedPets.get(motherId);
        } else {
          const { data, error: fetchError } = await supabase
            .from('pet')
            .select('*')
            .eq('breed_id', motherBreedId)
            .eq('id', motherId)
            .single();

          if (fetchError) {
            console.error('[useLitterPedigree] Failed to load mother:', fetchError);
          } else {
            motherPet = data;
            // Cache in RxDB
            if (petCollection && data) {
              await petCollection.upsert(spaceStore.mapToRxDBFormat(data, 'pet'));
            }
          }
        }
      }

      // Load father's pedigree (his ancestors become ff, fm, fff, etc.)
      let fatherAncestors: { father?: PedigreePet; mother?: PedigreePet } = {};
      if (fatherPet?.pedigree && Object.keys(fatherPet.pedigree).length > 0) {
        const pedigreeResult = await spaceStore.loadPedigreeFromJsonb(fatherPet.pedigree);
        fatherAncestors = {
          father: pedigreeResult.father,
          mother: pedigreeResult.mother,
        };
        totalAncestorCount += pedigreeResult.ancestors.length;
      }

      // Load mother's pedigree (her ancestors become mf, mm, mff, etc.)
      let motherAncestors: { father?: PedigreePet; mother?: PedigreePet } = {};
      if (motherPet?.pedigree && Object.keys(motherPet.pedigree).length > 0) {
        const pedigreeResult = await spaceStore.loadPedigreeFromJsonb(motherPet.pedigree);
        motherAncestors = {
          father: pedigreeResult.father,
          mother: pedigreeResult.mother,
        };
        totalAncestorCount += pedigreeResult.ancestors.length;
      }

      // Build the litter pedigree tree
      let father: PedigreePet | undefined;
      let mother: PedigreePet | undefined;

      if (fatherPet) {
        father = await buildPedigreePetFromRaw(fatherPet, fatherAncestors);
        totalAncestorCount++; // Count father himself
      }

      if (motherPet) {
        mother = await buildPedigreePetFromRaw(motherPet, motherAncestors);
        totalAncestorCount++; // Count mother herself
      }

      if (mountedRef.current) {
        setResult({
          father,
          mother,
          ancestorCount: totalAncestorCount,
        });
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[useLitterPedigree] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [fatherId, fatherBreedId, motherId, motherBreedId, enabled]);

  // Load on mount and when parent IDs change
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
    ancestorCount: result.ancestorCount,
    isLoading,
    error,
  };
}
