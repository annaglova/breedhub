import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BreedSpacePage } from './BreedSpacePage';
import { BreedDrawerView } from '@/components/breed/BreedDrawerView';

export function BreedsPage() {
  return (
    <Routes>
      <Route path="/" element={<BreedSpacePage />}>
        <Route path=":id" element={<BreedDrawerView />} />
        <Route path="new" element={<div>New Breed Form</div>} />
      </Route>
    </Routes>
  );
}