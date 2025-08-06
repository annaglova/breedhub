import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BreedsListPage } from './BreedsListPage';

function BreedsList() {
  return <BreedsListPage />;
}

function BreedDetail() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Breed Details</h2>
      <p>Breed detail view will be here</p>
    </div>
  );
}

export function BreedsPage() {
  return (
    <Routes>
      <Route index element={<BreedsList />} />
      <Route path=":id" element={<BreedDetail />} />
      <Route path="new" element={<div>New Breed Form</div>} />
    </Routes>
  );
}