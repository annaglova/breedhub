import { z } from 'zod';
import { BaseEntity, EventType, EventStatus, VerificationStatus } from './common';

/**
 * Event (Подія/Захід) - сутність для управління заходами та змаганнями
 * Мігровано з Angular Event_Schema
 */
export interface Event extends BaseEntity {
  // Основна інформація
  name: string;
  description?: string;
  event_type: EventType;
  status: EventStatus;
  
  // Дати та час
  start_date: string;
  end_date?: string;
  registration_start_date?: string;
  registration_end_date?: string;
  setup_start_time?: string;
  event_start_time?: string;
  
  // Місце проведення
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_region?: string;
  venue_country_id?: string;
  venue_postal_code?: string;
  venue_website?: string;
  venue_contact_info?: string;
  
  // Організація
  organizer_contact_id: string;
  organizer_account_id?: string;
  co_organizers?: string[]; // Contact IDs
  sponsors?: string[]; // Account IDs або Contact IDs
  
  // Судді та офіційні особи
  judges?: string[]; // Contact IDs
  ring_stewards?: string[]; // Contact IDs
  veterinarians?: string[]; // Contact IDs
  
  // Реєстрація та участь
  max_participants?: number;
  current_participants?: number;
  registration_fee?: number;
  late_registration_fee?: number;
  registration_requirements?: string;
  age_restrictions?: string;
  
  // Класи та категорії
  available_classes?: string[];
  breed_restrictions?: string[]; // Breed IDs
  pet_type_restrictions?: string[]; // PetType IDs
  
  // Статус та верифікація
  is_public: boolean;
  is_championship: boolean;
  verification_status: VerificationStatus;
  is_approved: boolean;
  
  // Призи та нагороди
  prize_pool?: number;
  awards?: string[];
  certificates_provided: boolean;
  points_system?: string;
  
  // Медіа та документи
  cover_image_url?: string;
  gallery_images?: string[];
  documents?: string[]; // URLs до правил, розкладу тощо
  live_stream_url?: string;
  
  // Контактна інформація
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  
  // Соціальні мережі
  facebook_event?: string;
  instagram?: string;
  
  // Додаткова інформація
  special_requirements?: string;
  accommodation_info?: string;
  parking_info?: string;
  catering_available: boolean;
  
  // Метадані
  notes?: string;
  tags?: string[];
  weather_dependent: boolean;
  indoor_event: boolean;
  
  // Фінансова інформація
  budget?: number;
  entry_fees_total?: number;
  expenses?: number;
  
  public_data_id?: string;
}

/**
 * Zod схема для валідації Event
 */
export const EventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Event name is required').max(200),
  description: z.string().max(2000).optional(),
  event_type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).default(EventStatus.PLANNED),
  
  start_date: z.string('Start date is required'),
  end_date: z.string().optional(),
  registration_start_date: z.string().optional(),
  registration_end_date: z.string().optional(),
  setup_start_time: z.string().optional(),
  event_start_time: z.string().optional(),
  
  venue_name: z.string().max(200).optional(),
  venue_address: z.string().max(500).optional(),
  venue_city: z.string().max(100).optional(),
  venue_region: z.string().max(100).optional(),
  venue_country_id: z.string().uuid().optional(),
  venue_postal_code: z.string().max(20).optional(),
  venue_website: z.string().url().optional(),
  venue_contact_info: z.string().max(200).optional(),
  
  organizer_contact_id: z.string().uuid('Organizer is required'),
  organizer_account_id: z.string().uuid().optional(),
  co_organizers: z.array(z.string().uuid()).optional(),
  sponsors: z.array(z.string().uuid()).optional(),
  
  judges: z.array(z.string().uuid()).optional(),
  ring_stewards: z.array(z.string().uuid()).optional(),
  veterinarians: z.array(z.string().uuid()).optional(),
  
  max_participants: z.number().positive().optional(),
  current_participants: z.number().min(0).default(0),
  registration_fee: z.number().min(0).optional(),
  late_registration_fee: z.number().min(0).optional(),
  registration_requirements: z.string().max(1000).optional(),
  age_restrictions: z.string().max(500).optional(),
  
  available_classes: z.array(z.string()).optional(),
  breed_restrictions: z.array(z.string().uuid()).optional(),
  pet_type_restrictions: z.array(z.string().uuid()).optional(),
  
  is_public: z.boolean().default(true),
  is_championship: z.boolean().default(false),
  verification_status: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  is_approved: z.boolean().default(false),
  
  prize_pool: z.number().min(0).optional(),
  awards: z.array(z.string()).optional(),
  certificates_provided: z.boolean().default(false),
  points_system: z.string().max(500).optional(),
  
  cover_image_url: z.string().url().optional(),
  gallery_images: z.array(z.string().url()).optional(),
  documents: z.array(z.string().url()).optional(),
  live_stream_url: z.string().url().optional(),
  
  contact_email: z.string().email('Invalid email format').optional(),
  contact_phone: z.string().max(20).optional(),
  website: z.string().url('Invalid website URL').optional(),
  
  facebook_event: z.string().max(200).optional(),
  instagram: z.string().max(200).optional(),
  
  special_requirements: z.string().max(1000).optional(),
  accommodation_info: z.string().max(1000).optional(),
  parking_info: z.string().max(500).optional(),
  catering_available: z.boolean().default(false),
  
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  weather_dependent: z.boolean().default(false),
  indoor_event: z.boolean().default(true),
  
  budget: z.number().min(0).optional(),
  entry_fees_total: z.number().min(0).default(0),
  expenses: z.number().min(0).default(0),
  
  public_data_id: z.string().uuid().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
});

