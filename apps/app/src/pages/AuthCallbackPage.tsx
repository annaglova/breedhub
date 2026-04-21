import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/core/supabase';

/**
 * Handles OAuth callback and email confirmation redirects.
 * Supabase redirects here after:
 * - OAuth login (Google, Facebook)
 * - Email confirmation link click
 * - Password reset link click (emits PASSWORD_RECOVERY → /reset-password)
 *
 * In PKCE mode, Supabase exchanges the auth code automatically via
 * detectSessionInUrl: true, then emits SIGNED_IN or PASSWORD_RECOVERY
 * once the session is ready.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;

    const finish = (target: string) => {
      if (settled) {
        return;
      }

      settled = true;
      navigate(target, { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          finish('/reset-password');
          return;
        }

        if (event === 'SIGNED_IN') {
          finish('/');
        }
      }
    );

    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        finish('/sign-in?error=callback_failed');
        return;
      }

      if (session) {
        finish('/');
        return;
      }
    };

    void handleCallback();

    const fallbackTimer = window.setTimeout(() => {
      finish('/sign-in');
    }, 3000);

    return () => {
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto" />
        <p className="mt-4 text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
}
