import type { SexCode } from "@/components/shared/PetSexMark";

/**
 * Pedigree pet data
 */
export interface PedigreePet {
  id: string;
  name: string;
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
  father?: PedigreePet;
  mother?: PedigreePet;
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
