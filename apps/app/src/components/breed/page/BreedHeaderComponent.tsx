import React from 'react';
import { Breed } from '@/services/api';
import { Badge } from '@ui/components/badge';
import { Dog, Building } from 'lucide-react';

interface BreedHeaderComponentProps {
  entity: Breed;
}

export function BreedHeaderComponent({ entity }: BreedHeaderComponentProps) {
  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-6">
        {/* Main info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{entity.Name}</h1>
          <p className="text-lg text-gray-600 mb-4">{entity.Origin}</p>
          
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.PetProfileCount} pets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.KennelCount} kennels
              </span>
            </div>
          </div>
        </div>

        {/* Breed image */}
        {entity.Images?.[0] && (
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
            <img 
              src={entity.Images[0]} 
              alt={entity.Name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-6">
        <Badge variant="secondary">{entity.Size}</Badge>
        <Badge variant="secondary">{entity.CoatLength} coat</Badge>
        <Badge variant="outline">{entity.LifeSpan}</Badge>
        <Badge variant="outline">{entity.Weight}</Badge>
      </div>
    </div>
  );
}