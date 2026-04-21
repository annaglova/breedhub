// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockRefreshSession,
  mockResetPasswordForEmail,
  mockSignInWithOAuth,
  mockSignInWithPassword,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignInWithPassword: vi.fn(),
}));

vi.mock('../../shared/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
      refreshSession: mockRefreshSession,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: mockSignInWithPassword,
    },
  },
}));

import { AuthProvider, useAuth } from '../../shared/core/auth';

function createJwt(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

type AuthSnapshot = ReturnType<typeof useAuth>;

let latestAuth: AuthSnapshot | null = null;

function AuthProbe() {
  latestAuth = useAuth();
  return null;
}

describe('AuthProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };
  let authCallback:
    | ((event: string, session: { access_token?: string; user?: Record<string, unknown> } | null) => void)
    | null;

  beforeEach(() => {
    vi.useFakeTimers();
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    latestAuth = null;
    authCallback = null;

    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSignOut.mockReset();
    mockRefreshSession.mockReset();
    mockResetPasswordForEmail.mockReset();
    mockSignInWithOAuth.mockReset();
    mockSignInWithPassword.mockReset();

    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    vi.restoreAllMocks();
  });

  async function render() {
    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it('ignores a manually persisted accessToken and stays signed out without a Supabase session', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key !== 'accessToken') {
        return null;
      }

      return createJwt({
        exp: Math.floor(Date.now() / 1000) + 3600,
        user_id: 'stale-user',
        email: 'stale@example.com',
        name: 'Stale User',
      });
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    await render();

    expect(latestAuth?.authenticated).toBe(false);
    expect(latestAuth?.user).toEqual({
      avatar: '/assets/images/avatars/guest.png',
      email: '',
      id: '',
      name: 'Guest',
    });
    expect(localStorageMock.getItem).not.toHaveBeenCalledWith('accessToken');
  });

  it('hydrates from the Supabase session without manually persisting the access token', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: createJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            user_id: 'user-1',
            email: 'user@example.com',
            name: 'Breedhub User',
          }),
          user: {
            id: 'user-1',
            email: 'user@example.com',
            user_metadata: {
              full_name: 'Breedhub User',
            },
          },
        },
      },
    });

    await render();

    expect(latestAuth?.authenticated).toBe(true);
    expect(latestAuth?.token).toContain('.');
    expect(latestAuth?.user).toEqual({
      avatar: undefined,
      email: 'user@example.com',
      id: 'user-1',
      name: 'Breedhub User',
    });
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('accessToken', expect.any(String));
  });

  it('updates from auth state change events without writing the access token to localStorage', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    await render();

    expect(authCallback).not.toBeNull();

    await act(async () => {
      authCallback?.('SIGNED_IN', {
        access_token: createJwt({
          exp: Math.floor(Date.now() / 1000) + 3600,
          user_id: 'user-2',
          email: 'event@example.com',
          name: 'Event User',
        }),
        user: {
          id: 'user-2',
          email: 'event@example.com',
          user_metadata: {
            name: 'Event User',
          },
        },
      });
    });

    expect(latestAuth?.authenticated).toBe(true);
    expect(latestAuth?.user.name).toBe('Event User');
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('accessToken', expect.any(String));
  });

  it('signs out without manually removing an accessToken from localStorage', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: createJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            user_id: 'user-3',
            email: 'signout@example.com',
            name: 'Sign Out User',
          }),
          user: {
            id: 'user-3',
            email: 'signout@example.com',
            user_metadata: {
              name: 'Sign Out User',
            },
          },
        },
      },
    });
    mockSignOut.mockResolvedValue({ error: null });

    await render();

    await act(async () => {
      await latestAuth?.signOut();
    });

    expect(latestAuth?.authenticated).toBe(false);
    expect(latestAuth?.token).toBe('');
    expect(latestAuth?.user).toEqual({
      avatar: '/assets/images/avatars/guest.png',
      email: '',
      id: '',
      name: 'Guest',
    });
    expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('accessToken');
  });
});
