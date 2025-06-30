import { z } from 'zod';
import { BaseEntity, Sex, LitterStatus, VerificationStatus } from './common';

/**
 * Litter (Виводок) - сутність для управління виводками тварин
 * Мігровано з Angular Litter_Schema
 */
export interface Litter extends BaseEntity {
  // Основна інформація
  name: string;
  litter_number?: string;
  registration_number?: string;
  
  // Батьки
  father_id: string;
  mother_id: string;
  breed_id: string;
  
  // Дати
  planned_date?: string;
  mating_date?: string;
  birth_date?: string;
  registration_date?: string;
  
  // Статус та верифікація
  status: LitterStatus;
  verification_status: VerificationStatus;
  is_public: boolean;
  
  // Власність та організація
  breeder_id: string;
  kennel_id?: string;
  club_id?: string;
  
  // Статистика виводку
  expected_count?: number;
  actual_count?: number;
  male_count?: number;
  female_count?: number;
  alive_count?: number;
  
  // Фізичні характеристики
  average_birth_weight?: number;
  min_birth_weight?: number;
  max_birth_weight?: number;
  
  // Додаткова інформація
  notes?: string;
  breeding_notes?: string;
  health_notes?: string;
  
  // Медіа
  cover_id?: string;
  
  // Місце народження
  birth_location?: string;
  country_of_birth_id?: string;
  
  // Метадані
  tags?: string[];
  is_champion_bloodline: boolean;
  inbreeding_coefficient?: number;
}

/**
 * Zod схема для валідації Litter
 */
export const LitterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  litter_number: z.string().max(50).optional(),
  registration_number: z.string().max(100).optional(),
  
  father_id: z.string().uuid('Father is required'),
  mother_id: z.string().uuid('Mother is required'),
  breed_id: z.string().uuid('Breed is required'),
  
  planned_date: z.string().optional(),
  mating_date: z.string().optional(),
  birth_date: z.string().optional(),
  registration_date: z.string().optional(),
  
  status: z.nativeEnum(LitterStatus).default(LitterStatus.PLANNED),
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  is_public: z.boolean().default(true),
  
  breeder_id: z.string().uuid('Breeder is required'),
  kennel_id: z.string().uuid().optional(),
  club_id: z.string().uuid().optional(),
  
  expected_count: z.number().min(1).max(20).optional(),
  actual_count: z.number().min(0).max(20).optional(),
  male_count: z.number().min(0).optional(),
  female_count: z.number().min(0).optional(),
  alive_count: z.number().min(0).optional(),
  
  average_birth_weight: z.number().positive().optional(),
  min_birth_weight: z.number().positive().optional(),
  max_birth_weight: z.number().positive().optional(),
  
  notes: z.string().max(1000).optional(),
  breeding_notes: z.string().max(1000).optional(),
  health_notes: z.string().max(1000).optional(),
  
  cover_id: z.string().uuid().optional(),
  
  birth_location: z.string().max(200).optional(),
  country_of_birth_id: z.string().uuid().optional(),
  
  tags: z.array(z.string()).optional(),
  is_champion_bloodline: z.boolean().default(false),
  inbreeding_coefficient: z.number().min(0).max(100).optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type LitterFormData = z.infer<typeof LitterSchema>;
export type LitterCreateData = Omit<LitterFormData, 'id' | 'created_at' | 'updated_at' | 'actual_count' | 'male_count' | 'female_count' | 'alive_count'>;
export type LitterUpdateData = Partial<LitterCreateData> & { id: string };

/**
 * Розширений тип Litter з пов'язаними сутностями
 */
export interface LitterWithRelations extends Litter {
  // Пов'язані сутності
  father?: any; // Pet
  mother?: any; // Pet
  breed?: any; // Breed
  breeder?: any; // Contact
  kennel?: any; // Kennel
  club?: any; // Club
  country_of_birth?: any; // Country
  
  // Потомство
  puppies?: any[]; // Pet[]
  
  // Обчислені поля
  gestation_period?: number; // днів
  age_of_puppies?: string;
  survival_rate?: number; // відсоток
  gender_ratio?: { male: number; female: number };
}

/**
 * Puppy (Цуценя) - окрема сутність для цуценят у виводку
 */
export interface Puppy extends BaseEntity {
  litter_id: string;
  pet_id?: string; // Зв'язок з Pet після реєстрації
  
