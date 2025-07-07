import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { queryClient } from '@/core/queryClient';
import { AuthProvider } from '@/core/auth';
import { ViewportProvider } from '@/shared/components';
import { AppRouter } from '@/router/AppRouter';
import "./App.css";

function App() {
  return (
    <div data-theme="prime">
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ViewportProvider>
              <AppRouter />
            </ViewportProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Provider>
    </div>
  );
}

export default App;
