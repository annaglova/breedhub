import React from 'react';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Avatar } from '@ui/components/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/components/tooltip';
import { cn } from '@ui/lib/utils';
import { type Breed } from '@/domain/entities/breed';
import { Star, Users, Home, Dog, Cat } from 'lucide-react';

interface BreedListCardProps {
  breed: Breed;
  selected?: boolean;
  onClick?: () => void;
}

export function BreedListCard({ breed, selected = false, onClick }: BreedListCardProps) {
  const petIcon = breed.pet_type_id === 'dog' ? Dog : Cat;
  const PetIcon = petIcon;
  
  // Mock data for now - will be replaced with real data
  const petProfileCount = breed.registration_count || 0;
  const kennelCount = Math.floor(Math.random() * 10);
  const patronCount = Math.floor(Math.random() * 50);
  const hasNotes = Math.random() > 0.7;
  const progress = Math.random() * 100;

  return (
    <Card 
      className={cn(
        "relative p-4 hover:shadow-md transition-shadow cursor-pointer",
        selected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar Section */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-full overflow-hidden border-2",
            patronCount > 0 ? "border-primary" : "border-muted"
          )}>
            {breed.photo_url ? (
              <img 
                src={breed.photo_url} 
                alt={breed.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-xl font-semibold text-muted-foreground">
                  {breed.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          {/* Pet type badge */}
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
            <PetIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold text-base truncate">
                    {breed.name}
                    {hasNotes && <span className="ml-1 text-xs text-muted-foreground">📝</span>}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{breed.name}</p>
                </TooltipContent>
              </Tooltip>
              
              {breed.authentic_name && (
                <p className="text-sm text-muted-foreground italic truncate">
                  {breed.authentic_name}
                </p>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            {petProfileCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Pet profiles - {petProfileCount}</span>
              </div>
            )}
            
            {kennelCount > 0 && (
              <div className="flex items-center gap-1 hidden sm:flex">
                <Home className="w-3 h-3" />
                <span>Kennels - {kennelCount}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>Patrons - {patronCount}</span>
            </div>
          </div>
        </div>

        {/* Top patrons avatars */}
        {patronCount > 0 && (
          <div className="absolute top-3 right-3 flex -space-x-2">
            {[...Array(Math.min(3, Math.floor(patronCount / 10)))].map((_, i) => (
              <div 
                key={i}
                className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center"
              >
                <span className="text-xs">👤</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}