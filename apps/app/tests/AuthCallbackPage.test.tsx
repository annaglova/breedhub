// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { mockNavigate, mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

import { AuthCallbackPage } from '../src/pages/AuthCallbackPage';

describe('AuthCallbackPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let authCallback:
    | ((event: string, session: unknown) => void)
    | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    authCallback = null;
    mockNavigate.mockReset();
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
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
    vi.restoreAllMocks();
  });

  async function render() {
    await act(async () => {
      root.render(<AuthCallbackPage />);
    });
  }

  it('navigates home when a session already exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });

    await render();

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('navigates to sign-in with an error when getSession fails', async () => {
    const error = new Error('callback failed');
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error,
    });

    await render();

    expect(console.error).toHaveBeenCalledWith('Auth callback error:', error);
    expect(mockNavigate).toHaveBeenCalledWith('/sign-in?error=callback_failed', { replace: true });
  });

  it('waits for the signed-in auth event before navigating home', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await render();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(authCallback).not.toBeNull();

    await act(async () => {
      authCallback?.('SIGNED_IN', { user: { id: 'user-2' } });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('falls back to sign-in if no session ever arrives', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await render();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/sign-in', { replace: true });
  });

  it('routes password-recovery events to /reset-password', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await render();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(authCallback).not.toBeNull();

    await act(async () => {
      authCallback?.('PASSWORD_RECOVERY', { user: { id: 'user-3' } });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/reset-password', { replace: true });
  });
});