/**
 * Типи для форм
 */
export type EventFormData = z.infer<typeof EventSchema>;
export type EventCreateData = Omit<EventFormData, 'id' | 'created_at' | 'updated_at' | 'current_participants' | 'entry_fees_total' | 'expenses'>;
export type EventUpdateData = Partial<EventCreateData> & { id: string };

/**
 * Розширений тип Event з пов'язаними сутностями
 */
export interface EventWithRelations extends Event {
  // Пов'язані сутності
  organizer?: any; // Contact
  organizer_account?: any; // Account
  co_organizers_data?: any[]; // Contact[]
  sponsors_data?: any[]; // Account[] або Contact[]
  judges_data?: any[]; // Contact[]
  venue_country?: any; // Country
  
  // Учасники та реєстрації
  participants?: any[]; // EventParticipant[]
  registrations?: any[]; // EventRegistration[]
  results?: any[]; // EventResult[]
  
  // Обчислені поля
  days_until_event?: number;
  registration_open?: boolean;
  is_full?: boolean;
  total_prize_money?: number;
  participant_count_by_class?: Record<string, number>;
}

/**
 * Event Participant (Учасник заходу)
 */
export interface EventParticipant extends BaseEntity {
  event_id: string;
  participant_contact_id: string;
  pet_id?: string; // Якщо участь з твариною
  class_name?: string;
  entry_number?: string;
  registration_date: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_amount?: number;
  special_requirements?: string;
  is_confirmed: boolean;
  check_in_time?: string;
}

export const EventParticipantSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid('Event is required'),
  participant_contact_id: z.string().uuid('Participant is required'),
  pet_id: z.string().uuid().optional(),
  class_name: z.string().max(100).optional(),
  entry_number: z.string().max(50).optional(),
  registration_date: z.string(),
  payment_status: z.enum(['pending', 'paid', 'refunded']).default('pending'),
  payment_amount: z.number().min(0).optional(),
  special_requirements: z.string().max(500).optional(),
  is_confirmed: z.boolean().default(false),
  check_in_time: z.string().optional(),
  
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Event Result (Результат заходу)
 */
export interface EventResult extends BaseEntity {
  event_id: string;
  participant_id: string;
  pet_id?: string;
  class_name: string;
  placement?: number;
  points_earned?: number;
  award?: string;
  judge_id?: string;
  judge_notes?: string;
  time_score?: number; // Для змагань на час
  technical_score?: number; // Для технічних змагань
  final_score?: number;
}

/**
 * Event Schedule (Розклад заходу)
 */
