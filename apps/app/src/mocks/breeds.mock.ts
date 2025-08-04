/**
 * Mock data for breeds
 */

import { Breed, BreedWithRelations } from '@/domain/entities/breed';
import { mockBreedCategories } from './lookups.mock';

export const mockBreeds: Breed[] = [
  // Dogs
  {
    id: 'breed-1',
    name: 'Golden Retriever',
    authentic_name: 'Golden Retriever',
    admin_name: 'Golden Retriever',
    pet_type_id: 'dog',
    category_id: '1', // Sporting Group
    language_id: '1',
    differ_by_coat_color: false,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: true,
    pet_profile_count: 1523,
    kennel_count: 87,
    patron_count: 432,
    achievement_progress: 85,
    rating: 92,
    payment_rating: 88,
    avatar_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400',
    url: 'golden-retriever',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-01-10T15:30:00Z'
  },
  {
    id: 'breed-2',
    name: 'German Shepherd',
    authentic_name: 'Deutscher Schäferhund',
    admin_name: 'German Shepherd Dog',
    pet_type_id: 'dog',
    category_id: '7', // Herding Group
    language_id: '4',
    differ_by_coat_color: true,
    differ_by_coat_type: true,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: true,
    pet_profile_count: 2341,
    kennel_count: 156,
    patron_count: 876,
    achievement_progress: 95,
    rating: 96,
    payment_rating: 92,
    avatar_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400',
    url: 'german-shepherd',
    created_at: '2023-01-10T08:00:00Z',
    updated_at: '2024-01-12T10:20:00Z'
  },
  {
    id: 'breed-3',
    name: 'French Bulldog',
    authentic_name: 'Bouledogue Français',
    admin_name: 'French Bulldog',
    pet_type_id: 'dog',
    category_id: '6', // Non-Sporting Group
    language_id: '5',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: true,
    has_related_breed: true,
    pet_profile_count: 1876,
    kennel_count: 98,
    patron_count: 654,
    achievement_progress: 78,
    rating: 89,
    payment_rating: 94,
    avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    url: 'french-bulldog',
    created_at: '2023-02-20T12:00:00Z',
    updated_at: '2024-01-08T09:15:00Z'
  },
  {
    id: 'breed-4',
    name: 'Labrador Retriever',
    authentic_name: 'Labrador Retriever',
    admin_name: 'Labrador Retriever',
    pet_type_id: 'dog',
    category_id: '1', // Sporting Group
    language_id: '1',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: false,
    pet_profile_count: 3245,
    kennel_count: 234,
    patron_count: 1432,
    achievement_progress: 98,
    rating: 97,
    payment_rating: 91,
    avatar_url: 'https://images.unsplash.com/photo-1608096299210-db7e38487075?w=400',
    url: 'labrador-retriever',
    created_at: '2023-01-05T07:00:00Z',
    updated_at: '2024-01-14T16:45:00Z'
  },
  {
    id: 'breed-5',
    name: 'Yorkshire Terrier',
    authentic_name: 'Yorkshire Terrier',
    admin_name: 'Yorkshire Terrier',
    pet_type_id: 'dog',
    category_id: '5', // Toy Group
    language_id: '2',
    differ_by_coat_color: false,
    differ_by_coat_type: false,
    differ_by_size: true,
    differ_by_body_feature: false,
    has_related_breed: false,
    pet_profile_count: 987,
    kennel_count: 65,
    patron_count: 342,
    achievement_progress: 72,
    rating: 84,
    payment_rating: 86,
    avatar_url: 'https://images.unsplash.com/photo-1526440847959-4e38e7f00b04?w=400',
    url: 'yorkshire-terrier',
    created_at: '2023-03-10T14:00:00Z',
    updated_at: '2024-01-06T11:30:00Z'
  },
  {
    id: 'breed-6',
    name: 'Siberian Husky',
    authentic_name: 'Сибирский хаски',
    admin_name: 'Siberian Husky',
    pet_type_id: 'dog',
    category_id: '3', // Working Group
    language_id: '9',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: true,
    has_related_breed: true,
    pet_profile_count: 1654,
    kennel_count: 89,
    patron_count: 567,
    achievement_progress: 81,
    rating: 88,
    payment_rating: 85,
    avatar_url: 'https://images.unsplash.com/photo-1547407139-3c921a66005c?w=400',
    url: 'siberian-husky',
    created_at: '2023-02-01T09:00:00Z',
    updated_at: '2024-01-11T14:20:00Z'
  },
  
  // Cats
  {
    id: 'breed-7',
    name: 'Maine Coon',
    authentic_name: 'Maine Coon',
    admin_name: 'Maine Coon',
    pet_type_id: 'cat',
    category_id: '8', // Natural
    language_id: '1',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: false,
    pet_profile_count: 876,
    kennel_count: 43,
    patron_count: 234,
    achievement_progress: 76,
    rating: 91,
    payment_rating: 88,
    avatar_url: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400',
    url: 'maine-coon',
    created_at: '2023-01-20T11:00:00Z',
    updated_at: '2024-01-09T13:40:00Z'
  },
  {
    id: 'breed-8',
    name: 'Persian',
    authentic_name: 'پرشین',
    admin_name: 'Persian Cat',
    pet_type_id: 'cat',
    category_id: '8', // Natural
    language_id: '1',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: true,
    has_related_breed: true,
    pet_profile_count: 654,
    kennel_count: 34,
    patron_count: 187,
    achievement_progress: 68,
    rating: 85,
    payment_rating: 82,
    avatar_url: 'https://images.unsplash.com/photo-1567270671170-fdc10a5bf831?w=400',
    url: 'persian',
    created_at: '2023-02-15T13:00:00Z',
    updated_at: '2024-01-07T10:25:00Z'
  },
  {
    id: 'breed-9',
    name: 'British Shorthair',
    authentic_name: 'British Shorthair',
    admin_name: 'British Shorthair',
    pet_type_id: 'cat',
    category_id: '8', // Natural
    language_id: '2',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: false,
    pet_profile_count: 543,
    kennel_count: 28,
    patron_count: 156,
    achievement_progress: 64,
    rating: 83,
    payment_rating: 79,
    avatar_url: 'https://images.unsplash.com/photo-1600357077527-930ccbaf7773?w=400',
    url: 'british-shorthair',
    created_at: '2023-03-05T10:00:00Z',
    updated_at: '2024-01-05T15:10:00Z'
  },
  {
    id: 'breed-10',
    name: 'Ragdoll',
    authentic_name: 'Ragdoll',
    admin_name: 'Ragdoll',
    pet_type_id: 'cat',
    category_id: '8', // Natural
    language_id: '1',
    differ_by_coat_color: true,
    differ_by_coat_type: false,
    differ_by_size: false,
    differ_by_body_feature: false,
    has_related_breed: false,
    pet_profile_count: 432,
    kennel_count: 23,
    patron_count: 123,
    achievement_progress: 58,
    rating: 82,
    payment_rating: 77,
    avatar_url: 'https://images.unsplash.com/photo-1622019273970-23c87f863979?w=400',
    url: 'ragdoll',
    created_at: '2023-04-01T12:00:00Z',
    updated_at: '2024-01-04T08:30:00Z'
  }
];

