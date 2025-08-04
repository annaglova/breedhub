import { VerificationStatus } from './common';

export interface Kennel {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  established_date?: Date;
  verification_status: VerificationStatus;
  specialization?: string[];
  achievements?: string[];
}

export interface KennelWithPlugins extends Kennel {
  Id: string;
  Name: string;
  LogoUrl?: string;
  OwnerName?: string;
  PetCount?: number;
  LitterCount?: number;
  Rating?: number;
  YearsActive?: number;
  Breeds?: string[];
}