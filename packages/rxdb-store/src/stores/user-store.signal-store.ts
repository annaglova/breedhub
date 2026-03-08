import { signal, computed } from '@preact/signals-react';
import { supabase } from '../supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * UserStore - Manages current user identity for local-first architecture.
 *
 * Uses Supabase session (cached in localStorage) so it works offline.
 * Provides currentUserId for created_by/updated_by fields.
 *
 * Initialization:
 *   App.tsx → userStore.initialize() (before spaceStore)
 *
 * Usage:
 *   userStore.currentUserId.value  // UUID or null
 */

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}

class UserStore {
  // Core signals
  currentUserId = signal<string | null>(null);
  currentUser = signal<UserProfile | null>(null);
  initialized = signal<boolean>(false);
  loading = signal<boolean>(false);

  // Computed
  isAuthenticated = computed(() => !!this.currentUserId.value);

  private authSubscription: { unsubscribe: () => void } | null = null;

  /**
   * Initialize from Supabase cached session (no network call).
   * Subscribe to auth state changes for login/logout.
   */
  async initialize(): Promise<void> {
    if (this.initialized.value) return;
    this.loading.value = true;

    try {
      // Get session from localStorage cache (works offline)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        this.setUser(session.user);
      }

      // Listen for auth state changes (login, logout, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          if (session?.user) {
            this.setUser(session.user);
          } else {
            this.clearUser();
          }
        }
      );
      this.authSubscription = subscription;

      this.initialized.value = true;
      console.log('[UserStore] Initialized, userId:', this.currentUserId.value);
    } catch (err) {
      console.error('[UserStore] Failed to initialize:', err);
    } finally {
      this.loading.value = false;
    }
  }

  private setUser(user: User): void {
    this.currentUserId.value = user.id;
    this.currentUser.value = {
      id: user.id,
      email: user.email ?? null,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || null,
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };
  }

  private clearUser(): void {
    this.currentUserId.value = null;
    this.currentUser.value = null;
  }

  /**
   * Clean up subscription
   */
  destroy(): void {
    this.authSubscription?.unsubscribe();
    this.authSubscription = null;
  }
}

// Singleton export
export const userStore = new UserStore();
