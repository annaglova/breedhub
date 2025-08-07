import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BreedSpacePage } from './BreedSpacePage';
import { BreedDetailPage } from './BreedDetailPage';

function BreedsSpace() {
  return <BreedSpacePage />;
}

export function BreedsPage() {
  return (
    <Routes>
      <Route index element={<BreedsSpace />} />
      <Route path=":id" element={<BreedDetailPage />} />
      <Route path="new" element={<div>New Breed Form</div>} />
    </Routes>
  );
}