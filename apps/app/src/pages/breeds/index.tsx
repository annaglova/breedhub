import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BreedSpacePage } from './BreedSpacePage';
import { PublicPageTemplate } from '@/components/template/PublicPageTemplate';

export function BreedsPage() {
  return (
    <Routes>
      <Route path="/" element={<BreedSpacePage />}>
        {/* Route для drawer з PublicPageTemplate */}
        <Route path=":id" element={<PublicPageTemplate isDrawerMode={true} />} />
        <Route path="new" element={<div>New Breed Form</div>} />
      </Route>
    </Routes>
  );
}