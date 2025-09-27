import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { queryClient } from '@/core/queryClient';
import { AuthProvider } from '@/core/auth';
import { AppRouter } from '@/router/AppRouter';
import { useLoadingBar } from '@/hooks/useLoadingBar';
import { spaceStore, appConfigStore } from '@breedhub/rxdb-store';
import "./app-theme.css";

function AppContent() {
  // Initialize loading bar interceptors
  useLoadingBar();
  
  // Initialize SpaceStore when appConfig is ready
  useEffect(() => {
    const initSpaceStore = async () => {
      // Wait for appConfigStore to be ready
      if (appConfigStore.configsList.value.length > 0) {
        await spaceStore.initialize();
      }
    };
    
    // Subscribe to appConfigStore changes
    const unsubscribe = appConfigStore.configsList.subscribe(() => {
      if (appConfigStore.configsList.value.length > 0) {
        initSpaceStore();
      }
    });
    
    // Initial check
    initSpaceStore();
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function App() {
  return (
    <div>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </Provider>
    </div>
  );
}

export default App;
