import { useEffect } from 'react';
import { loadingStore } from '@breedhub/rxdb-store';
import axios from 'axios';

/**
 * useLoadingBar - Sets up axios interceptors to track loading state
 *
 * Automatically tracks all axios requests and updates loadingStore.
 * Call this once in App.tsx to enable global loading tracking.
 */
export function useLoadingBar() {
  useEffect(() => {
    // Request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const url = config.url || 'unknown';
        loadingStore.startLoading(url);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        const url = response.config.url || 'unknown';
        loadingStore.stopLoading(url);
        return response;
      },
      (error) => {
        const url = error.config?.url || 'unknown';
        loadingStore.stopLoading(url);
        return Promise.reject(error);
      }
    );

    // Cleanup
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);
}

/**
 * useManualLoading - Manual loading control for non-axios operations
 */
export function useManualLoading() {
  const startManualLoading = (key: string) => {
    loadingStore.startLoading(key);
  };

  const stopManualLoading = (key: string) => {
    loadingStore.stopLoading(key);
  };

  return { startManualLoading, stopManualLoading };
}