import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiService, ApiResponse, PaginatedResponse, QueryParams } from './api.service';
import { BaseEntity } from '../../shared/types/common';

/**
 * React Query hooks для роботи з API
 */

/**
 * Hook для отримання списку записів
 */
export function useApiList<T extends BaseEntity>(
  tableName: string,
  params?: QueryParams,
  options?: Omit<UseQueryOptions<ApiResponse<PaginatedResponse<T>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['api', tableName, 'list', params],
    queryFn: () => apiService.getList<T>(tableName, params),
    ...options,
  });
}

/**
 * Hook для отримання одного запису за ID
 */
export function useApiById<T extends BaseEntity>(
  tableName: string,
  id: string | undefined,
  options?: Omit<UseQueryOptions<ApiResponse<T>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['api', tableName, 'byId', id],
    queryFn: () => apiService.getById<T>(tableName, id!),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook для створення нового запису
 */
export function useApiCreate<T extends BaseEntity>(tableName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<T>) => apiService.create<T>(tableName, data),
    onSuccess: () => {
      // Інвалідуємо кеш списків для оновлення UI
      queryClient.invalidateQueries({ queryKey: ['api', tableName, 'list'] });
    },
  });
}

/**
 * Hook для оновлення запису
 */
export function useApiUpdate<T extends BaseEntity>(tableName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      apiService.update<T>(tableName, id, data),
    onSuccess: (_, { id }) => {
      // Інвалідуємо кеш конкретного запису та списків
      queryClient.invalidateQueries({ queryKey: ['api', tableName, 'byId', id] });
      queryClient.invalidateQueries({ queryKey: ['api', tableName, 'list'] });
    },
  });
}

/**
 * Hook для видалення запису
 */
export function useApiDelete(tableName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.delete(tableName, id),
    onSuccess: (_, id) => {
      // Видаляємо запис з кешу та інвалідуємо списки
      queryClient.removeQueries({ queryKey: ['api', tableName, 'byId', id] });
      queryClient.invalidateQueries({ queryKey: ['api', tableName, 'list'] });
    },
  });
}

/**
 * Hook для масового видалення
 */
export function useApiMassDelete(tableName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiService.massDelete(tableName, ids),
    onSuccess: (_, ids) => {
      // Видаляємо записи з кешу та інвалідуємо списки
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: ['api', tableName, 'byId', id] });
      });
      queryClient.invalidateQueries({ queryKey: ['api', tableName, 'list'] });
    },
  });
}

/**
 * Hook для виконання raw SQL запитів
 */
export function useApiRawQuery<T>(
  queryName: string,
  query: string,
  params?: any[],
  options?: Omit<UseQueryOptions<ApiResponse<T[]>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['api', 'raw', queryName, query, params],
    queryFn: () => apiService.rawQuery<T>(query, params),
    ...options,
  });
}

/**
 * Типізовані hooks для конкретних сутностей
 */

// Breeds
export const useBreeds = (params?: QueryParams) => 
  useApiList('breeds', params);

export const useBreed = (id: string | undefined) => 
  useApiById('breeds', id);

export const useCreateBreed = () => 
  useApiCreate('breeds');

export const useUpdateBreed = () => 
  useApiUpdate('breeds');

export const useDeleteBreed = () => 
  useApiDelete('breeds');

// Pets
export const usePets = (params?: QueryParams) => 
  useApiList('pets', params);

export const usePet = (id: string | undefined) => 
  useApiById('pets', id);

export const useCreatePet = () => 
  useApiCreate('pets');

export const useUpdatePet = () => 
  useApiUpdate('pets');

export const useDeletePet = () => 
  useApiDelete('pets');

// Litters
export const useLitters = (params?: QueryParams) => 
  useApiList('litters', params);

export const useLitter = (id: string | undefined) => 
  useApiById('litters', id);

export const useCreateLitter = () => 
  useApiCreate('litters');

export const useUpdateLitter = () => 
  useApiUpdate('litters');

export const useDeleteLitter = () => 
  useApiDelete('litters');

// Contacts
export const useContacts = (params?: QueryParams) => 
  useApiList('contacts', params);

export const useContact = (id: string | undefined) => 
  useApiById('contacts', id);

export const useCreateContact = () => 
  useApiCreate('contacts');

export const useUpdateContact = () => 
  useApiUpdate('contacts');

export const useDeleteContact = () => 
  useApiDelete('contacts');

// Kennels
export const useKennels = (params?: QueryParams) => 
  useApiList('kennels', params);

export const useKennel = (id: string | undefined) => 
  useApiById('kennels', id);

export const useCreateKennel = () => 
  useApiCreate('kennels');

export const useUpdateKennel = () => 
  useApiUpdate('kennels');

export const useDeleteKennel = () => 
  useApiDelete('kennels');