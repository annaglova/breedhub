import { z } from 'zod';
import { BaseEntity, VerificationStatus } from './common';

/**
 * Kennel (Розплідник) - сутність для управління розплідниками
 * Мігровано з Angular Kennel_Schema
 */
export interface Kennel extends BaseEntity {
  // Основна інформація
  name: string;
  prefix?: string; // Префікс розплідника для імен тварин
  suffix?: string; // Суфікс розплідника
  display_name?: string;
  description?: string;
  
  // Зв'язки з організацією
  account_id?: string; // Зв'язок з акаунтом якщо розплідник є частиною організації
  owner_contact_id: string;
  co_owners?: string[]; // Contact IDs співвласників
  
  // Спеціалізація
  breed_specializations: string[]; // Breed IDs
  pet_type_id?: string; // Основний тип тварин
  breeding_philosophy?: string;
  
  // Контактна інформація
  email?: string;
  phone?: string;
  website?: string;
  
  // Адреса
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_id?: string;
  
  // Професійна інформація
  established_year?: number;
  registration_number?: string;
  license_number?: string;
  certifications?: string[];
  kennel_club_memberships?: string[];
  
  // Статус та верифікація
  is_active: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  is_public: boolean;
  
  // Медіа та брендинг
  avatar_url?: string;
  cover_id?: string;
  logo_url?: string;
  gallery_images?: string[];
  
  // Рейтинг та статистика
  rating?: number;
  review_count?: number;
  pet_count?: number;
  litter_count?: number;
  champion_count?: number;
  
  // Фінансова інформація (для продажу)
  accepts_stud_services: boolean;
  stud_fee_range?: { min: number; max: number };
  accepts_breeding_contracts: boolean;
  
  // Соціальні мережі
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  
  // Налаштування
  timezone_id?: string;
  language_id?: string;
  
  // Метадані
  notes?: string;
  tags?: string[];
  achievements?: string[];
  
  // Практичні деталі
  visiting_hours?: string;
  appointment_required: boolean;
  facilities?: string[];
  health_testing?: string[];
  
  public_data_id?: string;
}

/**
 * Zod схема для валідації Kennel
 */
export const KennelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Kennel name is required').max(200),
  prefix: z.string().max(50).optional(),
  suffix: z.string().max(50).optional(),
  display_name: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  
  account_id: z.string().uuid().optional(),
  owner_contact_id: z.string().uuid('Owner is required'),
  co_owners: z.array(z.string().uuid()).optional(),
  
  breed_specializations: z.array(z.string().uuid()).min(1, 'At least one breed specialization is required'),
  pet_type_id: z.string().uuid().optional(),
  breeding_philosophy: z.string().max(1000).optional(),
  
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country_id: z.string().uuid().optional(),
  
  established_year: z.number().min(1800).max(new Date().getFullYear()).optional(),
  registration_number: z.string().max(100).optional(),
  license_number: z.string().max(100).optional(),
  certifications: z.array(z.string()).optional(),
  kennel_club_memberships: z.array(z.string()).optional(),
  
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  is_public: z.boolean().default(true),
  
  avatar_url: z.string().url().optional(),
  cover_id: z.string().uuid().optional(),
  logo_url: z.string().url().optional(),
  gallery_images: z.array(z.string().url()).optional(),
  
  rating: z.number().min(0).max(100).optional(),
  review_count: z.number().min(0).default(0),
  pet_count: z.number().min(0).default(0),
  litter_count: z.number().min(0).default(0),
  champion_count: z.number().min(0).default(0),
  
  accepts_stud_services: z.boolean().default(false),
  stud_fee_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  accepts_breeding_contracts: z.boolean().default(false),
  
  facebook: z.string().max(200).optional(),
  instagram: z.string().max(200).optional(),
  twitter: z.string().max(200).optional(),
  youtube: z.string().max(200).optional(),
  
  timezone_id: z.string().uuid().optional(),
  language_id: z.string().uuid().optional(),
  
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  
  visiting_hours: z.string().max(200).optional(),
  appointment_required: z.boolean().default(true),
  facilities: z.array(z.string()).optional(),
  health_testing: z.array(z.string()).optional(),
  
  public_data_id: z.string().uuid().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type KennelFormData = z.infer<typeof KennelSchema>;
export type KennelCreateData = Omit<KennelFormData, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count' | 'pet_count' | 'litter_count' | 'champion_count'>;
export type KennelUpdateData = Partial<KennelCreateData> & { id: string };

/**
 * Розширений тип Kennel з пов'язаними сутностями
 */
export interface KennelWithRelations extends Kennel {
  // Пов'язані сутності
  account?: any; // Account
  owner?: any; // Contact
  co_owners_data?: any[]; // Contact[]
  breeds?: any[]; // Breed[]
  pet_type?: any; // PetType
  country?: any; // Country
  
  // Тварини та виводки
  pets?: any[]; // Pet[]
  litters?: any[]; // Litter[]
  stud_dogs?: any[]; // Pet[] (male pets available for stud)
  brood_bitches?: any[]; // Pet[] (female pets for breeding)
  
  // Досягнення
  champions?: any[]; // Pet[] champions
  awards?: any[]; // Award[]
  
  // Обчислені поля
  years_established?: number;
  success_rate?: number;
  average_litter_size?: number;
  champion_percentage?: number;
}

/**
 * Kennel Review (Відгук про розплідник)
 */
export interface KennelReview extends BaseEntity {
  kennel_id: string;
  reviewer_contact_id: string;
  rating: number; // 1-100
  title?: string;
  content: string;
  purchase_type?: 'pet' | 'breeding_rights' | 'stud_service';
  would_recommend: boolean;
  is_verified_purchase: boolean;
  response?: string; // Відповідь власника розплідника
  response_date?: string;
  is_public: boolean;
}

