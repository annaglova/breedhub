/**
 * MultiStore Type Definitions
 * 
 * CRITICAL FOR AI: This file defines ALL entity types for the MultiStore system.
 * Every entity in the system MUST conform to these types.
 * DO NOT modify without updating MULTISTORE_ARCHITECTURE.md
 */

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * All possible entity types in the system
 * This is the discriminator field for type narrowing
 */
export type EntityType = 
  | 'workspace'     // Top-level container
  | 'space'         // Collection container  
  | 'view'          // Display configuration
  | 'filter'        // Filter configuration
  | 'sort'          // Sort configuration
  | 'breed'         // Data entity
  | 'pet'           // Data entity
  | 'kennel'        // Data entity
  | 'contact';      // Data entity

/**
 * Metadata attached to every entity
 * Tracks lifecycle and sync status
 */
export interface EntityMetadata {
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;      // Last sync with server
  version: number;      // For optimistic locking
  tags?: string[];      // For categorization
  isDeleted?: boolean;  // Soft delete flag
  deletedAt?: Date;     // Soft delete timestamp
}

/**
 * Base interface that ALL entities must extend
 * This ensures uniformity across the entire system
 */
export interface BaseEntity {
  id: string;                    // Unique identifier (use nanoid or uuid)
  _type: EntityType;             // Entity type discriminator
  _parentId?: string;            // Parent entity ID (for hierarchy)
  _metadata: EntityMetadata;     // Lifecycle metadata
}

// ============================================================================
// CONTAINER ENTITIES (Organizational)
// ============================================================================

/**
 * Workspace - Top level container
 * Cannot have a parent
 */
export interface WorkspaceEntity extends BaseEntity {
  _type: 'workspace';
  name: string;
  visibility: 'public' | 'private';
  owner?: string;                // User ID
  isActive?: boolean;            // Currently active workspace
  permissions: {
    read: string[];              // User IDs with read access
    write: string[];             // User IDs with write access
    admin: string[];             // User IDs with admin access
  };
  settings: {
    defaultSpace?: string;       // Default space ID
    theme?: 'light' | 'dark' | 'auto';
    locale?: string;             // e.g., 'en-US', 'uk-UA'
    timezone?: string;           // e.g., 'UTC', 'Europe/Kiev'
  };
}

/**
 * Space - Collection container
 * MUST have a workspace as parent
 */
export interface SpaceEntity extends BaseEntity {
  _type: 'space';
  _parentId: string;             // REQUIRED: References workspace ID
  name: string;
  collection: 'breeds' | 'pets' | 'kennels' | 'contacts';
  icon?: string;                 // Icon identifier or emoji
  color?: string;                // Hex color for UI
  isActive?: boolean;            // Currently active space
  defaultView?: string;          // Default view entity ID
  permissions?: {
    inherit: boolean;            // Inherit from workspace?
    overrides?: {
      read: string[];
      write: string[];
    };
  };
  stats?: {
    totalItems: number;
    lastUpdated: Date;
  };
}

/**
 * View - Display configuration
 * MUST have a space as parent
 */
export interface ViewEntity extends BaseEntity {
  _type: 'view';
  _parentId: string;             // REQUIRED: References space ID
  name: string;
  isActive?: boolean;            // Currently active view
  viewType: 'list' | 'grid' | 'table' | 'map' | 'calendar';
  viewMode: 'fullscreen' | 'drawer' | 'modal' | 'embedded';
  
  configuration: {
    // List view settings
    itemHeight?: number;
    showThumbnails?: boolean;
    thumbnailSize?: 'small' | 'medium' | 'large';
    
    // Grid view settings
    columns?: number;
    gap?: number;
    aspectRatio?: string;        // e.g., '1:1', '16:9'
    
    // Table view settings
    visibleColumns?: string[];
    columnWidths?: Record<string, number>;
    rowHeight?: 'compact' | 'normal' | 'comfortable';
    stickyHeader?: boolean;
    
    // Map view settings
    defaultZoom?: number;
    defaultCenter?: [number, number];
    clusterMarkers?: boolean;
    
    // Calendar view settings
    defaultDate?: string;
    eventField?: string;
    startField?: string;
    endField?: string;
    colorField?: string;
  };
  
  layout: {
    showFilters: boolean;
    showSearch: boolean;
    showSort: boolean;
    showPagination: boolean;
    showBulkActions: boolean;
    showExport: boolean;
    showImport: boolean;
  };
  
