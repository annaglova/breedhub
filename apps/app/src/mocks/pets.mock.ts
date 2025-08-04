/**
 * Mock data for pets
 */

import { Pet, PetWithRelations } from '@/domain/entities/pet';
import { Sex, PetStatus, VerificationStatus } from '@/domain/entities/common';
import { mockBreeds } from './breeds.mock';
import { mockContacts } from './contacts.mock';
import { mockKennels } from './kennels.mock';
import { mockCoatTypes, mockCoatColors, mockPetSizes, mockCountries } from './lookups.mock';

const generatePetName = (sex: Sex, breedName: string): string => {
  const maleNames = ['Max', 'Charlie', 'Cooper', 'Buddy', 'Rocky', 'Duke', 'Bear', 'Tucker', 'Oliver', 'Jack'];
  const femaleNames = ['Bella', 'Luna', 'Lucy', 'Daisy', 'Lola', 'Sadie', 'Molly', 'Bailey', 'Stella', 'Maggie'];
  const names = sex === Sex.MALE ? maleNames : femaleNames;
  return names[Math.floor(Math.random() * names.length)];
};

const generateBirthDate = (minYears: number = 1, maxYears: number = 8): string => {
  const years = minYears + Math.floor(Math.random() * (maxYears - minYears));
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toISOString().split('T')[0];
};

