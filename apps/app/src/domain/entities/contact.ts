import { z } from 'zod';
import { BaseEntity, VerificationStatus } from './common';

/**
 * Contact (Контакт/Особа) - інформація про людей в системі
 * Мігровано з Angular Contact_Schema
 */
export interface Contact extends BaseEntity {
  // Основна інформація
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  
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
  
  // Соціальні мережі та комунікації
  facebook?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  
  // Професійна інформація
  prefix?: string; // Dr., Mr., Mrs., etc.
  suffix?: string;
  title?: string;
  company?: string;
  position?: string;
  
  // Система
  verification_status: VerificationStatus;
  is_public: boolean;
  is_active: boolean;
  user_id?: string; // Зв'язок з аутентифікованим користувачем
  
  // Медіа
  avatar_url?: string;
  cover_id?: string;
  
  // Мета-інформація
  notes?: string;
  timezone_id?: string;
  language_id?: string;
  public_data_id?: string;
  
  // Спеціалізація в розведенні
  is_breeder: boolean;
  is_judge: boolean;
  is_veterinarian: boolean;
  specializations?: string[]; // масив спеціалізацій
  
  // Досвід та кваліфікація
  experience_years?: number;
  certifications?: string[];
  education?: string;
  
  // Рейтинг та репутація
  rating?: number;
  review_count?: number;
}

/**
 * Zod схема для валідації Contact
 */
export const ContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  middle_name: z.string().max(100).optional(),
  
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country_id: z.string().uuid().optional(),
  
  facebook: z.string().max(200).optional(),
  instagram: z.string().max(200).optional(),
  telegram: z.string().max(200).optional(),
  whatsapp: z.string().max(20).optional(),
  
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  position: z.string().max(100).optional(),
  
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  is_public: z.boolean().default(true),
  is_active: z.boolean().default(true),
  user_id: z.string().uuid().optional(),
  
  avatar_url: z.string().url().optional(),
  cover_id: z.string().uuid().optional(),
  
  notes: z.string().max(1000).optional(),
  timezone_id: z.string().uuid().optional(),
  language_id: z.string().uuid().optional(),
  public_data_id: z.string().uuid().optional(),
  
  is_breeder: z.boolean().default(false),
  is_judge: z.boolean().default(false),
  is_veterinarian: z.boolean().default(false),
  specializations: z.array(z.string()).optional(),
  
  experience_years: z.number().min(0).max(100).optional(),
  certifications: z.array(z.string()).optional(),
  education: z.string().max(500).optional(),
  
  rating: z.number().min(0).max(100).optional(),
  review_count: z.number().min(0).default(0),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type ContactFormData = z.infer<typeof ContactSchema>;
export type ContactCreateData = Omit<ContactFormData, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>;
export type ContactUpdateData = Partial<ContactCreateData> & { id: string };

/**
 * Contact Address - окрема адреса для контакту
 */
export interface ContactAddress extends BaseEntity {
  contact_id: string;
  address_type: 'home' | 'work' | 'other';
  address: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_id?: string;
  is_primary: boolean;
  is_public: boolean;
}

export const ContactAddressSchema = z.object({
  id: z.string().uuid().optional(),
  contact_id: z.string().uuid('Contact is required'),
  address_type: z.enum(['home', 'work', 'other']).default('home'),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country_id: z.string().uuid().optional(),
  is_primary: z.boolean().default(false),
  is_public: z.boolean().default(true),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Contact Communication - способи зв'язку з контактом
 */
export interface ContactCommunication extends BaseEntity {
  contact_id: string;
  communication_type: 'email' | 'phone' | 'social' | 'messenger';
  platform?: string; // telegram, whatsapp, viber, etc.
  value: string;
  is_primary: boolean;
  is_public: boolean;
  is_verified: boolean;
}

/**
 * Розширений тип Contact з пов'язаними сутностями
 */
export interface ContactWithRelations extends Contact {
  // Пов'язані сутності
  country?: any;
  addresses?: ContactAddress[];
  communications?: ContactCommunication[];
  
  // Статистика
  owned_pets?: any[];
  bred_pets?: any[];
  kennels?: any[];
  
  // Обчислені поля
  full_name?: string;
  pets_count?: number;
  kennels_count?: number;
  years_experience?: number;
}

/**
 * Утиліти для роботи з Contact
 */
export const ContactUtils = {
  /**
   * Сформувати повне ім'я
   */
  getFullName(contact: Contact): string {
    const parts: string[] = [];
    
    if (contact.prefix) parts.push(contact.prefix);
    if (contact.first_name) parts.push(contact.first_name);
    if (contact.middle_name) parts.push(contact.middle_name);
    if (contact.last_name) parts.push(contact.last_name);
    if (contact.suffix) parts.push(contact.suffix);
    
    const fullName = parts.join(' ').trim();
    return fullName || contact.name;
  },

  /**
   * Сформувати короткий опис контакту
   */
  getShortDescription(contact: Contact): string {
    const parts: string[] = [];
    
    if (contact.is_breeder) parts.push('Breeder');
    if (contact.is_judge) parts.push('Judge');
    if (contact.is_veterinarian) parts.push('Veterinarian');
    
    if (contact.position && contact.company) {
      parts.push(`${contact.position} at ${contact.company}`);
    } else if (contact.position) {
      parts.push(contact.position);
    } else if (contact.company) {
      parts.push(contact.company);
    }
    
    return parts.join(' • ');
  },

  /**
   * Генерувати URL для контакту
   */
  generateUrl(contact: Contact): string {
    const namePart = contact.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/contacts/${contact.id}/${namePart}`;
  },

  /**
   * Перевірити чи має контакт повну контактну інформацію
   */
  hasCompleteContactInfo(contact: Contact): boolean {
    return !!(contact.email || contact.phone) && !!contact.address;
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
   * Перевірити чи є контакт професіоналом
   */
  isProfessional(contact: Contact): boolean {
    return contact.is_breeder || contact.is_judge || contact.is_veterinarian;
  },

  /**
   * Отримати рівень досвіду
   */
  getExperienceLevel(contact: Contact): 'beginner' | 'intermediate' | 'experienced' | 'expert' {
    const years = contact.experience_years || 0;
    
    if (years < 2) return 'beginner';
    if (years < 5) return 'intermediate';
    if (years < 10) return 'experienced';
    return 'expert';
  },

  /**
   * Відформатувати номер телефону
   */
  formatPhone(phone: string): string {
    // Базове форматування телефону
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    }
    
    return phone; // Повернути оригінал якщо не можемо відформатувати
  },
};