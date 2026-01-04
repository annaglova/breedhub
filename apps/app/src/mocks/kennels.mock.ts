/**
 * Mock data for kennels
 */

import { Kennel, KennelWithRelations } from '@/domain/entities/kennel';
import { VerificationStatus } from '@/domain/entities/common';
import { mockBreeds } from './breeds.mock';
import { mockContacts } from './contacts.mock';
import { mockCountries } from './lookups.mock';

export const mockKennels: Kennel[] = [
  {
    id: 'kennel-1',
    name: 'Golden Valley Kennels',
    prefix: 'Golden Valley',
    display_name: 'Golden Valley Kennels',
    description: 'Specializing in champion Golden Retrievers with excellent temperament and health testing.',
    owner_contact_id: 'contact-1',
    breed_specializations: ['breed-1', 'breed-4'], // Golden Retriever, Labrador
    pet_type_id: 'dog',
    breeding_philosophy: 'We focus on health, temperament, and breed standards to produce exceptional family companions and show dogs.',
    email: 'info@goldenvalleykennels.com',
    phone: '+1 (555) 123-4567',
    website: 'https://www.goldenvalleykennels.com',
    address: '123 Valley Road',
    city: 'New York',
    region: 'NY',
    postal_code: '10001',
    country_id: '1', // USA
    established_year: 2010,
    registration_number: 'AKC-2010-GVK',
    license_number: 'NY-KEN-2010-0123',
    certifications: ['AKC Breeder of Merit', 'OFA Health Testing Certified'],
    kennel_club_memberships: ['American Kennel Club', 'Golden Retriever Club of America'],
    is_active: true,
    is_verified: true,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    avatar_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
    rating: 95,
    review_count: 47,
    pet_count: 156,
    litter_count: 32,
    champion_count: 18,
    accepts_stud_services: true,
    stud_fee_range: { min: 1500, max: 3000 },
    accepts_breeding_contracts: true,
    facebook: 'goldenvalleykennels',
    instagram: '@goldenvalleykennels',
    visiting_hours: 'By appointment only, weekends 10am-4pm',
    appointment_required: true,
    facilities: ['Whelping room', 'Exercise yard', 'Grooming station', 'Training area'],
    health_testing: ['Hip dysplasia', 'Elbow dysplasia', 'Eye clearance', 'Heart clearance'],
    created_at: '2023-01-10T08:00:00Z',
    updated_at: '2024-01-12T10:20:00Z'
  },
  {
    id: 'kennel-2',
    name: 'Royal Crown German Shepherds',
    prefix: 'Royal Crown',
    suffix: 'von Royal Crown',
    display_name: 'Royal Crown German Shepherds',
    description: 'Elite German Shepherd breeding program focusing on working lines and protection dogs.',
    owner_contact_id: 'contact-5',
    breed_specializations: ['breed-2'], // German Shepherd
    pet_type_id: 'dog',
    breeding_philosophy: 'Breeding for intelligence, courage, and loyalty. Our dogs excel in protection, police work, and as family guardians.',
    email: 'contact@royalcrowngsd.de',
    phone: '+49 30 12345678',
    website: 'https://www.royalcrowngsd.de',
    address: 'Schäferhundweg 45',
    city: 'Berlin',
    region: 'Berlin',
    postal_code: '10115',
    country_id: '4', // Germany
    established_year: 2005,
    registration_number: 'SV-2005-RC',
    license_number: 'DE-KEN-2005-0456',
    certifications: ['SV Certified', 'IPO Training Certified', 'FCI Registered'],
    kennel_club_memberships: ['Verein für Deutsche Schäferhunde', 'FCI'],
    is_active: true,
    is_verified: true,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    avatar_url: 'https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=400',
    rating: 98,
    review_count: 62,
    pet_count: 89,
    litter_count: 24,
    champion_count: 31,
    accepts_stud_services: true,
    stud_fee_range: { min: 2000, max: 5000 },
    accepts_breeding_contracts: true,
    facebook: 'royalcrowngsd',
    instagram: '@royalcrowngsd',
    youtube: 'RoyalCrownGSD',
    visiting_hours: 'Monday-Friday 2pm-6pm, Saturday 10am-2pm',
    appointment_required: true,
    facilities: ['Indoor training hall', 'Outdoor training field', 'Puppy playground', 'Veterinary room'],
    health_testing: ['Hip and elbow scoring', 'DM testing', 'Degenerative myelopathy', 'Working ability test'],
    created_at: '2023-02-15T10:30:00Z',
    updated_at: '2024-01-10T14:15:00Z'
  },
  {
    id: 'kennel-3',
    name: 'Petit Amour French Bulldogs',
    prefix: 'Petit Amour',
    display_name: 'Petit Amour French Bulldogs',
    description: 'Boutique French Bulldog kennel specializing in rare colors and exceptional temperaments.',
    owner_contact_id: 'contact-6',
    breed_specializations: ['breed-3'], // French Bulldog
    pet_type_id: 'dog',
    breeding_philosophy: 'Quality over quantity. We produce limited litters focusing on health, structure, and the unique French Bulldog personality.',
    email: 'hello@petitamourfb.fr',
    phone: '+33 1 23 45 67 89',
    website: 'https://www.petitamourfb.fr',
    address: '15 Rue des Champs',
    city: 'Paris',
    region: 'Île-de-France',
    postal_code: '75001',
    country_id: '5', // France
    established_year: 2015,
    registration_number: 'LOF-2015-PA',
    license_number: 'FR-KEN-2015-0789',
    certifications: ['FCI Registered', 'French Bulldog Club Certified'],
    kennel_club_memberships: ['Société Centrale Canine', 'French Bulldog Club of France'],
    is_active: true,
    is_verified: true,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    avatar_url: 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400',
    rating: 92,
    review_count: 38,
    pet_count: 45,
    litter_count: 12,
    champion_count: 8,
    accepts_stud_services: true,
    stud_fee_range: { min: 1800, max: 3500 },
    accepts_breeding_contracts: false,
    facebook: 'petitamourfb',
    instagram: '@petitamour_frenchies',
    visiting_hours: 'By appointment only',
    appointment_required: true,
    facilities: ['Climate-controlled nursery', 'Play area', 'Grooming salon'],
    health_testing: ['BOAS assessment', 'Spine x-ray', 'Patella evaluation', 'Genetic testing'],
    created_at: '2023-03-20T12:00:00Z',
    updated_at: '2024-01-08T09:15:00Z'
  },
  {
    id: 'kennel-4',
    name: 'Majestic Maine Coons',
    prefix: 'Majestic',
    display_name: 'Majestic Maine Coons Cattery',
    description: 'Award-winning Maine Coon cattery breeding for size, health, and the gentle giant personality.',
    owner_contact_id: 'contact-2',
    breed_specializations: ['breed-7'], // Maine Coon
    pet_type_id: 'cat',
    breeding_philosophy: 'Preserving the natural beauty and gentle nature of Maine Coons while ensuring optimal health and longevity.',
    email: 'info@majesticmainecoons.com',
    phone: '+1 (555) 234-5678',
    website: 'https://www.majesticmainecoons.com',
    address: '456 Forest Lane',
    city: 'Los Angeles',
    region: 'CA',
    postal_code: '90001',
    country_id: '1', // USA
    established_year: 2012,
    registration_number: 'TICA-2012-MMC',
    license_number: 'CA-CAT-2012-0234',
    certifications: ['TICA Outstanding Cattery', 'CFA Cattery of Excellence'],
    kennel_club_memberships: ['The International Cat Association', 'Cat Fanciers Association'],
    is_active: true,
    is_verified: true,
    verification_status: VerificationStatus.VERIFIED,
    is_public: true,
    avatar_url: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400',
    rating: 94,
    review_count: 29,
    pet_count: 67,
    litter_count: 18,
    champion_count: 12,
    accepts_stud_services: true,
    stud_fee_range: { min: 800, max: 1500 },
    accepts_breeding_contracts: true,
    facebook: 'majesticmainecoons',
    instagram: '@majestic_mainecoons',
    visiting_hours: 'Saturdays 1pm-4pm',
    appointment_required: true,
    facilities: ['Kitten nursery', 'Cat runs', 'Grooming area', 'Quarantine room'],
    health_testing: ['HCM screening', 'PKD testing', 'Hip dysplasia', 'FeLV/FIV testing'],
    created_at: '2023-02-01T09:00:00Z',
    updated_at: '2024-01-11T14:20:00Z'
  },
  {
    id: 'kennel-5',
    name: 'Yorkshire Dreams',
    prefix: 'Dreams',
    display_name: 'Yorkshire Dreams Kennel',
    description: 'Small family kennel dedicated to breeding healthy, beautiful Yorkshire Terriers.',
    owner_contact_id: 'contact-3',
    breed_specializations: ['breed-5'], // Yorkshire Terrier
    pet_type_id: 'dog',
    breeding_philosophy: 'Focus on temperament and health in toy breeds, producing loving companions for families.',
    email: 'info@yorkshiredreams.co.uk',
    phone: '+44 20 7123 4567',
    website: 'https://www.yorkshiredreams.co.uk',
    address: '789 Terrier Lane',
    city: 'London',
    region: 'England',
    postal_code: 'SW1A 1AA',
    country_id: '2', // UK
    established_year: 2018,
    registration_number: 'KC-2018-YD',
    license_number: 'UK-KEN-2018-0567',
    certifications: ['Kennel Club Assured Breeder'],
    kennel_club_memberships: ['The Kennel Club UK', 'Yorkshire Terrier Club'],
    is_active: true,
    is_verified: false,
    verification_status: VerificationStatus.PENDING,
    is_public: true,
    avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    rating: 86,
    review_count: 21,
    pet_count: 34,
    litter_count: 9,
    champion_count: 3,
    accepts_stud_services: false,
    accepts_breeding_contracts: false,
    facebook: 'yorkshiredreams',
    instagram: '@yorkshire_dreams',
    visiting_hours: 'By appointment only',
    appointment_required: true,
    facilities: ['Puppy room', 'Garden play area'],
    health_testing: ['Patella testing', 'Eye testing', 'Liver shunt testing'],
    created_at: '2023-04-10T11:00:00Z',
    updated_at: '2024-01-06T16:30:00Z'
  }
];