export const mockPets: Pet[] = [
  // Golden Retrievers
  {
    id: 'pet-1',
    name: 'Golden Valley\'s Sunshine Hero',
    call_name: 'Max',
    notes: 'Excellent temperament, great with children. Multiple Best in Show winner.',
    date_of_birth: '2019-03-15',
    sex: Sex.MALE,
    pet_type_id: 'dog',
    breed_id: 'breed-1', // Golden Retriever
    owner_id: 'contact-1',
    breeder_id: 'contact-1',
    kennel_id: 'kennel-1',
    coat_type_id: '7', // Double coat
    coat_color_id: '4', // Golden
    size_id: '4', // Large
    weight: 32,
    country_of_birth_id: '1', // USA
    country_of_stay_id: '1',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 95,
    rating_placement_in_breed: 12,
    coi: 3.2,
    inbreeding_percent: 3.2,
    avatar_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400',
    titles: 'CH, CGC, BIS',
    available_for_sale: false,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-01-10T15:30:00Z'
  },
  {
    id: 'pet-2',
    name: 'Golden Valley\'s Morning Star',
    call_name: 'Bella',
    notes: 'Sweet girl, excellent mother. Produced 3 champion offspring.',
    date_of_birth: '2020-05-22',
    sex: Sex.FEMALE,
    pet_type_id: 'dog',
    breed_id: 'breed-1', // Golden Retriever
    father_id: 'pet-1',
    owner_id: 'contact-1',
    breeder_id: 'contact-1',
    kennel_id: 'kennel-1',
    coat_type_id: '7', // Double coat
    coat_color_id: '4', // Golden
    size_id: '4', // Large
    weight: 28,
    country_of_birth_id: '1', // USA
    country_of_stay_id: '1',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 88,
    rating_placement_in_breed: 45,
    avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
    titles: 'CH, CGC',
    available_for_sale: false,
    created_at: '2023-02-10T08:00:00Z',
    updated_at: '2024-01-08T12:20:00Z'
  },

  // German Shepherds
  {
    id: 'pet-3',
    name: 'Royal Crown\'s Thunder von Royal Crown',
    call_name: 'Thunder',
    notes: 'Schutzhund III, excellent protection dog. Hip/elbow A-rated.',
    date_of_birth: '2018-11-10',
    sex: Sex.MALE,
    pet_type_id: 'dog',
    breed_id: 'breed-2', // German Shepherd
    owner_id: 'contact-5',
    breeder_id: 'contact-5',
    kennel_id: 'kennel-2',
    coat_type_id: '7', // Double coat
    coat_color_id: '1', // Black
    size_id: '4', // Large
    weight: 38,
    country_of_birth_id: '4', // Germany
    country_of_stay_id: '4',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 98,
    rating_placement_in_breed: 3,
    coi: 2.8,
    inbreeding_percent: 2.8,
    avatar_url: 'https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=400',
    titles: 'SCH III, IPO III, VA',
    available_for_sale: false,
    created_at: '2023-01-20T09:00:00Z',
    updated_at: '2024-01-12T14:15:00Z'
  },
  {
    id: 'pet-4',
    name: 'Royal Crown\'s Shadow Queen',
    call_name: 'Shadow',
    notes: 'Excellent working female, strong nerves and drive.',
    date_of_birth: '2019-07-18',
    sex: Sex.FEMALE,
    pet_type_id: 'dog',
    breed_id: 'breed-2', // German Shepherd
    owner_id: 'contact-5',
    breeder_id: 'contact-5',
    kennel_id: 'kennel-2',
    coat_type_id: '7', // Double coat
    coat_color_id: '12', // Sable
    size_id: '4', // Large
    weight: 30,
    country_of_birth_id: '4', // Germany
    country_of_stay_id: '4',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 92,
    rating_placement_in_breed: 18,
    avatar_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400',
    titles: 'SCH I, V',
    available_for_sale: false,
    created_at: '2023-02-25T11:30:00Z',
    updated_at: '2024-01-09T16:45:00Z'
  },

  // French Bulldogs
  {
    id: 'pet-5',
    name: 'Petit Amour Chocolat Dream',
    call_name: 'Coco',
    notes: 'Rare chocolate color, excellent structure. BOAS clear.',
    date_of_birth: '2021-02-14',
    sex: Sex.MALE,
    pet_type_id: 'dog',
    breed_id: 'breed-3', // French Bulldog
    owner_id: 'contact-6',
    breeder_id: 'contact-6',
    kennel_id: 'kennel-3',
    coat_type_id: '1', // Short
    coat_color_id: '3', // Brown (chocolate)
    size_id: '2', // Small
    weight: 11,
    country_of_birth_id: '5', // France
    country_of_stay_id: '5',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 90,
    rating_placement_in_breed: 24,
    avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    titles: 'CH, BOB',
    available_for_sale: false,
    created_at: '2023-03-15T13:00:00Z',
    updated_at: '2024-01-07T10:20:00Z'
  },
  {
    id: 'pet-6',
    name: 'Petit Amour Belle Étoile',
    call_name: 'Belle',
    notes: 'Beautiful blue fawn female, perfect companion temperament.',
    date_of_birth: '2021-06-20',
    sex: Sex.FEMALE,
    pet_type_id: 'dog',
    breed_id: 'breed-3', // French Bulldog
    owner_id: 'contact-6',
    breeder_id: 'contact-6',
    kennel_id: 'kennel-3',
    coat_type_id: '1', // Short
    coat_color_id: '9', // Fawn
    size_id: '2', // Small
    weight: 9,
    country_of_birth_id: '5', // France
    country_of_stay_id: '5',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 85,
    rating_placement_in_breed: 56,
    avatar_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
    titles: 'JCH',
    available_for_sale: true,
    created_at: '2023-04-20T14:30:00Z',
    updated_at: '2024-01-05T09:15:00Z'
  },

  // Maine Coons
  {
    id: 'pet-7',
    name: 'Majestic King of the Forest',
    call_name: 'King',
    notes: 'Impressive size, 12kg male. Excellent type and temperament.',
    date_of_birth: '2020-09-12',
    sex: Sex.MALE,
    pet_type_id: 'cat',
    breed_id: 'breed-7', // Maine Coon
    owner_id: 'contact-2',
    breeder_id: 'contact-2',
    kennel_id: 'kennel-4',
    coat_type_id: '3', // Long
    coat_color_id: '8', // Silver
    size_id: '5', // Giant (for cats)
    weight: 12,
    country_of_birth_id: '1', // USA
    country_of_stay_id: '1',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 93,
    rating_placement_in_breed: 8,
    avatar_url: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400',
    titles: 'GC, RW, BW',
    available_for_sale: false,
    created_at: '2023-02-15T10:00:00Z',
    updated_at: '2024-01-11T14:30:00Z'
  },
  {
    id: 'pet-8',
    name: 'Majestic Forest Princess',
    call_name: 'Luna',
    notes: 'Beautiful tortie female, excellent mother.',
    date_of_birth: '2021-03-08',
    sex: Sex.FEMALE,
    pet_type_id: 'cat',
    breed_id: 'breed-7', // Maine Coon
    father_id: 'pet-7',
    owner_id: 'contact-2',
    breeder_id: 'contact-2',
    kennel_id: 'kennel-4',
    coat_type_id: '3', // Long
    coat_color_id: '1', // Black (tortie base)
    size_id: '4', // Large (for cats)
    weight: 7,
    country_of_birth_id: '1', // USA
    country_of_stay_id: '1',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 88,
    rating_placement_in_breed: 22,
    avatar_url: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400',
    titles: 'CH',
    available_for_sale: false,
    created_at: '2023-03-20T11:30:00Z',
    updated_at: '2024-01-09T13:20:00Z'
  },

  // Yorkshire Terriers
  {
    id: 'pet-9',
    name: 'Dreams Tiny Titan',
    call_name: 'Titan',
    notes: 'Small but mighty, excellent show temperament.',
    date_of_birth: '2022-01-05',
    sex: Sex.MALE,
    pet_type_id: 'dog',
    breed_id: 'breed-5', // Yorkshire Terrier
    owner_id: 'contact-3',
    breeder_id: 'contact-3',
    kennel_id: 'kennel-5',
    coat_type_id: '3', // Long
    coat_color_id: '7', // Blue (steel blue and tan)
    size_id: '1', // Toy
    weight: 2.5,
    country_of_birth_id: '2', // UK
    country_of_stay_id: '2',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.PENDING,
    is_public: true,
    rating: 82,
    rating_placement_in_breed: 67,
    avatar_url: 'https://images.unsplash.com/photo-1526440847959-4e38e7f00b04?w=400',
    titles: 'JCH',
    available_for_sale: false,
    created_at: '2023-05-10T12:00:00Z',
    updated_at: '2024-01-04T15:45:00Z'
  },
  {
    id: 'pet-10',
    name: 'Dreams Sweet Melody',
    call_name: 'Melody',
    notes: 'Beautiful silk coat, perfect size for showing.',
    date_of_birth: '2022-04-18',
    sex: Sex.FEMALE,
    pet_type_id: 'dog',
    breed_id: 'breed-5', // Yorkshire Terrier
    owner_id: 'contact-4',
    breeder_id: 'contact-3',
    kennel_id: 'kennel-5',
    coat_type_id: '3', // Long
    coat_color_id: '7', // Blue (steel blue and tan)
    size_id: '1', // Toy
    weight: 2.2,
    country_of_birth_id: '2', // UK
    country_of_stay_id: '1', // USA (sold)
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.UNVERIFIED,
    is_public: true,
    rating: 78,
    rating_placement_in_breed: 89,
    avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    available_for_sale: false,
    created_at: '2023-06-15T14:00:00Z',
    updated_at: '2024-01-02T11:30:00Z'
  },

  // Additional pets for diversity
  {
    id: 'pet-11',
    name: 'Sunshine Labrador\'s Happy Boy',
    call_name: 'Buddy',
    date_of_birth: '2021-08-22',
    sex: Sex.MALE,
    pet_type_id: 'dog',
    breed_id: 'breed-4', // Labrador
    owner_id: 'contact-7',
    breeder_id: 'contact-1',
    kennel_id: 'kennel-1',
    coat_type_id: '1', // Short
    coat_color_id: '1', // Black
    size_id: '4', // Large
    weight: 35,
    country_of_birth_id: '1', // USA
    country_of_stay_id: '3', // Canada
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 86,
    avatar_url: 'https://images.unsplash.com/photo-1608096299210-db7e38487075?w=400',
    created_at: '2023-07-20T10:00:00Z',
    updated_at: '2024-01-03T09:15:00Z'
  },
  {
    id: 'pet-12',
    name: 'Northern Star Husky',
    call_name: 'Star',
    date_of_birth: '2020-12-15',
    sex: Sex.FEMALE,
    pet_type_id: 'dog',
    breed_id: 'breed-6', // Siberian Husky
    owner_id: 'contact-8',
    coat_type_id: '7', // Double coat
    coat_color_id: '2', // White
    size_id: '3', // Medium
    weight: 22,
    country_of_birth_id: '8', // Poland
    country_of_stay_id: '8',
    status: PetStatus.ACTIVE,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    rating: 84,
    avatar_url: 'https://images.unsplash.com/photo-1547407139-3c921a66005c?w=400',
    created_at: '2023-08-15T11:30:00Z',
    updated_at: '2024-01-01T14:20:00Z'
  }
];