  pagination?: {
    pageSize: number;
    pageSizeOptions: number[];
  };
}

// ============================================================================
// CONFIGURATION ENTITIES
// ============================================================================

/**
 * Filter - Query configuration
 * MUST have a view as parent
 */
export interface FilterEntity extends BaseEntity {
  _type: 'filter';
  _parentId: string;             // REQUIRED: References view ID
  name: string;
  field: string;                 // Field to filter on
  operator: FilterOperator;
  value: any;                    // Filter value (type depends on operator)
  isActive: boolean;
  isUserDefined: boolean;        // User created vs system
  isPinned?: boolean;            // Show at top of filter list
  group?: string;                // For grouping filters in UI
}

export type FilterOperator = 
  | 'equals' 
  | 'notEquals'
  | 'contains' 
  | 'notContains'
  | 'startsWith' 
  | 'endsWith'
  | 'gt'                        // Greater than
  | 'gte'                       // Greater than or equal
  | 'lt'                        // Less than
  | 'lte'                       // Less than or equal
  | 'between'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * Sort - Ordering configuration
 * MUST have a view as parent
 */
export interface SortEntity extends BaseEntity {
  _type: 'sort';
  _parentId: string;             // REQUIRED: References view ID
  field: string;
  direction: 'asc' | 'desc';
  priority: number;              // For multi-field sorting
  isActive: boolean;
}

// ============================================================================
// DATA ENTITIES
// ============================================================================

/**
 * Breed - Dog breed information
 * MUST have a space with collection='breeds' as parent
 */
export interface BreedEntity extends BaseEntity {
  _type: 'breed';
  _parentId: string;             // REQUIRED: References space ID
  
  // Basic information
  name: string;
  alternateNames?: string[];
  origin: string;
  description: string;
  
  // Physical characteristics
  size: 'toy' | 'small' | 'medium' | 'large' | 'giant';
  weight: {
    min: number;                // in kg
    max: number;                // in kg
  };
  height: {
    min: number;                // in cm
    max: number;                // in cm
  };
  coat: {
    type: 'short' | 'medium' | 'long' | 'wire' | 'curly';
    colors: string[];
    patterns?: string[];
    hypoallergenic: boolean;
  };
  
  // Characteristics
  temperament: string[];
  exerciseNeeds: 'low' | 'moderate' | 'high' | 'very-high';
  groomingNeeds: 'low' | 'moderate' | 'high';
  trainability: 'easy' | 'moderate' | 'challenging';
  barkingLevel: 'quiet' | 'moderate' | 'vocal';
  
  // Health & Care
  lifespan: string;              // e.g., "10-12 years"
  healthConcerns?: string[];
  dietaryNeeds?: string;
  
  // Media
  imageUrl?: string;
  thumbnailUrl?: string;
  gallery?: string[];
  
  // Metadata
  popularityRank?: number;
  akcRecognized?: boolean;
  fciGroup?: string;
}

/**
 * Pet - Individual pet/dog
 * MUST have a space with collection='pets' as parent
 */
export interface PetEntity extends BaseEntity {
  _type: 'pet';
  _parentId: string;             // REQUIRED: References space ID
  
  // Basic information
  name: string;
  breedId: string;               // References breed entity
  birthDate: Date;
  gender: 'male' | 'female';
  microchipId?: string;
  registrationNumber?: string;
  
  // Status
  status: 'available' | 'reserved' | 'sold' | 'retired' | 'deceased';
  price?: number;
  currency?: string;
  
  // Relationships
  ownerId?: string;              // References contact entity
  kennelId?: string;             // References kennel entity
  sireId?: string;               // Father - references another pet
  damId?: string;                // Mother - references another pet
  
  // Physical
  color: string;
  markings?: string;
  weight?: number;               // in kg
  height?: number;               // in cm
  
  // Health
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  vaccinations?: {
    name: string;
    date: Date;
    nextDue?: Date;
    vetId?: string;
  }[];
  healthRecords?: {
    date: Date;
    type: 'checkup' | 'vaccination' | 'surgery' | 'treatment' | 'other';
    description: string;
    vetId?: string;
    documents?: string[];        // URLs or file IDs
  }[];
  
  // Media
  profilePhoto?: string;
  photos?: string[];
  videos?: string[];
  
