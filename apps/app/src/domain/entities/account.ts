import { z } from 'zod';
import { BaseEntity, AccountType, VerificationStatus } from './common';

/**
 * Account (Акаунт/Організація) - сутність для управління організаціями
 * Мігровано з Angular Account_Schema
 */
export interface Account extends BaseEntity {
  // Основна інформація
  name: string;
  display_name?: string;
  description?: string;
  account_type: AccountType;
  
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
  
  // Власник та управління
  owner_contact_id: string;
  managers?: string[]; // Contact IDs
  
  // Статус та верифікація
  is_active: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  
  // Професійна інформація
  established_year?: number;
  registration_number?: string;
  license_number?: string;
  certifications?: string[];
  
  // Медіа та брендинг
  avatar_url?: string;
  cover_id?: string;
  logo_url?: string;
  
  // Рейтинг та статистика
  rating?: number;
  review_count?: number;
  
  // Фінансова інформація
  subscription_plan?: string;
  subscription_expires_at?: string;
  payment_methods?: string[];
  
  // Соціальні мережі
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  
  // Налаштування
  timezone_id?: string;
  language_id?: string;
  currency_id?: string;
  
  // Спеціалізація (для різних типів акаунтів)
  specializations?: string[];
  services_offered?: string[];
  
  // Метадані
  notes?: string;
  tags?: string[];
  public_data_id?: string;
}

/**
 * Zod схема для валідації Account
 */
export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  display_name: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  account_type: z.nativeEnum(AccountType),
  
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country_id: z.string().uuid().optional(),
  
  owner_contact_id: z.string().uuid('Owner is required'),
  managers: z.array(z.string().uuid()).optional(),
  
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  
  established_year: z.number().min(1800).max(new Date().getFullYear()).optional(),
  registration_number: z.string().max(100).optional(),
  license_number: z.string().max(100).optional(),
  certifications: z.array(z.string()).optional(),
  
  avatar_url: z.string().url().optional(),
  cover_id: z.string().uuid().optional(),
  logo_url: z.string().url().optional(),
  
  rating: z.number().min(0).max(100).optional(),
  review_count: z.number().min(0).default(0),
  
  subscription_plan: z.string().max(50).optional(),
  subscription_expires_at: z.string().optional(),
  payment_methods: z.array(z.string()).optional(),
  
  facebook: z.string().max(200).optional(),
  instagram: z.string().max(200).optional(),
  twitter: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  
  timezone_id: z.string().uuid().optional(),
  language_id: z.string().uuid().optional(),
  currency_id: z.string().uuid().optional(),
  
  specializations: z.array(z.string()).optional(),
  services_offered: z.array(z.string()).optional(),
  
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  public_data_id: z.string().uuid().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type AccountFormData = z.infer<typeof AccountSchema>;
export type AccountCreateData = Omit<AccountFormData, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>;
export type AccountUpdateData = Partial<AccountCreateData> & { id: string };

/**
 * Розширений тип Account з пов'язаними сутностями
 */
export interface AccountWithRelations extends Account {
  // Пов'язані сутності
  owner?: any; // Contact
  managers_data?: any[]; // Contact[]
  country?: any; // Country
  timezone?: any; // Timezone
  language?: any; // Language
  currency?: any; // Currency
  
  // Статистика
  managed_breeds?: any[]; // Breed[]
  kennels?: any[]; // Kennel[]
  events?: any[]; // Event[]
  
  // Обчислені поля
  years_established?: number;
  total_breeds?: number;
  total_kennels?: number;
  total_events?: number;
  average_rating?: number;
}

/**
 * Account Membership (Членство в організації)
 */
export interface AccountMembership extends BaseEntity {
  account_id: string;
  member_contact_id: string;
  role: 'owner' | 'manager' | 'member' | 'guest';
  permissions: string[];
  joined_at: string;
  is_active: boolean;
  notes?: string;
}

export const AccountMembershipSchema = z.object({
  id: z.string().uuid().optional(),
  account_id: z.string().uuid('Account is required'),
  member_contact_id: z.string().uuid('Member is required'),
  role: z.enum(['owner', 'manager', 'member', 'guest']).default('member'),
  permissions: z.array(z.string()).default([]),
  joined_at: z.string(),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Account Subscription (Підписка акаунту)
 */
export interface AccountSubscription extends BaseEntity {
  account_id: string;
  plan_name: string;
  plan_type: 'free' | 'basic' | 'premium' | 'enterprise';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  auto_renew: boolean;
  price?: number;
  currency?: string;
  features: string[];
  limits: Record<string, number>;
}

/**
 * Утиліти для роботи з Account
 */
export const AccountUtils = {
  /**
   * Генерувати URL для акаунту
   */
  generateUrl(account: Account): string {
    const namePart = account.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/accounts/${account.id}/${namePart}`;
  },

  /**
   * Отримати роки роботи
   */
  getYearsEstablished(account: Account): number {
    if (!account.established_year) return 0;
    return new Date().getFullYear() - account.established_year;
  },

  /**
   * Отримати тип акаунту як текст
   */
  getAccountTypeText(type: AccountType): string {
    const typeMap = {
      [AccountType.KENNEL]: 'Kennel',
      [AccountType.CLUB]: 'Club',
      [AccountType.FEDERATION]: 'Federation',
      [AccountType.INDIVIDUAL]: 'Individual',
    };
    return typeMap[type];
  },

  /**
   * Перевірити чи має акаунт активну підписку
   */
  hasActiveSubscription(account: Account): boolean {
    if (!account.subscription_expires_at) return false;
    return new Date(account.subscription_expires_at) > new Date();
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
   * Перевірити чи може акаунт управляти породами
   */
  canManageBreeds(account: Account): boolean {
    return account.account_type === AccountType.FEDERATION || 
           account.account_type === AccountType.CLUB ||
           (account.account_type === AccountType.KENNEL && account.is_verified);
  },

  /**
   * Перевірити чи може акаунт організовувати події
   */
  canOrganizeEvents(account: Account): boolean {
    return account.account_type === AccountType.FEDERATION || 
           account.account_type === AccountType.CLUB ||
           (account.is_verified && account.certifications && account.certifications.length > 0);
  },

  /**
   * Отримати рівень довіри акаунту
   */
  getTrustLevel(account: Account): 'low' | 'medium' | 'high' | 'verified' {
    if (account.verification_status === VerificationStatus.VERIFIED) {
      return 'verified';
    }
    
    const yearsEstablished = this.getYearsEstablished(account);
    const hasGoodRating = (account.rating || 0) >= 75;
    const hasReviews = (account.review_count || 0) >= 5;
    
    if (yearsEstablished >= 10 && hasGoodRating && hasReviews) return 'high';
    if (yearsEstablished >= 3 && hasGoodRating) return 'medium';
    return 'low';
  },

  /**
   * Отримати контактну інформацію
   */
  getContactInfo(account: Account): string {
    const parts: string[] = [];
    
    if (account.email) parts.push(account.email);
    if (account.phone) parts.push(account.phone);
    if (account.website) parts.push(account.website);
    
    return parts.join(' • ');
  },

  /**
   * Отримати повну адресу
   */
  getFullAddress(account: Account): string {
    const parts: string[] = [];
    
    if (account.address) parts.push(account.address);
    if (account.city) parts.push(account.city);
    if (account.region) parts.push(account.region);
    if (account.postal_code) parts.push(account.postal_code);
    
    return parts.join(', ');
  },

  /**
   * Перевірити права доступу
   */
  hasPermission(membership: AccountMembership, permission: string): boolean {
    if (membership.role === 'owner') return true;
    return membership.permissions.includes(permission);
  },
};