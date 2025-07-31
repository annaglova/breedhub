import { cn } from "@ui/lib/utils";

interface AuthFormSkeletonProps {
  className?: string;
}

export function AuthFormSkeleton({ className }: AuthFormSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Icon skeleton */}
      <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm mb-3 sm:mb-4" />
      
      {/* Title skeleton */}
      <div className="space-y-2 text-center mb-4 sm:mb-6">
        <div className="h-8 bg-gray-200 rounded-md mx-auto w-48" />
        <div className="h-4 bg-gray-200 rounded-md mx-auto w-36" />
      </div>
      
      {/* Tab navigation skeleton */}
      <div className="flex rounded-lg bg-gray-100 p-[2px] mb-6 sm:mb-4">
        <div className="flex-1 h-10 bg-gray-200 rounded-md mr-1" />
        <div className="flex-1 h-10 bg-gray-200 rounded-md ml-1" />
      </div>
      
      {/* Form content skeleton */}
      <div className="space-y-4">
        {/* Input field skeletons */}
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-10 bg-gray-200 rounded-md" />
        </div>
        
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-10 bg-gray-200 rounded-md" />
        </div>
        
        {/* Checkbox skeleton */}
        <div className="flex items-center">
          <div className="h-4 w-4 bg-gray-200 rounded mr-2" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        
        {/* Button skeleton */}
        <div className="h-12 bg-gray-200 rounded-xl mt-6" />
      </div>
      
      {/* Footer link skeleton */}
      <div className="mt-6 flex justify-center items-center space-x-2">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

export function AuthLayoutSkeleton() {
  return (
    <div className="relative flex min-h-screen w-full flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-gray-200 rounded hidden sm:block" />
          <div className="h-10 w-24 bg-gray-200 rounded-md" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
        <div className="w-full sm:max-w-md">
          <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
            <AuthFormSkeleton />
          </div>
        </div>
      </div>
      
      {/* Footer skeleton */}
      <div className="relative z-10 mt-auto border-t border-gray-100 py-4 text-center">
        <div className="flex justify-center space-x-6">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}