import { z } from 'zod';
import { BaseEntity } from './common';

/**
 * Breed (Порода) - довідник порід тварин
 * Мігровано з Angular Breed_Schema
 */
export interface Breed extends BaseEntity {
  // Основна інформація
  name: string;
  authentic_name?: string;
  admin_name?: string;
  
  // Характеристики породи
  pet_type_id: string;
  category_id?: string;
  language_id?: string;
  
  // Відмінності в породі
  differ_by_coat_color: boolean;
  differ_by_coat_type: boolean;
  differ_by_size: boolean;
  differ_by_body_feature: boolean;
  has_related_breed: boolean;
  
  // Статистика
  pet_profile_count: number;
  kennel_count: number;
  patron_count: number;
  achievement_progress: number;
  rating: number;
  payment_rating: number;
  
  // Медіа та URL
  avatar_url?: string;
  cover_id?: string;
  url?: string;
  
  // Асоційований акаунт (для управління породою)
  account_id?: string;
  public_data_id?: string;
}

/**
 * Zod схема для валідації Breed
 */
export const BreedSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Breed name is required').max(100),
  authentic_name: z.string().max(100).optional(),
  admin_name: z.string().max(100).optional(),
  
  pet_type_id: z.string().uuid('Pet type is required'),
  category_id: z.string().uuid().optional(),
  language_id: z.string().uuid().optional(),
  
  differ_by_coat_color: z.boolean().default(false),
  differ_by_coat_type: z.boolean().default(false),
  differ_by_size: z.boolean().default(false),
  differ_by_body_feature: z.boolean().default(false),
  has_related_breed: z.boolean().default(false),
  
  pet_profile_count: z.number().min(0).default(0),
  kennel_count: z.number().min(0).default(0),
  patron_count: z.number().min(0).default(0),
  achievement_progress: z.number().min(0).max(100).default(0),
  rating: z.number().min(0).default(0),
  payment_rating: z.number().min(0).default(0),
  
  avatar_url: z.string().url().optional(),
  cover_id: z.string().uuid().optional(),
  url: z.string().max(200).optional(),
  
  account_id: z.string().uuid().optional(),
  public_data_id: z.string().uuid().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type BreedFormData = z.infer<typeof BreedSchema>;
export type BreedCreateData = Omit<BreedFormData, 'id' | 'created_at' | 'updated_at' | 'pet_profile_count' | 'kennel_count' | 'patron_count' | 'achievement_progress' | 'rating' | 'payment_rating'>;
export type BreedUpdateData = Partial<BreedCreateData> & { id: string };

/**
 * Розширений тип Breed з пов'язаними сутностями
 */
export interface BreedWithRelations extends Breed {
  // Пов'язані сутності
  pet_type?: any;
  category?: any;
  language?: any;
  account?: any;
  
  // Статистичні дані
  popular_coat_colors?: Array<{ color: any; count: number }>;
  popular_coat_types?: Array<{ type: any; count: number }>;
  top_kennels?: Array<any>;
  recent_pets?: Array<any>;
  
  // Обчислені поля
  total_pets?: number;
  active_pets?: number;
  average_rating?: number;
}

/**
 * Breed Division (Розділ породи)
 * Для порід що мають підтипи
 */
export interface BreedDivision extends BaseEntity {
  name: string;
  breed_id: string;
  description?: string;
  characteristics?: string;
  is_active: boolean;
}

export const BreedDivisionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Division name is required').max(100),
  breed_id: z.string().uuid('Breed is required'),
  description: z.string().max(500).optional(),
  characteristics: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Утиліти для роботи з Breed
 */
export const BreedUtils = {
  /**
   * Генерувати URL для породи
   */
  generateUrl(breed: Breed): string {
    const namePart = breed.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/breeds/${breed.id}/${namePart}`;
  },

  /**
   * Отримати рівень популярності породи
   */
  getPopularityLevel(breed: Breed): 'low' | 'medium' | 'high' | 'very_high' {
    const totalPets = breed.pet_profile_count;
    
    if (totalPets < 10) return 'low';
    if (totalPets < 100) return 'medium';
    if (totalPets < 1000) return 'high';
    return 'very_high';
  },

  /**
   * Перевірити чи підтримує порода розділи
   */
  supportsDivisions(breed: Breed): boolean {
    return breed.differ_by_coat_color || 
           breed.differ_by_coat_type || 
           breed.differ_by_size || 
           breed.differ_by_body_feature;
  },

  /**
   * Отримати характеристики породи як текст
   */
  getCharacteristicsText(breed: Breed): string[] {
    const characteristics: string[] = [];
    
    if (breed.differ_by_coat_color) characteristics.push('Multiple coat colors');
    if (breed.differ_by_coat_type) characteristics.push('Multiple coat types');
    if (breed.differ_by_size) characteristics.push('Multiple sizes');
    if (breed.differ_by_body_feature) characteristics.push('Multiple body features');
    if (breed.has_related_breed) characteristics.push('Has related breeds');
    
    return characteristics;
  },

  /**
   * Обчислити прогрес досягнень у відсотках
   */
  getAchievementProgress(breed: Breed): number {
    return Math.min(100, breed.achievement_progress);
  },

  /**
   * Отримати статус породи на основі статистики
   */
  getBreedStatus(breed: Breed): 'emerging' | 'established' | 'popular' | 'champion' {
    const pets = breed.pet_profile_count;
    const kennels = breed.kennel_count;
    const rating = breed.rating;
    
    if (pets < 5 || kennels < 2) return 'emerging';
    if (pets < 50 || kennels < 10 || rating < 50) return 'established';
    if (pets < 200 || kennels < 25 || rating < 80) return 'popular';
    return 'champion';
  },
};