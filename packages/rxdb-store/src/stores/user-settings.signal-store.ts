import { signal } from '@preact/signals-react';
import { supabase } from '../supabase/client';
import { userStore } from './user-store.signal-store';

/**
 * UserSettingsStore — display preferences for the signed-in user.
 *
 * Schema source: `user_settings` table (one row per `user_profile.id`).
 * Loaded once on auth (and reloaded on user change). NULL values mean
 * "no preference" — consumers fall back to defaults (Kg / Cm for units).
 *
 * See: breedhub-docs/db/USER_PROFILE_ARCHITECTURE.md
 *      breedhub-docs/backend/processes/measurements/PET_MEASUREMENT_UNITS.md
 */

export interface UserSettings {
  weight_unit_id: string | null;
  size_unit_id: string | null;
  language: string | null;
  theme: string | null;
  breed_id: string | null;
}

class UserSettingsStore {
  weightUnitId = signal<string | null>(null);
  sizeUnitId = signal<string | null>(null);
  language = signal<string | null>(null);
  theme = signal<string | null>(null);
  breedId = signal<string | null>(null);

  loading = signal<boolean>(false);
  initialized = signal<boolean>(false);

  private currentUserId: string | null = null;
  private unsubscribeUser: (() => void) | null = null;

  /**
   * Subscribe to UserStore so settings reload on login/logout.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  initialize(): void {
    if (this.initialized.value) return;

    // Pick up the user that's already there at startup.
    if (userStore.currentUserId.value) {
      void this.load(userStore.currentUserId.value);
    }

    this.unsubscribeUser = userStore.currentUserId.subscribe((userId) => {
      if (userId === this.currentUserId) return;
      if (userId) {
        void this.load(userId);
      } else {
        this.clear();
      }
    });

    this.initialized.value = true;
  }

  private async load(userId: string): Promise<void> {
    this.currentUserId = userId;
    this.loading.value = true;
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('weight_unit_id, size_unit_id, language, theme, breed_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      this.apply(data as UserSettings | null);
    } catch (err) {
      console.error('[UserSettingsStore] Failed to load settings:', err);
      // leave previous values in place — partial data > broken UI
    } finally {
      this.loading.value = false;
    }
  }

  private apply(s: UserSettings | null): void {
    this.weightUnitId.value = s?.weight_unit_id ?? null;
    this.sizeUnitId.value = s?.size_unit_id ?? null;
    this.language.value = s?.language ?? null;
    this.theme.value = s?.theme ?? null;
    this.breedId.value = s?.breed_id ?? null;
  }

  private clear(): void {
    this.currentUserId = null;
    this.apply(null);
  }

  destroy(): void {
    this.unsubscribeUser?.();
    this.unsubscribeUser = null;
  }
}

export const userSettingsStore = new UserSettingsStore();
