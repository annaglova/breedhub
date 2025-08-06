import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { queryClient } from '@/core/queryClient';
import { AuthProvider } from '@/core/auth';
import { AppRouter } from '@/router/AppRouter';
import { useLoadingBar } from '@/hooks/useLoadingBar';
import "./app-theme.css";

function AppContent() {
  // Initialize loading bar interceptors
  useLoadingBar();
  
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
