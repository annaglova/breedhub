import { describe, expect, it } from 'vitest';

import { mapKennelPetRecordToPet } from '../src/utils/pet-card.mappers';

describe('mapKennelPetRecordToPet', () => {
  it('maps a kennel view record with related links into a PetCard shape', () => {
    const pet = mapKennelPetRecordToPet({
      pet_id: 'pet-1',
      pet_name: 'Alpha',
      pet_slug: 'alpha',
      pet_avatar_url: 'https://cdn.example.com/alpha.jpg',
      sex_name: 'Male',
      date_of_birth: '2024-01-02',
      country_of_birth_name: 'Ukraine',
      breed_id: 'breed-1',
      breed_name: 'Samoyed',
      breed_slug: 'samoyed',
      father_id: 'father-1',
      father_name: 'Thor',
      father_slug: 'thor',
      mother_id: 'mother-1',
      mother_name: 'Freya',
      mother_slug: 'freya',
    });

    expect(pet).toEqual({
      id: 'pet-1',
      name: 'Alpha',
      url: '/alpha',
      avatarUrl: 'https://cdn.example.com/alpha.jpg',
      sex: 'male',
      dateOfBirth: '2024-01-02',
      countryOfBirth: 'Ukraine',
      breed: {
        id: 'breed-1',
        name: 'Samoyed',
        url: '/samoyed',
      },
      father: {
        id: 'father-1',
        name: 'Thor',
        url: '/thor',
      },
      mother: {
        id: 'mother-1',
        name: 'Freya',
        url: '/freya',
      },
    });
  });

  it('omits optional relations and falls back to empty URLs when slugs are missing', () => {
    const pet = mapKennelPetRecordToPet({
      pet_id: 'pet-2',
      pet_name: 'Beta',
      sex_name: 'Female',
    });

    expect(pet).toEqual({
      id: 'pet-2',
      name: 'Beta',
      url: '',
      avatarUrl: '',
      sex: 'female',
      dateOfBirth: undefined,
      countryOfBirth: undefined,
      breed: undefined,
      father: undefined,
      mother: undefined,
    });
  });
});
