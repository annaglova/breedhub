import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Page imports
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Entity pages
import { PetsListPage } from '@/pages/pets/PetsListPage';
import { PetDetailPage } from '@/pages/pets/PetDetailPage';
import { PetEditPage } from '@/pages/pets/PetEditPage';
import { PetCreatePage } from '@/pages/pets/PetCreatePage';

import { BreedsListPage } from '@/pages/breeds/BreedsListPage';
import { BreedDetailPage } from '@/pages/breeds/BreedDetailPage';
import { BreedEditPage } from '@/pages/breeds/BreedEditPage';
import { BreedCreatePage } from '@/pages/breeds/BreedCreatePage';

import { LittersListPage } from '@/pages/litters/LittersListPage';
import { LitterDetailPage } from '@/pages/litters/LitterDetailPage';
import { LitterEditPage } from '@/pages/litters/LitterEditPage';
import { LitterCreatePage } from '@/pages/litters/LitterCreatePage';

import { KennelsListPage } from '@/pages/kennels/KennelsListPage';
import { KennelDetailPage } from '@/pages/kennels/KennelDetailPage';
import { KennelEditPage } from '@/pages/kennels/KennelEditPage';
import { KennelCreatePage } from '@/pages/kennels/KennelCreatePage';

import { ContactsListPage } from '@/pages/contacts/ContactsListPage';
import { ContactDetailPage } from '@/pages/contacts/ContactDetailPage';
import { ContactEditPage } from '@/pages/contacts/ContactEditPage';
import { ContactCreatePage } from '@/pages/contacts/ContactCreatePage';

import { EventsListPage } from '@/pages/events/EventsListPage';
import { EventDetailPage } from '@/pages/events/EventDetailPage';
import { EventEditPage } from '@/pages/events/EventEditPage';
import { EventCreatePage } from '@/pages/events/EventCreatePage';

import { ProfilePage } from '@/pages/profile/ProfilePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

// Route protection component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <>{children}</>;
}

// Public route component (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
        </Route>

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Pets */}
          <Route path="pets">
            <Route index element={<PetsListPage />} />
            <Route path="new" element={<PetCreatePage />} />
            <Route path=":id" element={<PetDetailPage />} />
            <Route path=":id/edit" element={<PetEditPage />} />
          </Route>

          {/* Breeds */}
          <Route path="breeds">
            <Route index element={<BreedsListPage />} />
            <Route path="new" element={<BreedCreatePage />} />
            <Route path=":id" element={<BreedDetailPage />} />
            <Route path=":id/edit" element={<BreedEditPage />} />
          </Route>

          {/* Litters */}
          <Route path="litters">
            <Route index element={<LittersListPage />} />
            <Route path="new" element={<LitterCreatePage />} />
            <Route path=":id" element={<LitterDetailPage />} />
            <Route path=":id/edit" element={<LitterEditPage />} />
          </Route>

          {/* Kennels */}
          <Route path="kennels">
            <Route index element={<KennelsListPage />} />
            <Route path="new" element={<KennelCreatePage />} />
            <Route path=":id" element={<KennelDetailPage />} />
            <Route path=":id/edit" element={<KennelEditPage />} />
          </Route>

          {/* Contacts */}
          <Route path="contacts">
            <Route index element={<ContactsListPage />} />
            <Route path="new" element={<ContactCreatePage />} />
            <Route path=":id" element={<ContactDetailPage />} />
            <Route path=":id/edit" element={<ContactEditPage />} />
          </Route>

          {/* Events */}
          <Route path="events">
            <Route index element={<EventsListPage />} />
            <Route path="new" element={<EventCreatePage />} />
            <Route path=":id" element={<EventDetailPage />} />
            <Route path=":id/edit" element={<EventEditPage />} />
          </Route>

          {/* Profile & Settings */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}