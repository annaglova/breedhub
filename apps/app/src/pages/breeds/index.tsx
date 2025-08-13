import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BreedSpacePage } from './BreedSpacePage';
import { PageTemplateV3 } from '@/components/template/PageTemplateV3';

export function BreedsPage() {
  return (
    <Routes>
      <Route path="/" element={<BreedSpacePage />}>
        {/* Route для drawer з PageTemplateV3 */}
        <Route path=":id" element={<PageTemplateV3 isDrawerMode={true} />} />
        <Route path="new" element={<div>New Breed Form</div>} />
      </Route>
    </Routes>
  );
}