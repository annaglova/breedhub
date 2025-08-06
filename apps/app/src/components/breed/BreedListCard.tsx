import React from 'react';
import { cn } from '@ui/lib/utils';
import { SpaceListCardProps } from '@/core/space/types';
import { Breed } from '@/services/api';

interface BreedListCardProps extends SpaceListCardProps<Breed> {
  entity: Breed;
}

export function BreedListCard({ entity: breed, selected = false }: BreedListCardProps) {
  return (
    <div 
      className={cn(
        "flex items-center h-[68px] px-4 hover:bg-gray-50 cursor-pointer transition-colors",
        selected && "bg-blue-50 hover:bg-blue-100"
      )}
    >
      {/* Avatar */}
      <div className="size-10 rounded-full border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0">
        {breed.Avatar ? (
          <img 
            src={breed.Avatar} 
            alt={breed.Name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
            {breed.Name?.charAt(0)}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium truncate">{breed.Name}</span>
          {breed.HasNotes && (
            <span className="text-xs text-gray-500">📝</span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-gray-600 gap-2">
          <span>Pet profiles - {breed.PetProfileCount || 0}</span>
          <span className="text-gray-400">•</span>
          <span className="hidden sm:inline">Kennels - {breed.KennelCount || 0}</span>
          <span className="text-gray-400 hidden sm:inline">•</span>
          <span>Patrons - {breed.PatronCount || 0}</span>
          
          {/* Progress indicator */}
          {breed.AchievementProgress !== undefined && (
            <div className="ml-2 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${breed.AchievementProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Patrons */}
      {breed.TopPatrons && breed.TopPatrons.length > 0 && (
        <div className="flex -space-x-2 ml-4">
          {breed.TopPatrons.slice(0, 3).map((patron, index) => (
            <div 
              key={index}
              className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"
              title={patron.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}