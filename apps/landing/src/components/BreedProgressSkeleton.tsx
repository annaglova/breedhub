import React from 'react';
import { Skeleton } from './Skeleton';

export function BreedProgressSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="flex-1">
            <Skeleton variant="text" width="60%" height={20} />
            <div className="mt-2">
              <Skeleton variant="rectangular" height={16} className="rounded-full" />
            </div>
          </div>
          <Skeleton variant="text" width={50} height={20} />
        </div>
      ))}
    </div>
  );
}