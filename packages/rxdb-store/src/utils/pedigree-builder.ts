/**
 * Build initial pedigree JSONB client-side.
 * Mirrors the server-side build_pet_pedigree() PL/pgSQL function.
 *
 * Takes parent pedigrees from RxDB cache and constructs
 * the new pet's pedigree by prefixing keys with 'f'/'m'.
 */

const MAX_KEY_LENGTH = 7; // Max 7 generations

interface PedigreeEntry {
  id: string;
  bid: string; // breed_id
}

type PedigreeJsonb = Record<string, PedigreeEntry>;

/**
 * Build pedigree for a new pet from parent data.
 *
 * @param fatherId - Father pet UUID
 * @param fatherBreedId - Father breed UUID
 * @param fatherPedigree - Father's pedigree JSONB (from RxDB cache)
 * @param motherId - Mother pet UUID
 * @param motherBreedId - Mother breed UUID
 * @param motherPedigree - Mother's pedigree JSONB (from RxDB cache)
 * @returns Pedigree JSONB for the new pet
 */
export function buildInitialPedigree(
  fatherId?: string,
  fatherBreedId?: string,
  fatherPedigree?: PedigreeJsonb | null,
  motherId?: string,
  motherBreedId?: string,
  motherPedigree?: PedigreeJsonb | null,
): PedigreeJsonb {
  const result: PedigreeJsonb = {};

  // Add father
  if (fatherId && fatherBreedId) {
    result['f'] = { id: fatherId, bid: fatherBreedId };

    // Shift father's pedigree keys (add 'f' prefix)
    if (fatherPedigree) {
      for (const [key, value] of Object.entries(fatherPedigree)) {
        const newKey = 'f' + key;
        if (newKey.length <= MAX_KEY_LENGTH) {
          result[newKey] = value;
        }
      }
    }
  }

  // Add mother
  if (motherId && motherBreedId) {
    result['m'] = { id: motherId, bid: motherBreedId };

    // Shift mother's pedigree keys (add 'm' prefix)
    if (motherPedigree) {
      for (const [key, value] of Object.entries(motherPedigree)) {
        const newKey = 'm' + key;
        if (newKey.length <= MAX_KEY_LENGTH) {
          result[newKey] = value;
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : {};
}
