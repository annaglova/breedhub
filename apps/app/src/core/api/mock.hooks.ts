/**
 * Mock Data Hooks
 * Temporary hooks using mock data for development
 */

import { useQuery } from '@tanstack/react-query';
import { MockDataService } from '@/mocks';

// Query Keys for mock data
export const mockQueryKeys = {
  breeds: {
    all: ['mock-breeds'] as const,
    list: (params?: any) => [...mockQueryKeys.breeds.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.breeds.all, 'detail', id] as const,
  },
  pets: {
    all: ['mock-pets'] as const,
    list: (params?: any) => [...mockQueryKeys.pets.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.pets.all, 'detail', id] as const,
  },
  kennels: {
    all: ['mock-kennels'] as const,
    list: (params?: any) => [...mockQueryKeys.kennels.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.kennels.all, 'detail', id] as const,
  },
  litters: {
    all: ['mock-litters'] as const,
    list: (params?: any) => [...mockQueryKeys.litters.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.litters.all, 'detail', id] as const,
  },
  contacts: {
    all: ['mock-contacts'] as const,
    list: (params?: any) => [...mockQueryKeys.contacts.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.contacts.all, 'detail', id] as const,
  },
  events: {
    all: ['mock-events'] as const,
    list: (params?: any) => [...mockQueryKeys.events.all, 'list', params] as const,
    detail: (id: string) => [...mockQueryKeys.events.all, 'detail', id] as const,
  },
};

// Breed Hooks with Mock Data
export const useMockBreeds = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.breeds.list(params),
    queryFn: () => MockDataService.getBreeds(params),
  });
};

export const useMockBreed = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.breeds.detail(id),
    queryFn: () => MockDataService.getBreedById(id),
    enabled: !!id,
  });
};

// Pet Hooks with Mock Data
export const useMockPets = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.pets.list(params),
    queryFn: () => MockDataService.getPets(params),
  });
};

export const useMockPet = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.pets.detail(id),
    queryFn: () => MockDataService.getPetById(id),
    enabled: !!id,
  });
};

// Kennel Hooks with Mock Data
export const useMockKennels = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.kennels.list(params),
    queryFn: () => MockDataService.getKennels(params),
  });
};

export const useMockKennel = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.kennels.detail(id),
    queryFn: () => MockDataService.getKennelById(id),
    enabled: !!id,
  });
};

// Litter Hooks with Mock Data
export const useMockLitters = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.litters.list(params),
    queryFn: () => MockDataService.getLitters(params),
  });
};

export const useMockLitter = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.litters.detail(id),
    queryFn: () => MockDataService.getLitterById(id),
    enabled: !!id,
  });
};

// Contact Hooks with Mock Data
export const useMockContacts = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.contacts.list(params),
    queryFn: () => MockDataService.getContacts(params),
  });
};

export const useMockContact = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.contacts.detail(id),
    queryFn: () => MockDataService.getContactById(id),
    enabled: !!id,
  });
};

// Event Hooks with Mock Data
export const useMockEvents = (params?: any) => {
  return useQuery({
    queryKey: mockQueryKeys.events.list(params),
    queryFn: () => MockDataService.getEvents(params),
  });
};

export const useMockEvent = (id: string) => {
  return useQuery({
    queryKey: mockQueryKeys.events.detail(id),
    queryFn: () => MockDataService.getEventById(id),
    enabled: !!id,
  });
};

// Global Search Hook with Mock Data
export const useMockGlobalSearch = (query: string) => {
  return useQuery({
    queryKey: ['mock-search', query],
    queryFn: () => MockDataService.globalSearch(query),
    enabled: !!query && query.length > 2,
  });
};