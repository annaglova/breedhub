import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { queryClient } from '@/core/queryClient';
import { AuthProvider } from '@/core/auth';
import { AppRouter } from '@/router/AppRouter';
import "./app-theme.css";

function App() {
  return (
    <div>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </QueryClientProvider>
      </Provider>
    </div>
  );
}

export default App;
