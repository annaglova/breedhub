import React from 'react';
import { cn } from '@/lib/utils';

interface BreedProgressLightProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BreedProgressLight({ 
  progress, 
  className = "",
  showPercentage = false,
  size = 'sm'
}: BreedProgressLightProps) {
  // Визначаємо висоту та ширину базуючись на розмірі
  const sizeClasses = {
    sm: 'h-1 w-12',
    md: 'h-1.5 w-16',
    lg: 'h-2 w-20'
  };

  // Визначаємо колір прогресу залежно від відсотка
  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getProgressColor(progress)
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[2rem]">
          {progress}%
        </span>
      )}
    </div>
  );
}