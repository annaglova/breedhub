import React from 'react';
import { Breed } from '@/domain/entities/breed';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface BreedAchievementsComponentProps {
  entity: Breed;
}

export function BreedAchievementsComponent({ entity }: BreedAchievementsComponentProps) {
  // Mock achievements data
  const achievements = [
    { icon: Trophy, label: 'Best in Show', count: 23 },
    { icon: Medal, label: 'Championships', count: 45 },
    { icon: Award, label: 'Working Titles', count: 12 },
    { icon: Star, label: 'Special Awards', count: 8 }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {achievements.map((achievement, index) => {
        const Icon = achievement.icon;
        return (
          <div 
            key={index}
            className="bg-gray-50 rounded-lg p-4 text-center"
          >
            <Icon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {achievement.count}
            </div>
            <div className="text-sm text-gray-600">
              {achievement.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}