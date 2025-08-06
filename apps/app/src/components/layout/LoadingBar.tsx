import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Progress } from '@ui/components/progress';

export function LoadingBar() {
  const { loadingUrls, mode, progress } = useAppSelector((state) => state.loading);
  const isLoading = loadingUrls.length > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] w-full">
      {mode === 'indeterminate' ? (
        <div className="loading-bar-indeterminate" />
      ) : (
        <Progress value={progress} className="h-1" />
      )}
    </div>
  );
}