import { Sex, PetStatus, VerificationStatus } from './common';

export interface Pet {
  id: string;
  name: string;
  breed_id: string;
  kennel_id?: string;
  owner_id: string;
  sex: Sex;
  birth_date: Date;
  status: PetStatus;
  photo_url?: string;
  verification_status: VerificationStatus;
  achievements?: string[];
  health_tests?: any[];
  pedigree?: any;
}

export interface PetWithPlugins extends Pet {
  Id: string;
  Name: string;
  AvatarUrl?: string;
  BreedName?: string;
  KennelName?: string;
  OwnerName?: string;
  Age?: number;
  Services?: string[];
  Rating?: number;
  IsChampion?: boolean;
}