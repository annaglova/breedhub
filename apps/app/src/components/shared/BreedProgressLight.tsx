import React from 'react';
import { Breed } from '@/services/api';

interface BreedProgressLightProps {
  breed: Breed;
  className?: string;
}

export function BreedProgressLight({ 
  breed, 
  className = ""
}: BreedProgressLightProps) {
  // Якщо немає прогресу, не показуємо компонент
  if (!breed.AchievementProgress || breed.AchievementProgress <= 0) {
    return null;
  }

  // Функція для пошуку останнього досягнення (аналог findElementWithMaxPosition)
  const getLastAchievement = () => {
    // Поки що просто повертаємо placeholder, оскільки в нашій моделі немає Achievements
    return "Breed's support level";
  };

  return (
    <div 
      className={`flex h-[10px] w-24 items-center rounded-full border border-primary-600 ${className}`}
      title={getLastAchievement()}
    >
      <div
        className="bg-primary-600 mx-0.5 my-auto h-1.5 rounded-full"
        style={{
          width: `${breed.AchievementProgress}%`,
        }}
      />
    </div>
  );
}