// Helper function to get breed with relations
export const getBreedWithRelations = (breedId: string): BreedWithRelations | undefined => {
  const breed = mockBreeds.find(b => b.id === breedId);
  if (!breed) return undefined;

  return {
    ...breed,
    category: mockBreedCategories.find(c => c.id === breed.category_id),
    total_pets: breed.pet_profile_count,
    active_pets: Math.floor(breed.pet_profile_count * 0.85),
    average_rating: breed.rating,
    popular_coat_colors: [
      { color: { id: '1', name: 'Black' }, count: Math.floor(breed.pet_profile_count * 0.3) },
      { color: { id: '2', name: 'White' }, count: Math.floor(breed.pet_profile_count * 0.25) },
      { color: { id: '4', name: 'Golden' }, count: Math.floor(breed.pet_profile_count * 0.2) },
    ],
  };
};

// Helper functions
export const getRandomBreed = (petType?: string) => {
  const breeds = petType 
    ? mockBreeds.filter(b => b.pet_type_id === petType)
    : mockBreeds;
  return breeds[Math.floor(Math.random() * breeds.length)];
};

export const getTopBreeds = (petType?: string, limit: number = 5) => {
  const breeds = petType 
    ? mockBreeds.filter(b => b.pet_type_id === petType)
    : mockBreeds;
  return breeds
    .sort((a, b) => b.pet_profile_count - a.pet_profile_count)
    .slice(0, limit);
};