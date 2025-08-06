import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { BreedsPage } from '@/pages/breeds';

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
          <Route path="litters" element={<PlaceholderPage title="Litters" />} />
          <Route path="kennels" element={<PlaceholderPage title="Kennels" />} />
          <Route path="events" element={<PlaceholderPage title="Events" />} />
          <Route path="contacts" element={<PlaceholderPage title="Contacts" />} />
          
          {/* Marketplace routes */}
          <Route path="marketplace">
            <Route index element={<Navigate to="/marketplace/pets" replace />} />
            <Route path="pets" element={<PlaceholderPage title="Marketplace - Pets" />} />
          </Route>
          
          {/* Test mating routes */}
          <Route path="mating">
            <Route index element={<Navigate to="/mating/pets" replace />} />
            <Route path="pets" element={<PlaceholderPage title="Test Mating - Pets" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}