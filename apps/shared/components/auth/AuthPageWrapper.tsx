import { AuthLayoutSkeleton } from "./AuthFormSkeleton";
import AuthLayout from "@shared/layouts/AuthLayout";
import { ReactNode, useState, useEffect } from "react";

interface AuthPageWrapperProps {
  children: ReactNode;
  showSkeleton?: boolean;
  skeletonDuration?: number;
}

export function AuthPageWrapper({ 
  children, 
  showSkeleton = true,
  skeletonDuration = 300 
}: AuthPageWrapperProps) {
  const [isLoading, setIsLoading] = useState(showSkeleton);

  useEffect(() => {
    if (showSkeleton) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, skeletonDuration);

      return () => clearTimeout(timer);
    }
  }, [showSkeleton, skeletonDuration]);

  if (isLoading) {
    return (
      <AuthLayout>
        <AuthLayoutSkeleton />
      </AuthLayout>
    );
  }

  return <>{children}</>;
}