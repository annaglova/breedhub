import { vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('shared supabase client config', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('configures Supabase auth for PKCE session detection', async () => {
    const client = { auth: {} };
    createClientMock.mockReturnValue(client);

    const module = await import('@shared/core/supabase');

    expect(createClientMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        }),
      }),
    );
    expect(module.supabase).toBe(client);
  });
});