// Helper functions
export const getPetWithRelations = (petId: string): PetWithRelations | undefined => {
  const pet = mockPets.find(p => p.id === petId);
  if (!pet) return undefined;

  const father = pet.father_id ? mockPets.find(p => p.id === pet.father_id) : undefined;
  const mother = pet.mother_id ? mockPets.find(p => p.id === pet.mother_id) : undefined;
  const children = mockPets.filter(p => p.father_id === petId || p.mother_id === petId);

  return {
    ...pet,
    father,
    mother,
    children,
    breed: mockBreeds.find(b => b.id === pet.breed_id),
    owner: mockContacts.find(c => c.id === pet.owner_id),
    breeder: pet.breeder_id ? mockContacts.find(c => c.id === pet.breeder_id) : undefined,
    kennel: pet.kennel_id ? mockKennels.find(k => k.id === pet.kennel_id) : undefined,
    coat_type: pet.coat_type_id ? mockCoatTypes.find(ct => ct.id === pet.coat_type_id) : undefined,
    coat_color: pet.coat_color_id ? mockCoatColors.find(cc => cc.id === pet.coat_color_id) : undefined,
    size: pet.size_id ? mockPetSizes.find(s => s.id === pet.size_id) : undefined,
    country_of_birth: pet.country_of_birth_id ? mockCountries.find(c => c.id === pet.country_of_birth_id) : undefined,
    country_of_stay: pet.country_of_stay_id ? mockCountries.find(c => c.id === pet.country_of_stay_id) : undefined,
    age: pet.date_of_birth ? calculateAge(pet.date_of_birth) : undefined,
    offspring_count: children.length
  };
};

const calculateAge = (birthDate: string): string => {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  if (months < 0) {
    return `${years - 1} years ${12 + months} months`;
  }
  return `${years} years ${months} months`;
};

export const getRandomPet = () => mockPets[Math.floor(Math.random() * mockPets.length)];

export const getPetsByBreed = (breedId: string) => mockPets.filter(p => p.breed_id === breedId);

export const getPetsByKennel = (kennelId: string) => mockPets.filter(p => p.kennel_id === kennelId);

export const getPetsByOwner = (ownerId: string) => mockPets.filter(p => p.owner_id === ownerId);

export const getAvailablePets = () => mockPets.filter(p => p.available_for_sale);

export const getChampionPets = () => mockPets.filter(p => p.titles && p.titles.includes('CH'));

export const getVerifiedPets = () => mockPets.filter(p => p.verification_status === VerificationStatus.VERIFIED);