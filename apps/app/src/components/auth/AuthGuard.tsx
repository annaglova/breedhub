import { useAuth } from '@/core/auth';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Protects routes that require authentication.
 * Redirects to /sign-in with the current URL as redirectURL param.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!authenticated) {
    const redirectURL = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirectURL=${redirectURL}`} replace />;
  }

  return <>{children}</>;
}