  // Competition/Show
  titles?: string[];
  awards?: {
    date: Date;
    event: string;
    award: string;
    category?: string;
  }[];
}

/**
 * Kennel - Breeding facility
 * MUST have a space with collection='kennels' as parent
 */
export interface KennelEntity extends BaseEntity {
  _type: 'kennel';
  _parentId: string;             // REQUIRED: References space ID
  
  // Basic information
  name: string;
  establishedYear?: number;
  registrationNumber?: string;
  
  // Location
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    coordinates?: [number, number]; // [lat, lng]
  };
  
  // Specialization
  specialties: string[];         // Breed names
  services: ('breeding' | 'training' | 'boarding' | 'grooming' | 'showing')[];
  
  // Contact
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Business
  businessHours?: Record<string, string>; // { "monday": "9:00-17:00" }
  rating?: number;               // 0-5
  reviews?: number;              // Count
  accreditations?: string[];
  insurance?: boolean;
  
  // Capacity
  capacity?: {
    dogs: number;
    staff: number;
    boardingSpaces?: number;
  };
  
  // Media
  logo?: string;
  coverPhoto?: string;
  gallery?: string[];
  virtualTour?: string;
}

/**
 * Contact - Person (owner, breeder, vet, etc.)
 * MUST have a space with collection='contacts' as parent
 */
export interface ContactEntity extends BaseEntity {
  _type: 'contact';
  _parentId: string;             // REQUIRED: References space ID
  
  // Personal information
  firstName: string;
  lastName: string;
  title?: string;                // Mr., Mrs., Dr., etc.
  company?: string;
  
  // Contact details
  email: string;
  phone?: string;
  alternatePhone?: string;
  
  // Address
  address?: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  
  // Type and role
  contactType: 'owner' | 'breeder' | 'vet' | 'trainer' | 'judge' | 'other';
  role?: string;                 // Specific role description
  
  // Relationships
  kennelId?: string;             // Associated kennel
  petIds?: string[];             // Owned pets
  
  // Preferences
  preferredContact: 'email' | 'phone' | 'text';
  language?: string;
  timezone?: string;
  
  // Notes
  notes?: string;
  tags?: string[];
  
  // Status
  status: 'active' | 'inactive' | 'blocked';
  lastContactDate?: Date;
  
  // Media
  avatar?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isWorkspace = (entity: BaseEntity): entity is WorkspaceEntity => 
  entity._type === 'workspace';

export const isSpace = (entity: BaseEntity): entity is SpaceEntity => 
  entity._type === 'space';

export const isView = (entity: BaseEntity): entity is ViewEntity => 
  entity._type === 'view';

export const isFilter = (entity: BaseEntity): entity is FilterEntity => 
  entity._type === 'filter';

export const isSort = (entity: BaseEntity): entity is SortEntity => 
  entity._type === 'sort';

export const isBreed = (entity: BaseEntity): entity is BreedEntity => 
  entity._type === 'breed';

export const isPet = (entity: BaseEntity): entity is PetEntity => 
  entity._type === 'pet';

export const isKennel = (entity: BaseEntity): entity is KennelEntity => 
  entity._type === 'kennel';

export const isContact = (entity: BaseEntity): entity is ContactEntity => 
  entity._type === 'contact';

// Data entity check
export const isDataEntity = (entity: BaseEntity): boolean =>
  ['breed', 'pet', 'kennel', 'contact'].includes(entity._type);

// Container entity check  
export const isContainerEntity = (entity: BaseEntity): boolean =>
  ['workspace', 'space', 'view'].includes(entity._type);

// Configuration entity check
export const isConfigEntity = (entity: BaseEntity): boolean =>
  ['filter', 'sort'].includes(entity._type);

// ============================================================================
// UNION TYPES FOR CONVENIENCE
// ============================================================================

export type AnyEntity = 
  | WorkspaceEntity 
  | SpaceEntity 
  | ViewEntity 
  | FilterEntity 
  | SortEntity
  | BreedEntity 
  | PetEntity 
  | KennelEntity 
  | ContactEntity;

export type DataEntity = BreedEntity | PetEntity | KennelEntity | ContactEntity;
export type ContainerEntity = WorkspaceEntity | SpaceEntity | ViewEntity;
export type ConfigEntity = FilterEntity | SortEntity;