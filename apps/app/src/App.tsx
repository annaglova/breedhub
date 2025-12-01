import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/core/queryClient';
import { AuthProvider } from '@/core/auth';
import { AppRouter } from '@/router/AppRouter';
import { useLoadingBar } from '@/hooks/useLoadingBar';
import { spaceStore, appStore } from '@breedhub/rxdb-store';
import "./app-theme.css";

function AppContent() {
  // Initialize loading bar interceptors
  useLoadingBar();
  
  // Initialize AppStore on mount
  useEffect(() => {
    const initAppStore = async () => {
      if (!appStore.initialized.value) {
        console.log('[App] Initializing AppStore at', new Date().toISOString());
        await appStore.initialize();
        console.log('[App] AppStore initialized at', new Date().toISOString());
      }
    };
    initAppStore();
  }, []);
  
  // Initialize SpaceStore when appStore is ready
  useEffect(() => {
    console.log('[App] ============== APP INITIALIZATION START ==============');
    console.log('[App] useEffect for SpaceStore initialization at', new Date().toISOString());

    const initSpaceStore = async () => {
      const startTime = performance.now();
      console.log('[App] InitSpaceStore called, checking conditions:', {
        appStoreInitialized: appStore.initialized.value,
        spaceStoreInitialized: spaceStore.initialized.value,
        time: new Date().toISOString()
      });

      // Wait for appStore to be ready
      if (appStore.initialized.value && !spaceStore.initialized.value) {
        console.log('[App] CONDITIONS MET! Calling spaceStore.initialize() at', new Date().toISOString());
        await spaceStore.initialize();
        console.log('[App] spaceStore.initialize() completed in', performance.now() - startTime, 'ms at', new Date().toISOString());
      } else {
        console.log('[App] CONDITIONS NOT MET:', {
          appStoreInitialized: appStore.initialized.value,
          spaceStoreInitialized: spaceStore.initialized.value,
          reason: !appStore.initialized.value ? 'AppStore not initialized' : 'SpaceStore already initialized'
        });
      }
    };
    
    // Subscribe to appStore initialization changes
    const unsubscribe = appStore.initialized.subscribe((value) => {
      console.log('[App] appStore.initialized changed to:', value, 'at', new Date().toISOString());
      if (value && !spaceStore.initialized.value) {
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
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
