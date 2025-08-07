import React from 'react';
import { cn } from '@ui/lib/utils';
import { SpaceListCardProps } from '@/core/space/types';
import { Breed } from '@/services/api';
import { Card, CardContent, CardHeader } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Progress } from '@ui/components/progress';
import { Users, Home, Trophy } from 'lucide-react';

interface BreedGridCardProps extends SpaceListCardProps<Breed> {
  entity: Breed;
}

export function BreedGridCard({ entity: breed, selected = false }: BreedGridCardProps) {
  return (
    <Card 
      className={cn(
        "h-[280px] cursor-pointer transition-all hover:shadow-lg",
        selected && "ring-2 ring-primary"
      )}
    >
      <CardHeader className="pb-3">
        {/* Avatar and Name */}
        <div className="flex items-start gap-3">
          {breed.Avatar ? (
            <img
              src={breed.Avatar}
              alt={breed.Name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-500">
                {breed.Name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{breed.Name}</h3>
            {breed.HasNotes && (
              <Badge variant="secondary" className="mt-1">
                Has Notes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{breed.PetProfileCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>{breed.KennelCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>{breed.PatronCount || 0}</span>
          </div>
        </div>

        {/* Achievement Progress */}
        {breed.AchievementProgress !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Achievement</span>
              <span>{breed.AchievementProgress}%</span>
            </div>
            <Progress value={breed.AchievementProgress} className="h-2" />
          </div>
        )}

        {/* Top Patrons */}
        {breed.TopPatrons && breed.TopPatrons.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Top Patrons</p>
            <div className="flex -space-x-2">
              {breed.TopPatrons.slice(0, 5).map((patron, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
                  title={patron}
                >
                  <span className="text-xs font-medium">
                    {patron.charAt(0)}
                  </span>
                </div>
              ))}
              {breed.TopPatrons.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                  <span className="text-xs">+{breed.TopPatrons.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}