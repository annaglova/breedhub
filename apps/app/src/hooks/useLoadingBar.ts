import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { startLoading, stopLoading } from '@/store/loadingSlice';
import axios from 'axios';

export function useLoadingBar() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const url = config.url || 'unknown';
        dispatch(startLoading(url));
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
        dispatch(stopLoading(url));
        return response;
      },
      (error) => {
        const url = error.config?.url || 'unknown';
        dispatch(stopLoading(url));
        return Promise.reject(error);
      }
    );

    // Cleanup
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [dispatch]);
}

// Manual loading control
export function useManualLoading() {
  const dispatch = useAppDispatch();

  const startManualLoading = (key: string) => {
    dispatch(startLoading(key));
  };

  const stopManualLoading = (key: string) => {
    dispatch(stopLoading(key));
  };

  return { startManualLoading, stopManualLoading };
}