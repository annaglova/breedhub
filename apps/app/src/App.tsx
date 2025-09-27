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
    console.log('[App] useEffect for SpaceStore initialization');
    
    const initSpaceStore = async () => {
      console.log('[App] Checking conditions:', {
        appConfigInitialized: appConfigStore.initialized.value,
        spaceStoreInitialized: spaceStore.initialized.value
      });
      
      // Wait for appConfigStore to be ready
      if (appConfigStore.initialized.value && !spaceStore.initialized.value) {
        console.log('[App] Calling spaceStore.initialize()');
        await spaceStore.initialize();
        console.log('[App] spaceStore.initialize() completed');
      }
    };
    
    // Subscribe to appConfigStore initialization changes
    const unsubscribe = appConfigStore.initialized.subscribe(() => {
      if (appConfigStore.initialized.value && !spaceStore.initialized.value) {
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