// Helper functions
export const getKennelWithRelations = (kennelId: string): KennelWithRelations | undefined => {
  const kennel = mockKennels.find(k => k.id === kennelId);
  if (!kennel) return undefined;

  return {
    ...kennel,
    owner: mockContacts.find(c => c.id === kennel.owner_contact_id),
    breeds: kennel.breed_specializations.map(breedId => 
      mockBreeds.find(b => b.id === breedId)
    ).filter(Boolean),
    country: mockCountries.find(c => c.id === kennel.country_id),
    years_established: new Date().getFullYear() - (kennel.established_year || new Date().getFullYear()),
    success_rate: 85 + Math.floor(Math.random() * 15),
    average_litter_size: 4 + Math.floor(Math.random() * 5),
    champion_percentage: kennel.champion_count && kennel.pet_count 
      ? Math.round((kennel.champion_count / kennel.pet_count) * 100)
      : 0
  };
};

export const getRandomKennel = () => mockKennels[Math.floor(Math.random() * mockKennels.length)];

export const getVerifiedKennels = () => mockKennels.filter(k => k.verification_status === VerificationStatus.VERIFIED);

export const getKennelsByBreed = (breedId: string) => 
  mockKennels.filter(k => k.breed_specializations.includes(breedId));

export const getKennelsByCountry = (countryId: string) => 
  mockKennels.filter(k => k.country_id === countryId);

export const getTopRatedKennels = (limit: number = 5) =>
  mockKennels
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);

/**
 * Convert mock kennel to list card format
 */
export const toKennelListCardFormat = (kennel: Kennel) => ({
  id: kennel.id,
  name: kennel.name,
  avatar_url: kennel.avatar_url,
  has_user: kennel.is_verified,
  verification_status: kennel.verification_status,
  owner: { name: mockContacts.find(c => c.id === kennel.owner_contact_id)?.name },
  federation: { alternative_name: kennel.kennel_club_memberships?.[0] },
  established_year: kennel.established_year,
  has_notes: Math.random() > 0.7,
  tier_marks: Math.random() > 0.5 ? {
    owner: { contact_name: "Premium Member", product_name: "Gold" }
  } : undefined,
  services: Math.random() > 0.6 ? { "1": "stud", "2": "puppies" } : undefined,
});

/**
 * Get all kennels in list card format
 */
export const getKennelsForListView = () => mockKennels.map(toKennelListCardFormat);