import type { PedigreePet as StorePedigreePet } from "@breedhub/rxdb-store";
import type { SexCode } from "@/components/shared/PetSexMark";

/**
 * Pedigree pet data
 */
export interface PedigreePet {
  id: string;
  name: string;
  slug?: string;
  url?: string;
  sex?: {
    code?: SexCode;
    name?: string;
  };
  dateOfBirth?: string;
  countryOfBirth?: {
    code?: string;
    name?: string;
  };
  titles?: string;
  avatarUrl?: string;
  breedId?: string;
  petTypeId?: string;
  sexId?: string;
  father?: PedigreePet;
  mother?: PedigreePet;
}

export function normalizeSexCode(code?: string | null): SexCode {
  return code === "male" || code === "female" ? code : undefined;
}

export function normalizePedigreePet(
  pet?: StorePedigreePet | PedigreePet | null,
): PedigreePet | undefined {
  if (!pet) {
    return undefined;
  }

  return {
    id: pet.id,
    name: pet.name,
    slug: pet.slug,
    url: "url" in pet ? pet.url : undefined,
    dateOfBirth: pet.dateOfBirth,
    countryOfBirth: pet.countryOfBirth
      ? {
          code: pet.countryOfBirth.code,
          name: "name" in pet.countryOfBirth ? pet.countryOfBirth.name : undefined,
        }
      : undefined,
    titles: pet.titles,
    avatarUrl: pet.avatarUrl,
    breedId: pet.breedId,
    petTypeId: "petTypeId" in pet ? pet.petTypeId : undefined,
    sexId: "sexId" in pet ? pet.sexId : undefined,
    sex: pet.sex
      ? {
          code: normalizeSexCode(pet.sex.code),
          name: pet.sex.name,
        }
      : undefined,
    father: normalizePedigreePet(pet.father),
    mother: normalizePedigreePet(pet.mother),
  };
}

/**
 * Pedigree mode
 */
export type PedigreeMode = "pet" | "litter" | "mating";

/**
 * Generation options for display
 */
export const GENERATION_OPTIONS = [2, 3, 4, 5, 6, 7] as const;
export type GenerationCount = (typeof GENERATION_OPTIONS)[number];

/**
 * Callback for selecting a pet in mating mode
 */
export type OnSelectPetCallback = (sex: "male" | "female") => void;
