import { z } from 'zod';
import { BaseEntity, Sex, PetStatus, VerificationStatus } from './common';

/**
 * Pet (Тварина) - центральна сутність системи
 * Мігровано з Angular Pet_Schema
 */
export interface Pet extends BaseEntity {
  // Основна інформація
  name: string;
  call_name?: string;
  notes?: string;
  
  // Дати
  date_of_birth?: string;
  date_of_death?: string;
  
  // Основні характеристики
  sex: Sex;
  pet_type_id: string;
  breed_id: string;
  breed_division_id?: string;
  
  // Родовідні зв'язки
  father_id?: string;
  mother_id?: string;
  litter_id?: string;
  
  // Власність
  owner_id: string;
  breeder_id?: string;
  kennel_id?: string;
  owner_kennel_id?: string;
  
  // Фізичні характеристики
  coat_type_id?: string;
  coat_color_id?: string;
  size_id?: string;
  body_feature_id?: string;
  weight?: number;
  
  // Географія
  country_of_birth_id?: string;
  country_of_stay_id?: string;
  
  // Статуси та рейтинги
  status: PetStatus;
  verification_status: VerificationStatus;
  is_public: boolean;
  rating?: number;
  rating_placement_in_breed?: number;
  
  // Генетика
  coi?: number; // Coefficient of Inbreeding
  inbreeding_percent?: number;
  
  // Медіа
  avatar_url?: string;
  cover_id?: string;
  
  // Титули та досягнення
  titles?: string;
  trim_titles?: string;
  
  // Метадані
  url?: string;
  public_data_id?: string;
  
  // Розширені поля для React
  available_for_sale?: boolean;
  has_notes?: boolean;
}

/**
 * Zod схема для валідації Pet
 */
export const PetSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  call_name: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  
  date_of_birth: z.string().optional(),
  date_of_death: z.string().optional(),
  
  sex: z.nativeEnum(Sex),
  pet_type_id: z.string().uuid('Pet type is required'),
  breed_id: z.string().uuid('Breed is required'),
  breed_division_id: z.string().uuid().optional(),
  
  father_id: z.string().uuid().optional(),
  mother_id: z.string().uuid().optional(),
  litter_id: z.string().uuid().optional(),
  
  owner_id: z.string().uuid('Owner is required'),
  breeder_id: z.string().uuid().optional(),
  kennel_id: z.string().uuid().optional(),
  owner_kennel_id: z.string().uuid().optional(),
  
  coat_type_id: z.string().uuid().optional(),
  coat_color_id: z.string().uuid().optional(),
  size_id: z.string().uuid().optional(),
  body_feature_id: z.string().uuid().optional(),
  weight: z.number().positive().optional(),
  
  country_of_birth_id: z.string().uuid().optional(),
  country_of_stay_id: z.string().uuid().optional(),
  
  status: z.nativeEnum(PetStatus).default(PetStatus.ACTIVE),
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  is_public: z.boolean().default(true),
  rating: z.number().min(0).max(100).optional(),
  rating_placement_in_breed: z.number().positive().optional(),
  
  coi: z.number().min(0).max(100).optional(),
  inbreeding_percent: z.number().min(0).max(100).optional(),
  
  avatar_url: z.string().url().optional(),
  cover_id: z.string().uuid().optional(),
  
  titles: z.string().max(500).optional(),
  trim_titles: z.string().max(200).optional(),
  
  url: z.string().max(200).optional(),
  public_data_id: z.string().uuid().optional(),
  
  available_for_sale: z.boolean().optional(),
  has_notes: z.boolean().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type PetFormData = z.infer<typeof PetSchema>;
export type PetCreateData = Omit<PetFormData, 'id' | 'created_at' | 'updated_at'>;
export type PetUpdateData = Partial<PetCreateData> & { id: string };

/**
 * Розширений тип Pet з пов'язаними сутностями (для відображення)
 */
export interface PetWithRelations extends Pet {
  // Пов'язані сутності
  father?: Pet;
  mother?: Pet;
  children?: Pet[];
  litter?: any; // Litter type - imported to avoid circular dependency
  breed?: any; // буде визначено в breed.ts
  owner?: any; // буде визначено в contact.ts
  breeder?: any;
  kennel?: any; // буде визначено в account.ts
  
  // Lookup values
  pet_type?: any;
  coat_type?: any;
  coat_color?: any;
  size?: any;
  country_of_birth?: any;
  country_of_stay?: any;
  
  // Обчислені поля
  age?: string;
  pedigree_depth?: number;
  offspring_count?: number;
}

/**
 * Утиліти для роботи з Pet
 */
export const PetUtils = {
  /**
   * Обчислити вік тварини
   */
  calculateAge(dateOfBirth: string, dateOfDeath?: string): string {
    const birth = new Date(dateOfBirth);
    const end = dateOfDeath ? new Date(dateOfDeath) : new Date();
    
    const ageInMs = end.getTime() - birth.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 30) {
      return `${ageInDays} days`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInDays / 365);
      const remainingMonths = Math.floor((ageInDays % 365) / 30);
      if (remainingMonths > 0) {
        return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
      }
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  },

  /**
   * Генерувати URL для тварини
   */
  generateUrl(pet: Pet): string {
    const namePart = pet.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/pets/${pet.id}/${namePart}`;
  },

  /**
   * Перевірити чи є тварина живою
   */
  isAlive(pet: Pet): boolean {
    return !pet.date_of_death && pet.status !== PetStatus.DECEASED;
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
};