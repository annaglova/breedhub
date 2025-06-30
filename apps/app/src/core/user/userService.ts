import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { apiService } from '../api';

/**
 * Інтерфейс для користувацького контакту
 * Адаптовано з Angular версії
 */
export interface UserContact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  // Додаткові поля для заводчика
  kennel_id?: string;
  breeder_status?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Стан користувача
 */
export interface UserState {
  contact: UserContact | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook для роботи з користувацьким профілем
 * Замінює Angular UserService
 */
export function useUserService() {
  const { user, authenticated } = useAuth();

  /**
   * Завантаження контактних даних користувача
   */
  const {
    data: contact,
    isLoading: contactLoading,
    error: contactError,
    refetch: refetchContact,
  } = useQuery({
    queryKey: ['user', 'contact', user.id],
    queryFn: async () => {
      if (!user.id) return null;
      
      const response = await apiService.getList<UserContact>('contacts', {
        filters: { user_id: user.id },
        pageSize: 1,
      });

      if (response.success && response.data.data.length > 0) {
        return response.data.data[0];
      }

      return null;
    },
    enabled: !!user.id && authenticated,
    staleTime: 1000 * 60 * 5, // 5 хвилин
  });

  /**
   * Оновлення профілю користувача
   */
  const updateProfile = async (profileData: Partial<UserContact>) => {
    if (!contact?.id) {
      throw new Error('No contact found to update');
    }

    const response = await apiService.update<UserContact>('contacts', contact.id, profileData);
    
    if (response.success) {
      // Оновлюємо кеш
      refetchContact();
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to update profile');
    }
  };

  /**
   * Створення профілю користувача (якщо його немає)
   */
  const createProfile = async (profileData: Partial<UserContact>) => {
    const newContact = {
      ...profileData,
      user_id: user.id,
      email: user.email,
      name: user.name,
    };

    const response = await apiService.create<UserContact>('contacts', newContact);
    
    if (response.success) {
      refetchContact();
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to create profile');
    }
  };

  /**
   * Отримання розплідника користувача
   */
  const {
    data: kennel,
    isLoading: kennelLoading,
    error: kennelError,
  } = useQuery({
    queryKey: ['user', 'kennel', contact?.kennel_id],
    queryFn: async () => {
      if (!contact?.kennel_id) return null;
      
      const response = await apiService.getById('kennels', contact.kennel_id);
      return response.success ? response.data : null;
    },
    enabled: !!contact?.kennel_id,
    staleTime: 1000 * 60 * 10, // 10 хвилин
  });

  /**
   * Отримання породи користувача (якщо він заводчик)
   */
  const {
    data: userBreeds,
    isLoading: breedsLoading,
    error: breedsError,
  } = useQuery({
    queryKey: ['user', 'breeds', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      
      const response = await apiService.getList('breed_in_contact', {
        filters: { contact_id: contact.id },
      });
      
      return response.success ? response.data.data : [];
    },
    enabled: !!contact?.id,
    staleTime: 1000 * 60 * 10, // 10 хвилин
  });

  const state: UserState = {
    contact: contact || null,
    loading: contactLoading || kennelLoading || breedsLoading,
    error: contactError?.message || kennelError?.message || breedsError?.message || null,
  };

  return {
    // State
    ...state,
    user,
    authenticated,
    
    // Contact data
    contact,
    kennel,
    userBreeds,
    
    // Loading states
    contactLoading,
    kennelLoading,
    breedsLoading,
    
    // Error states
    contactError,
    kennelError,
    breedsError,
    
    // Actions
    updateProfile,
    createProfile,
    refetchContact,
    
    // Computed values
    isBreeder: !!contact?.breeder_status,
    hasKennel: !!kennel,
    hasProfile: !!contact,
  };
}

/**
 * Hook для швидкого доступу до основних даних користувача
 */
export function useUser() {
  const { user, contact, authenticated, loading } = useUserService();
  
  return {
    user,
    contact,
    authenticated,
    loading,
    displayName: contact?.name || user.name || 'Guest',
    avatar: contact?.avatar || user.avatar || '/assets/images/avatars/guest.png',
  };
}