export interface EventSchedule extends BaseEntity {
  event_id: string;
  class_name: string;
  start_time: string;
  estimated_duration?: number; // хвилини
  ring_number?: string;
  judge_id?: string;
  max_entries?: number;
  current_entries?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Утиліти для роботи з Event
 */
export const EventUtils = {
  /**
   * Генерувати URL для заходу
   */
  generateUrl(event: Event): string {
    const namePart = event.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `/events/${event.id}/${namePart}`;
  },

  /**
   * Обчислити кількість днів до заходу
   */
  getDaysUntilEvent(event: Event): number {
    const eventDate = new Date(event.start_date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Перевірити чи відкрита реєстрація
   */
  isRegistrationOpen(event: Event): boolean {
    const now = new Date();
    
    if (event.registration_start_date) {
      const regStart = new Date(event.registration_start_date);
      if (now < regStart) return false;
    }
    
    if (event.registration_end_date) {
      const regEnd = new Date(event.registration_end_date);
      if (now > regEnd) return false;
    }
    
    return event.status === EventStatus.REGISTRATION_OPEN;
  },

  /**
   * Перевірити чи заповнений захід
   */
  isFull(event: Event): boolean {
    if (!event.max_participants) return false;
    return (event.current_participants || 0) >= event.max_participants;
  },

  /**
   * Отримати тип заходу як текст
   */
  getEventTypeText(type: EventType): string {
    const typeMap = {
      [EventType.SHOW]: 'Dog Show',
      [EventType.COMPETITION]: 'Competition',
      [EventType.EXAM]: 'Examination',
      [EventType.MEETING]: 'Meeting',
      [EventType.EXHIBITION]: 'Exhibition',
    };
    return typeMap[type];
  },

  /**
   * Отримати статус як текст
   */
  getStatusText(status: EventStatus): string {
    const statusMap = {
      [EventStatus.PLANNED]: 'Planned',
      [EventStatus.REGISTRATION_OPEN]: 'Registration Open',
      [EventStatus.REGISTRATION_CLOSED]: 'Registration Closed',
      [EventStatus.IN_PROGRESS]: 'In Progress',
      [EventStatus.COMPLETED]: 'Completed',
      [EventStatus.CANCELLED]: 'Cancelled',
    };
    return statusMap[status];
  },

  /**
   * Отримати вартість реєстрації
   */
  getRegistrationFee(event: Event, isLateRegistration: boolean = false): number {
    if (isLateRegistration && event.late_registration_fee) {
      return event.late_registration_fee;
    }
    return event.registration_fee || 0;
  },

  /**
   * Отримати повну адресу місця проведення
   */
  getVenueAddress(event: Event): string {
    const parts: string[] = [];
    
    if (event.venue_name) parts.push(event.venue_name);
    if (event.venue_address) parts.push(event.venue_address);
    if (event.venue_city) parts.push(event.venue_city);
    if (event.venue_region) parts.push(event.venue_region);
    
    return parts.join(', ');
  },

  /**
   * Перевірити чи потребує захід спеціальних вимог
   */
  hasSpecialRequirements(event: Event): boolean {
    return !!(event.special_requirements || 
              event.age_restrictions || 
              event.breed_restrictions?.length ||
              event.registration_requirements);
  },

  /**
   * Обчислити тривалість заходу
   */
  getEventDuration(event: Event): number {
    if (!event.end_date) return 1;
    
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  },

  /**
   * Перевірити чи є захід майбутнім
   */
  isFutureEvent(event: Event): boolean {
    const eventDate = new Date(event.start_date);
    const today = new Date();
    return eventDate > today;
  },

  /**
   * Отримати контактну інформацію
   */
  getContactInfo(event: Event): string {
    const parts: string[] = [];
    
    if (event.contact_email) parts.push(event.contact_email);
    if (event.contact_phone) parts.push(event.contact_phone);
    if (event.website) parts.push(event.website);
    
    return parts.join(' • ');
  },

  /**
   * Перевірити чи може користувач зареєструватися
   */
  canRegister(event: Event, userContact?: any): boolean {
    if (!this.isRegistrationOpen(event)) return false;
    if (this.isFull(event)) return false;
    if (event.status === EventStatus.CANCELLED) return false;
    
    // Додаткові перевірки можуть включати:
    // - Перевірку віку
    // - Перевірку породи
    // - Перевірку членства в клубі
    
    return true;
  },

  /**
   * Обчислити прибуток заходу
   */
  calculateProfit(event: Event): number {
    const income = event.entry_fees_total || 0;
    const expenses = event.expenses || 0;
    return income - expenses;
  },
};