  // Основна інформація
  temp_name?: string; // Тимчасове ім'я до реєстрації
  birth_order: number;
  sex: Sex;
  
  // Фізичні характеристики при народженні
  birth_weight?: number;
  birth_time?: string;
  coat_color_notes?: string;
  markings?: string;
  
  // Стан здоров'я
  is_alive: boolean;
  health_status?: string;
  veterinary_notes?: string;
  
  // Статус продажу/резервування
  is_available: boolean;
  is_reserved: boolean;
  reserved_by?: string; // Contact ID
  price?: number;
  
  // Медіа
  photos?: string[];
  
  // Додаткова інформація
  notes?: string;
}

export const PuppySchema = z.object({
  id: z.string().uuid().optional(),
  litter_id: z.string().uuid('Litter is required'),
  pet_id: z.string().uuid().optional(),
  
  temp_name: z.string().max(50).optional(),
  birth_order: z.number().min(1).max(20),
  sex: z.nativeEnum(Sex),
  
  birth_weight: z.number().positive().optional(),
  birth_time: z.string().optional(),
  coat_color_notes: z.string().max(200).optional(),
  markings: z.string().max(500).optional(),
  
  is_alive: z.boolean().default(true),
  health_status: z.string().max(200).optional(),
  veterinary_notes: z.string().max(1000).optional(),
  
  is_available: z.boolean().default(true),
  is_reserved: z.boolean().default(false),
  reserved_by: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  
  photos: z.array(z.string().url()).optional(),
  
  notes: z.string().max(500).optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Утиліти для роботи з Litter
 */
export const LitterUtils = {
  /**
   * Обчислити термін вагітності
   */
  calculateGestationPeriod(matingDate: string, birthDate: string): number {
    const mating = new Date(matingDate);
    const birth = new Date(birthDate);
    const diffTime = birth.getTime() - mating.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Отримати вік цуценят
   */
  getPuppyAge(birthDate: string): string {
    const birth = new Date(birthDate);
    const now = new Date();
    const ageInMs = now.getTime() - birth.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 7) {
      return `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`;
    } else if (ageInDays < 56) { // 8 weeks
      const weeks = Math.floor(ageInDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(ageInDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
  },

  /**
   * Обчислити рівень виживаності
   */
  calculateSurvivalRate(totalCount: number, aliveCount: number): number {
    if (totalCount === 0) return 0;
    return Math.round((aliveCount / totalCount) * 100);
  },

  /**
   * Отримати співвідношення статей
   */
  getGenderRatio(maleCount: number, femaleCount: number): { male: number; female: number } {
    const total = maleCount + femaleCount;
    if (total === 0) return { male: 0, female: 0 };
    
    return {
      male: Math.round((maleCount / total) * 100),
      female: Math.round((femaleCount / total) * 100),
    };
  },

  /**
   * Генерувати URL для виводку
   */
  generateUrl(litter: Litter): string {
    const namePart = litter.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/litters/${litter.id}/${namePart}`;
  },

  /**
   * Перевірити чи готовий виводок до реєстрації
   */
  isReadyForRegistration(litter: Litter): boolean {
    return !!(litter.birth_date && 
              litter.actual_count && 
              litter.status === LitterStatus.BORN);
  },

  /**
   * Отримати статус як текст
   */
  getStatusText(status: LitterStatus): string {
    const statusMap = {
      [LitterStatus.PLANNED]: 'Planned',
      [LitterStatus.CONFIRMED]: 'Confirmed',
      [LitterStatus.BORN]: 'Born',
      [LitterStatus.REGISTERED]: 'Registered',
      [LitterStatus.COMPLETED]: 'Completed',
    };
    return statusMap[status];
  },

  /**
   * Перевірити чи всі цуценята мають власників
   */
  areAllPuppiesPlaced(litter: LitterWithRelations): boolean {
    if (!litter.puppies || litter.puppies.length === 0) return false;
    return litter.puppies.every((puppy: any) => !puppy.is_available || puppy.is_reserved);
  },

  /**
   * Отримати середню вагу при народженні
   */
  getAverageBirthWeight(puppies: Puppy[]): number {
    const weightsWithValues = puppies
      .filter(p => p.birth_weight && p.birth_weight > 0)
      .map(p => p.birth_weight!);
    
    if (weightsWithValues.length === 0) return 0;
    
    const sum = weightsWithValues.reduce((a, b) => a + b, 0);
    return Math.round((sum / weightsWithValues.length) * 100) / 100;
  },
};