export const KennelReviewSchema = z.object({
  id: z.string().uuid().optional(),
  kennel_id: z.string().uuid('Kennel is required'),
  reviewer_contact_id: z.string().uuid('Reviewer is required'),
  rating: z.number().min(1).max(100),
  title: z.string().max(200).optional(),
  content: z.string().min(10, 'Review must be at least 10 characters').max(2000),
  purchase_type: z.enum(['pet', 'breeding_rights', 'stud_service']).optional(),
  would_recommend: z.boolean(),
  is_verified_purchase: z.boolean().default(false),
  response: z.string().max(1000).optional(),
  response_date: z.string().optional(),
  is_public: z.boolean().default(true),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Kennel Breeding Program (Програма розведення розплідника)
 */
export interface KennelBreedingProgram extends BaseEntity {
  kennel_id: string;
  breed_id: string;
  program_name: string;
  description?: string;
  goals: string[];
  breeding_lines?: string[];
  health_testing_requirements: string[];
  is_active: boolean;
}

/**
 * Утиліти для роботи з Kennel
 */
export const KennelUtils = {
  /**
   * Генерувати URL для розплідника
   */
  generateUrl(kennel: Kennel): string {
    const namePart = kennel.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/kennels/${kennel.id}/${namePart}`;
  },

  /**
   * Сформувати повне ім'я з префіксом
   */
  formatPetName(petName: string, kennel: Kennel): string {
    const parts: string[] = [];
    
    if (kennel.prefix) parts.push(kennel.prefix);
    parts.push(petName);
    if (kennel.suffix) parts.push(kennel.suffix);
    
    return parts.join(' ');
  },

  /**
   * Отримати роки роботи
   */
  getYearsEstablished(kennel: Kennel): number {
    if (!kennel.established_year) return 0;
    return new Date().getFullYear() - kennel.established_year;
  },

  /**
   * Обчислити відсоток чемпіонів
   */
  calculateChampionPercentage(kennel: Kennel): number {
    if (!kennel.pet_count || kennel.pet_count === 0) return 0;
    return Math.round(((kennel.champion_count || 0) / kennel.pet_count) * 100);
  },

  /**
   * Отримати статус верифікації як текст
   */
  getVerificationStatusText(status: VerificationStatus): string {
    const statusMap = {
      [VerificationStatus.UNVERIFIED]: 'Unverified',
      [VerificationStatus.PENDING]: 'Pending Verification',
      [VerificationStatus.VERIFIED]: 'Verified',
      [VerificationStatus.REJECTED]: 'Verification Rejected',
    };
    return statusMap[status];
  },

  /**
   * Перевірити чи надає розплідник племінні послуги
   */
  providesBreedingServices(kennel: Kennel): boolean {
    return kennel.accepts_stud_services || kennel.accepts_breeding_contracts;
  },

  /**
   * Отримати діапазон вартості племінних послуг
   */
  getStudFeeRange(kennel: Kennel): string {
    if (!kennel.stud_fee_range) return 'Not available';
    
    const { min, max } = kennel.stud_fee_range;
    if (min === max) return `$${min}`;
    return `$${min} - $${max}`;
  },

  /**
   * Перевірити чи є розплідник досвідченим
   */
  isExperienced(kennel: Kennel): boolean {
    const yearsEstablished = this.getYearsEstablished(kennel);
    const hasMultipleLitters = (kennel.litter_count || 0) >= 5;
    const hasChampions = (kennel.champion_count || 0) > 0;
    
    return yearsEstablished >= 5 && hasMultipleLitters && hasChampions;
  },

  /**
   * Отримати рейтинг довіри
   */
  getTrustRating(kennel: Kennel): 'low' | 'medium' | 'high' | 'excellent' {
    const isVerified = kennel.verification_status === VerificationStatus.VERIFIED;
    const hasGoodRating = (kennel.rating || 0) >= 75;
    const hasReviews = (kennel.review_count || 0) >= 10;
    const isExperienced = this.isExperienced(kennel);
    
    if (isVerified && hasGoodRating && hasReviews && isExperienced) return 'excellent';
    if (isVerified && hasGoodRating && hasReviews) return 'high';
    if (hasGoodRating && hasReviews) return 'medium';
    return 'low';
  },

  /**
   * Отримати контактну інформацію
   */
  getContactInfo(kennel: Kennel): string {
    const parts: string[] = [];
    
    if (kennel.email) parts.push(kennel.email);
    if (kennel.phone) parts.push(kennel.phone);
    if (kennel.website) parts.push(kennel.website);
    
    return parts.join(' • ');
  },

  /**
   * Отримати повну адресу
   */
  getFullAddress(kennel: Kennel): string {
    const parts: string[] = [];
    
    if (kennel.address) parts.push(kennel.address);
    if (kennel.city) parts.push(kennel.city);
    if (kennel.region) parts.push(kennel.region);
    if (kennel.postal_code) parts.push(kennel.postal_code);
    
    return parts.join(', ');
  },

  /**
   * Перевірити чи потрібна попередня домовленість
   */
  requiresAppointment(kennel: Kennel): boolean {
    return kennel.appointment_required;
  },

  /**
   * Отримати список спеціалізацій як текст
   */
  getSpecializationsText(kennel: KennelWithRelations): string {
    if (!kennel.breeds || kennel.breeds.length === 0) return 'No specializations';
    
    const breedNames = kennel.breeds.map((breed: any) => breed.name);
    if (breedNames.length <= 3) return breedNames.join(', ');
    
    return `${breedNames.slice(0, 3).join(', ')} and ${breedNames.length - 3} more`;
  },
};