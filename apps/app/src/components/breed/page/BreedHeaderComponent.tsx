import React from 'react';
import { Breed } from '@/domain/entities/breed';
import { Badge } from '@ui/components/badge';
import { Dog, Building, Heart, Trophy } from 'lucide-react';

interface BreedHeaderComponentProps {
  entity: Breed;
}

export function BreedHeaderComponent({ entity }: BreedHeaderComponentProps) {
  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-6">
        {/* Main info */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{entity.name}</h1>
          <p className="text-lg text-gray-600 mb-4">{entity.authentic_name}</p>
          
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.pet_profile_count} pets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.kennel_count} kennels
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.patron_count} patrons
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {entity.rating}% rating
              </span>
            </div>
          </div>
        </div>

        {/* Breed image */}
        {entity.avatar_url && (
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
            <img 
              src={entity.avatar_url} 
              alt={entity.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-6">
        <Badge variant="secondary" className="capitalize">{entity.pet_type_id}</Badge>
        {entity.differ_by_coat_color && <Badge variant="outline">Various coat colors</Badge>}
        {entity.differ_by_coat_type && <Badge variant="outline">Various coat types</Badge>}
        {entity.differ_by_size && <Badge variant="outline">Various sizes</Badge>}
        <Badge variant="outline">Progress: {entity.achievement_progress}%</Badge>
      </div>
    </div>
  );
}