import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { BreedsPage } from '@/pages/breeds';
import { TestLoadingPage } from '@/pages/TestLoadingPage';

// Temporary placeholder component
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">This section is under construction.</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/breeds" replace />} />
          <Route path="breeds/*" element={<BreedsPage />} />
          <Route path="pets" element={<PlaceholderPage title="Pets" />} />
          <Route path="kennels" element={<PlaceholderPage title="Kennels" />} />
          <Route path="events" element={<PlaceholderPage title="Events" />} />
          <Route path="contacts" element={<PlaceholderPage title="Contacts" />} />
          <Route path="market" element={<PlaceholderPage title="Market" />} />
          <Route path="menu" element={<PlaceholderPage title="Menu" />} />
          <Route path="test-loading" element={<TestLoadingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}