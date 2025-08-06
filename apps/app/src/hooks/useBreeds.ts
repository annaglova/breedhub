import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { mockBreeds } from '@/mocks/breeds.mock';

export function useBreeds(params: {
  rows?: number;
  from?: number;
  filters?: any;
} = {}) {
  return useQuery({
    queryKey: ['breeds', params],
    queryFn: async () => {
      // Use mock data for now since API is not working
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      // Transform mock data to API format
      const transformedBreeds = mockBreeds.slice(0, params?.rows || 60).map(breed => ({
        Id: breed.id,
        Name: breed.name,
        PetProfileCount: breed.pet_profile_count,
        KennelCount: breed.kennel_count,
        PatronCount: breed.patron_count,
        AchievementProgress: breed.achievement_progress,
        HasNotes: breed.has_notes || false,
        Avatar: breed.avatar_url,
        TopPatrons: breed.top_patrons || [],
      }));
      
      return {
        entities: transformedBreeds,
        total: mockBreeds.length
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBreedById(id: string | undefined) {
  return useQuery({
    queryKey: ['breed', id],
    queryFn: () => id ? api.getBreedById(id) : null,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}