/**
 * Mock data for lookup values
 */

import { 
  Country, 
  PetType, 
  BreedCategory, 
  CoatType, 
  CoatColor, 
  PetSize 
} from '@/domain/entities/common';

// Countries
export const mockCountries: Country[] = [
  { id: '1', name: 'United States', code: 'US', flag_url: '🇺🇸' },
  { id: '2', name: 'United Kingdom', code: 'GB', flag_url: '🇬🇧' },
  { id: '3', name: 'Canada', code: 'CA', flag_url: '🇨🇦' },
  { id: '4', name: 'Germany', code: 'DE', flag_url: '🇩🇪' },
  { id: '5', name: 'France', code: 'FR', flag_url: '🇫🇷' },
  { id: '6', name: 'Australia', code: 'AU', flag_url: '🇦🇺' },
  { id: '7', name: 'Japan', code: 'JP', flag_url: '🇯🇵' },
  { id: '8', name: 'Poland', code: 'PL', flag_url: '🇵🇱' },
  { id: '9', name: 'Ukraine', code: 'UA', flag_url: '🇺🇦' },
  { id: '10', name: 'Netherlands', code: 'NL', flag_url: '🇳🇱' },
];

// Pet Types
export const mockPetTypes: PetType[] = [
  { id: 'dog', name: 'Dog', code: 'DOG', description: 'Canis familiaris' },
  { id: 'cat', name: 'Cat', code: 'CAT', description: 'Felis catus' },
  { id: 'bird', name: 'Bird', code: 'BIRD', description: 'Avian species' },
  { id: 'rabbit', name: 'Rabbit', code: 'RABBIT', description: 'Oryctolagus cuniculus' },
];

// Breed Categories
export const mockBreedCategories: BreedCategory[] = [
  // Dog categories
  { id: '1', name: 'Sporting Group', pet_type_id: 'dog', description: 'Naturally active and alert' },
  { id: '2', name: 'Hound Group', pet_type_id: 'dog', description: 'Bred for hunting' },
  { id: '3', name: 'Working Group', pet_type_id: 'dog', description: 'Bred to perform jobs' },
  { id: '4', name: 'Terrier Group', pet_type_id: 'dog', description: 'Feisty and energetic' },
  { id: '5', name: 'Toy Group', pet_type_id: 'dog', description: 'Small companion dogs' },
  { id: '6', name: 'Non-Sporting Group', pet_type_id: 'dog', description: 'Diverse group' },
  { id: '7', name: 'Herding Group', pet_type_id: 'dog', description: 'Control movement of other animals' },
  
  // Cat categories
  { id: '8', name: 'Natural', pet_type_id: 'cat', description: 'Naturally occurring breeds' },
  { id: '9', name: 'Mutation', pet_type_id: 'cat', description: 'Breeds with genetic mutations' },
  { id: '10', name: 'Hybrid', pet_type_id: 'cat', description: 'Cross-bred varieties' },
];

// Coat Types
export const mockCoatTypes: CoatType[] = [
  { id: '1', name: 'Short', code: 'SHORT', description: 'Short, smooth coat' },
  { id: '2', name: 'Medium', code: 'MEDIUM', description: 'Medium length coat' },
  { id: '3', name: 'Long', code: 'LONG', description: 'Long, flowing coat' },
  { id: '4', name: 'Wire', code: 'WIRE', description: 'Wiry, rough coat' },
  { id: '5', name: 'Curly', code: 'CURLY', description: 'Curly or wavy coat' },
  { id: '6', name: 'Hairless', code: 'HAIRLESS', description: 'Little to no hair' },
  { id: '7', name: 'Double', code: 'DOUBLE', description: 'Double-layered coat' },
];

// Coat Colors
export const mockCoatColors: CoatColor[] = [
  { id: '1', name: 'Black', code: 'BLACK', hex_color: '#000000' },
  { id: '2', name: 'White', code: 'WHITE', hex_color: '#FFFFFF' },
  { id: '3', name: 'Brown', code: 'BROWN', hex_color: '#8B4513' },
  { id: '4', name: 'Golden', code: 'GOLDEN', hex_color: '#FFD700' },
  { id: '5', name: 'Red', code: 'RED', hex_color: '#B22222' },
  { id: '6', name: 'Cream', code: 'CREAM', hex_color: '#FFFDD0' },
  { id: '7', name: 'Blue', code: 'BLUE', hex_color: '#4682B4' },
  { id: '8', name: 'Silver', code: 'SILVER', hex_color: '#C0C0C0' },
  { id: '9', name: 'Fawn', code: 'FAWN', hex_color: '#E5AA70' },
  { id: '10', name: 'Brindle', code: 'BRINDLE', hex_color: '#3C2414' },
  { id: '11', name: 'Merle', code: 'MERLE', hex_color: '#6B8E23' },
  { id: '12', name: 'Sable', code: 'SABLE', hex_color: '#704214' },
];

// Pet Sizes
export const mockPetSizes: PetSize[] = [
  { 
    id: '1', 
    name: 'Toy', 
    code: 'TOY', 
    description: 'Very small breeds',
    min_weight: 0,
    max_weight: 4,
    min_height: 0,
    max_height: 25
  },
  { 
    id: '2', 
    name: 'Small', 
    code: 'SMALL', 
    description: 'Small breeds',
    min_weight: 4,
    max_weight: 10,
    min_height: 25,
    max_height: 35
  },
  { 
    id: '3', 
    name: 'Medium', 
    code: 'MEDIUM', 
    description: 'Medium breeds',
    min_weight: 10,
    max_weight: 25,
    min_height: 35,
    max_height: 60
  },
  { 
    id: '4', 
    name: 'Large', 
    code: 'LARGE', 
    description: 'Large breeds',
    min_weight: 25,
    max_weight: 40,
    min_height: 60,
    max_height: 70
  },
  { 
    id: '5', 
    name: 'Giant', 
    code: 'GIANT', 
    description: 'Giant breeds',
    min_weight: 40,
    max_weight: 90,
    min_height: 70,
    max_height: 90
  },
];

// Helper functions
export const getRandomCountry = () => mockCountries[Math.floor(Math.random() * mockCountries.length)];
export const getRandomCoatType = () => mockCoatTypes[Math.floor(Math.random() * mockCoatTypes.length)];
export const getRandomCoatColor = () => mockCoatColors[Math.floor(Math.random() * mockCoatColors.length)];
export const getRandomPetSize = () => mockPetSizes[Math.floor(Math.random() * mockPetSizes.length)];