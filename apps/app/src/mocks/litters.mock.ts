/**
 * Mock data for litters
 */

import { Litter, LitterWithRelations, Puppy } from '@/domain/entities/litter';
import { LitterStatus, VerificationStatus, Sex } from '@/domain/entities/common';
import { mockPets } from './pets.mock';
import { mockBreeds } from './breeds.mock';
import { mockContacts } from './contacts.mock';
import { mockKennels } from './kennels.mock';
import { mockCountries } from './lookups.mock';

const generateLitterName = (fatherName: string, motherName: string): string => {
  const prefixes = ['Spring', 'Summer', 'Autumn', 'Winter', 'Golden', 'Silver', 'Royal', 'Majestic'];
  const suffixes = ['Litter', 'Puppies', 'Babies', 'Stars', 'Dreams', 'Wonders'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
};

export const mockLitters: Litter[] = [
  {
    id: 'litter-1',
    name: 'Golden Valley Spring Stars',
    litter_number: 'GVK-2023-A',
    registration_number: 'AKC-L-2023-0145',
    father_id: 'pet-1', // Max (Golden Retriever)
    mother_id: 'pet-2', // Bella (Golden Retriever)
    breed_id: 'breed-1', // Golden Retriever
    planned_date: '2023-01-15',
    mating_date: '2023-03-10',
    birth_date: '2023-05-12',
    registration_date: '2023-07-20',
    status: LitterStatus.COMPLETED,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    breeder_id: 'contact-1',
    kennel_id: 'kennel-1',
    expected_count: 8,
    actual_count: 7,
    male_count: 4,
    female_count: 3,
    alive_count: 7,
    average_birth_weight: 450,
    min_birth_weight: 380,
    max_birth_weight: 520,
    notes: 'Excellent litter, all puppies healthy and strong.',
    breeding_notes: 'Natural mating, no complications.',
    health_notes: 'All puppies passed veterinary check at 8 weeks.',
    birth_location: 'Golden Valley Kennels',
    country_of_birth_id: '1', // USA
    is_champion_bloodline: true,
    inbreeding_coefficient: 3.2,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-08-15T14:30:00Z'
  },
  {
    id: 'litter-2',
    name: 'Royal Crown Protection Line',
    litter_number: 'RC-2023-B',
    registration_number: 'SV-L-2023-0678',
    father_id: 'pet-3', // Thunder (German Shepherd)
    mother_id: 'pet-4', // Shadow (German Shepherd)
    breed_id: 'breed-2', // German Shepherd
    planned_date: '2023-06-01',
    mating_date: '2023-08-15',
    birth_date: '2023-10-17',
    status: LitterStatus.REGISTERED,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    breeder_id: 'contact-5',
    kennel_id: 'kennel-2',
    expected_count: 9,
    actual_count: 9,
    male_count: 5,
    female_count: 4,
    alive_count: 9,
    average_birth_weight: 500,
    min_birth_weight: 450,
    max_birth_weight: 550,
    notes: 'Strong working line puppies, excellent pigmentation.',
    breeding_notes: 'Planned mating for working ability.',
    health_notes: 'All puppies x-rayed at 8 weeks, no issues found.',
    birth_location: 'Royal Crown Kennels',
    country_of_birth_id: '4', // Germany
    is_champion_bloodline: true,
    inbreeding_coefficient: 2.8,
    created_at: '2023-06-01T09:00:00Z',
    updated_at: '2024-01-10T11:20:00Z'
  },
  {
    id: 'litter-3',
    name: 'Petit Amour Valentine Babies',
    litter_number: 'PA-2024-A',
    father_id: 'pet-5', // Coco (French Bulldog)
    mother_id: 'pet-6', // Belle (French Bulldog)
    breed_id: 'breed-3', // French Bulldog
    planned_date: '2023-12-01',
    mating_date: '2024-02-10',
    status: LitterStatus.CONFIRMED,
    verification_status: VerificationStatus.PENDING,
    is_public: true,
    breeder_id: 'contact-6',
    kennel_id: 'kennel-3',
    expected_count: 4,
    notes: 'Planned litter for rare colors.',
    breeding_notes: 'Artificial insemination planned.',
    country_of_birth_id: '5', // France
    is_champion_bloodline: true,
    created_at: '2023-12-01T12:00:00Z',
    updated_at: '2024-01-08T10:15:00Z'
  },
  {
    id: 'litter-4',
    name: 'Majestic Forest Giants',
    litter_number: 'MMC-2023-C',
    registration_number: 'TICA-L-2023-0234',
    father_id: 'pet-7', // King (Maine Coon)
    mother_id: 'pet-8', // Luna (Maine Coon)
    breed_id: 'breed-7', // Maine Coon
    planned_date: '2023-04-01',
    mating_date: '2023-06-05',
    birth_date: '2023-08-10',
    registration_date: '2023-10-15',
    status: LitterStatus.COMPLETED,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    breeder_id: 'contact-2',
    kennel_id: 'kennel-4',
    expected_count: 5,
    actual_count: 6,
    male_count: 4,
    female_count: 2,
    alive_count: 6,
    average_birth_weight: 120,
    min_birth_weight: 100,
    max_birth_weight: 140,
    notes: 'Exceptional litter with great size potential.',
    health_notes: 'All kittens tested negative for HCM gene.',
    birth_location: 'Majestic Maine Coons Cattery',
    country_of_birth_id: '1', // USA
    is_champion_bloodline: true,
    inbreeding_coefficient: 1.5,
    created_at: '2023-04-01T11:00:00Z',
    updated_at: '2023-11-20T15:45:00Z'
  },
  {
    id: 'litter-5',
    name: 'Dreams Tiny Treasures',
    litter_number: 'YD-2024-A',
    father_id: 'pet-9', // Titan (Yorkshire Terrier)
    mother_id: 'pet-10', // Melody (Yorkshire Terrier)
    breed_id: 'breed-5', // Yorkshire Terrier
    planned_date: '2024-01-01',
    status: LitterStatus.PLANNED,
    verification_status: VerificationStatus.UNVERIFIED,
    is_public: true,
    breeder_id: 'contact-3',
    kennel_id: 'kennel-5',
    expected_count: 3,
    notes: 'Planning for spring 2024 litter.',
    country_of_birth_id: '2', // UK
    is_champion_bloodline: false,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-05T10:30:00Z'
  }
];

// Mock puppies for completed litters
export const mockPuppies: Puppy[] = [
  // Golden Retriever puppies (litter-1)
  {
    id: 'puppy-1-1',
    litter_id: 'litter-1',
    temp_name: 'Blue Boy',
    birth_order: 1,
    sex: Sex.MALE,
    birth_weight: 480,
    birth_time: '2023-05-12T02:15:00Z',
    coat_color_notes: 'Medium gold',
    markings: 'White spot on chest',
    is_alive: true,
    health_status: 'Excellent',
    is_available: false,
    is_reserved: true,
    reserved_by: 'contact-7',
    price: 2500,
    notes: 'First born, strong and active',
    created_at: '2023-05-12T02:15:00Z'
  },
  {
    id: 'puppy-1-2',
    litter_id: 'litter-1',
    temp_name: 'Pink Girl',
    birth_order: 2,
    sex: Sex.FEMALE,
    birth_weight: 420,
    birth_time: '2023-05-12T02:45:00Z',
    coat_color_notes: 'Light gold',
    is_alive: true,
    health_status: 'Excellent',
    is_available: false,
    is_reserved: true,
    reserved_by: 'contact-8',
    price: 2500,
    created_at: '2023-05-12T02:45:00Z'
  },
  // Add more puppies as needed...

  // German Shepherd puppies (litter-2)
  {
    id: 'puppy-2-1',
    litter_id: 'litter-2',
    temp_name: 'Alpha',
    birth_order: 1,
    sex: Sex.MALE,
    birth_weight: 550,
    birth_time: '2023-10-17T04:00:00Z',
    coat_color_notes: 'Black and tan',
    markings: 'Strong saddle pattern',
    is_alive: true,
    health_status: 'Excellent',
    veterinary_notes: 'Strong drive, excellent structure',
    is_available: true,
    is_reserved: false,
    price: 3500,
    notes: 'Show and working potential',
    created_at: '2023-10-17T04:00:00Z'
  },
  {
    id: 'puppy-2-2',
    litter_id: 'litter-2',
    temp_name: 'Beta',
    birth_order: 2,
    sex: Sex.FEMALE,
    birth_weight: 500,
    birth_time: '2023-10-17T04:30:00Z',
    coat_color_notes: 'Sable',
    is_alive: true,
    health_status: 'Excellent',
    is_available: true,
    is_reserved: false,
    price: 3500,
    created_at: '2023-10-17T04:30:00Z'
  },

  // Maine Coon kittens (litter-4)
  {
    id: 'puppy-4-1',
    litter_id: 'litter-4',
    temp_name: 'Thor',
    birth_order: 1,
    sex: Sex.MALE,
    birth_weight: 140,
    birth_time: '2023-08-10T06:00:00Z',
    coat_color_notes: 'Silver tabby',
    markings: 'Classic tabby pattern',
    is_alive: true,
    health_status: 'Excellent',
    is_available: false,
    pet_id: 'pet-future-1', // Already registered
    created_at: '2023-08-10T06:00:00Z'
  }
];

// Helper functions
export const getLitterWithRelations = (litterId: string): LitterWithRelations | undefined => {
  const litter = mockLitters.find(l => l.id === litterId);
  if (!litter) return undefined;

  const puppies = mockPuppies.filter(p => p.litter_id === litterId);

  return {
    ...litter,
    father: mockPets.find(p => p.id === litter.father_id),
    mother: mockPets.find(p => p.id === litter.mother_id),
    breed: mockBreeds.find(b => b.id === litter.breed_id),
    breeder: mockContacts.find(c => c.id === litter.breeder_id),
    kennel: litter.kennel_id ? mockKennels.find(k => k.id === litter.kennel_id) : undefined,
    country_of_birth: litter.country_of_birth_id ? mockCountries.find(c => c.id === litter.country_of_birth_id) : undefined,
    puppies,
    gestation_period: litter.mating_date && litter.birth_date 
      ? Math.floor((new Date(litter.birth_date).getTime() - new Date(litter.mating_date).getTime()) / (1000 * 60 * 60 * 24))
      : undefined,
    age_of_puppies: litter.birth_date ? calculatePuppyAge(litter.birth_date) : undefined,
    survival_rate: litter.actual_count && litter.alive_count 
      ? Math.round((litter.alive_count / litter.actual_count) * 100)
      : undefined,
    gender_ratio: litter.male_count !== undefined && litter.female_count !== undefined
      ? {
          male: Math.round((litter.male_count / (litter.male_count + litter.female_count)) * 100),
          female: Math.round((litter.female_count / (litter.male_count + litter.female_count)) * 100)
        }
      : undefined
  };
};

const calculatePuppyAge = (birthDate: string): string => {
  const birth = new Date(birthDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days < 7) return `${days} days`;
  if (days < 56) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
};

export const getRandomLitter = () => mockLitters[Math.floor(Math.random() * mockLitters.length)];

export const getLittersByBreed = (breedId: string) => mockLitters.filter(l => l.breed_id === breedId);

export const getLittersByKennel = (kennelId: string) => mockLitters.filter(l => l.kennel_id === kennelId);

export const getLittersByBreeder = (breederId: string) => mockLitters.filter(l => l.breeder_id === breederId);

export const getActiveLitters = () => mockLitters.filter(l => 
  l.status === LitterStatus.PLANNED || 
  l.status === LitterStatus.CONFIRMED || 
  l.status === LitterStatus.BORN
);

export const getCompletedLitters = () => mockLitters.filter(l => l.status === LitterStatus.COMPLETED);

export const getVerifiedLitters = () => mockLitters.filter(l => l.verification_status === VerificationStatus.VERIFIED);