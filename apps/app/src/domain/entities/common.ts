/**
 * Базові типи для всіх сутностей системи
 * Мігровано з Angular entity/config
 */

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  modified_by?: string;
}

// Enum типи для статусів та категорій
export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
}

export enum PetStatus {
  ACTIVE = 'active',
  DECEASED = 'deceased',
  SOLD = 'sold',
  MISSING = 'missing',
  RETIRED = 'retired',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum LitterStatus {
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  BORN = 'born',
  REGISTERED = 'registered',
  COMPLETED = 'completed',
}

export enum AccountType {
  KENNEL = 'kennel',
  CLUB = 'club',
  FEDERATION = 'federation',
  INDIVIDUAL = 'individual',
}

export enum EventType {
  SHOW = 'show',
  COMPETITION = 'competition',
  EXAM = 'exam',
  MEETING = 'meeting',
  EXHIBITION = 'exhibition',
}

export enum EventStatus {
  PLANNED = 'planned',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Lookup типи для довідників
export interface LookupValue {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface Country extends LookupValue {
  code: string; // ISO country code
  flag_url?: string;
}

export interface PetType extends LookupValue {
  // dog, cat, bird, etc.
}

export interface BreedCategory extends LookupValue {
  pet_type_id: string;
}

export interface CoatType extends LookupValue {
  // short, long, curly, etc.
}

export interface CoatColor extends LookupValue {
  hex_color?: string;
}

export interface PetSize extends LookupValue {
  // toy, small, medium, large, giant
  min_weight?: number;
  max_weight?: number;
  min_height?: number;
  max_height?: number;
}