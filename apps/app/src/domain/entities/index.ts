/**
 * Domain Entities Index
 * Централізований експорт всіх доменних сутностей
 */

// Base types and enums
export * from './common';

// Core entities
export * from './pet';
export * from './breed';
export * from './contact';
export * from './litter';
export * from './account';
export * from './kennel';
export * from './event';

// Entity types collection for easy access
export type {
  // Pet
  Pet,
  PetFormData,
  PetCreateData,
  PetUpdateData,
  PetWithRelations,
  
  // Breed
  Breed,
  BreedFormData,
  BreedCreateData,
  BreedUpdateData,
  BreedWithRelations,
  BreedDivision,
  
  // Contact
  Contact,
  ContactFormData,
  ContactCreateData,
  ContactUpdateData,
  ContactWithRelations,
  ContactAddress,
  ContactCommunication,
  
  // Litter
  Litter,
  LitterFormData,
  LitterCreateData,
  LitterUpdateData,
  LitterWithRelations,
  Puppy,
  
  // Account
  Account,
  AccountFormData,
  AccountCreateData,
  AccountUpdateData,
  AccountWithRelations,
  AccountMembership,
  AccountSubscription,
  
  // Kennel
  Kennel,
  KennelFormData,
  KennelCreateData,
  KennelUpdateData,
  KennelWithRelations,
  KennelReview,
  KennelBreedingProgram,
  
  // Event
  Event,
  EventFormData,
  EventCreateData,
  EventUpdateData,
  EventWithRelations,
  EventParticipant,
  EventResult,
  EventSchedule,
  
  // Common/Lookup types
  BaseEntity,
  LookupValue,
  Country,
  PetType,
  BreedCategory,
  CoatType,
  CoatColor,
  PetSize,
} from './common';

// Schema exports for validation
export { PetSchema } from './pet';
export { BreedSchema, BreedDivisionSchema } from './breed';
export { ContactSchema, ContactAddressSchema } from './contact';
export { LitterSchema, PuppySchema } from './litter';
export { AccountSchema, AccountMembershipSchema } from './account';
export { KennelSchema, KennelReviewSchema } from './kennel';
export { EventSchema, EventParticipantSchema } from './event';

// Utility exports
export { PetUtils } from './pet';
export { BreedUtils } from './breed';
export { ContactUtils } from './contact';
export { LitterUtils } from './litter';
export { AccountUtils } from './account';
export { KennelUtils } from './kennel';
export { EventUtils } from './event';

// Enum collections for easy access
import {
  Sex,
  PetStatus,
  VerificationStatus,
  LitterStatus,
  AccountType,
  EventType,
  EventStatus,
} from './common';

export const EntityEnums = {
  Sex,
  PetStatus,
  VerificationStatus,
  LitterStatus,
  AccountType,
  EventType,
  EventStatus,
};