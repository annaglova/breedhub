import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../store/reduxHooks';

/**
 * Hook для синхронізації React Router з Redux navigation store
 * Замінює Angular Router events subscription в BPNavStore
 */
export const useNavigationSync = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();

  // Синхронізація поточного URL з Redux store
  useEffect(() => {
    const currentUrl = location.pathname + location.search + location.hash;
    
    if (currentUrl !== navigation.currentUrl) {
      navigation.setCurrentUrl(currentUrl);
      
      // Додаємо до історії навігації
      navigation.addToHistory({
        url: currentUrl,
        name: getPageName(location.pathname),
      });
    }
  }, [location, navigation]);

  // Функції для програмної навігації
  const navigationActions = {
    // Навігація з оновленням Redux store
    navigateTo: (path: string, options?: { replace?: boolean; state?: any }) => {
      navigate(path, options);
    },

    // Навігація назад
    goBack: () => {
      if (navigation.history.length >= 2) {
        navigation.navigateBack();
        const previousEntry = navigation.history[navigation.history.length - 2];
        if (previousEntry) {
          navigate(previousEntry.url, { replace: true });
        }
      } else {
        navigate(-1);
      }
    },

    // Навігація до запису в історії
    goToHistoryEntry: (entryId: number) => {
      const entry = navigation.history.find(e => e.id === entryId);
      if (entry) {
        navigation.navigateToHistoryEntry(entryId);
        navigate(entry.url, { replace: true });
      }
    },

    // Навігація з query параметрами
    navigateWithQuery: (path: string, queryParams: Record<string, any>) => {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
      
      const fullPath = searchParams.toString() 
        ? `${path}?${searchParams.toString()}`
        : path;
      
      navigate(fullPath);
    },

    // Оновлення query параметрів без навігації
    updateQueryParams: (newParams: Record<string, any>, replace = false) => {
      const searchParams = new URLSearchParams(location.search);
      
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value.toString());
        }
      });

      const newSearch = searchParams.toString();
      const newPath = location.pathname + (newSearch ? `?${newSearch}` : '') + location.hash;
      
      navigate(newPath, { replace });
    },

    // Оновлення фрагменту
    updateFragment: (fragment: string | null, replace = false) => {
      const newPath = location.pathname + location.search + (fragment ? `#${fragment}` : '');
      navigate(newPath, { replace });
    },

    // Навігація для редагування запису
    editRecord: (id: string, model: string, queryParams?: Record<string, any>) => {
      navigationActions.navigateWithQuery(`/edit/${model.toLowerCase()}/${id}`, queryParams || {});
    },

    // Навігація до деталей запису
    viewRecord: (id: string, model: string, queryParams?: Record<string, any>) => {
      navigationActions.navigateWithQuery(`/${model.toLowerCase()}/${id}`, queryParams || {});
    },

    // Зміна view в поточному URL
    changeView: (view: string) => {
      navigation.changeView(view);
      navigationActions.updateQueryParams({ view });
    },

    // Зміна сортування
    changeSort: (sort: string) => {
      navigation.changeSort(sort);
      navigationActions.updateQueryParams({ sort });
    },

    // Зміна фільтрів
    changeFilters: (filters: Record<string, any>) => {
      navigation.changeFilters(filters);
      navigationActions.updateQueryParams(filters, true);
    },
  };

  return {
    // Current state
    location,
    currentUrl: navigation.currentUrl,
    queryParams: navigation.queryParams,
    fragment: navigation.fragment,
    history: navigation.history,
    
    // Actions
    ...navigationActions,
  };
};

// Helper function to extract page name from pathname
const getPageName = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'Home';
  
  const spaceNames: Record<string, string> = {
    'pets': '[Pets]',
    'breeds': '[Breeds]',
    'litters': '[Litters]',
    'kennels': '[Kennels]',
    'contacts': '[Contacts]',
    'edit': 'Edit',
    'create': 'Create',
  };

  const firstSegment = segments[0];
  return spaceNames[firstSegment] || firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
};