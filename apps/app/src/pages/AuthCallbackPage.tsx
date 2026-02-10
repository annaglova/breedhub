import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/core/supabase';

/**
 * Handles OAuth callback and email confirmation redirects.
 * Supabase redirects here after:
 * - OAuth login (Google, Facebook)
 * - Email confirmation link click
 * - Password reset link click
 *
 * The URL contains tokens in the hash fragment that Supabase JS
 * processes automatically via detectSessionInUrl: true.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/sign-in?error=callback_failed');
        return;
      }

      if (session) {
        // Check if this is a password recovery flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');

        if (type === 'recovery') {
          navigate('/reset-password');
        } else {
          navigate('/');
        }
      } else {
        navigate('/sign-in');
      }
    };

    handleCallback();
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
