import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseAuth, mockUseLocation, NavigateMock } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  NavigateMock: () => null,
}));

vi.mock('@shared/core/auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('react-router-dom', () => ({
  Navigate: NavigateMock,
  useLocation: mockUseLocation,
}));

import { AuthGuard } from '../src/components/auth/AuthGuard';

function expectElement(node: React.ReactNode): React.ReactElement {
  if (!React.isValidElement(node)) {
    throw new Error('Expected a React element');
  }

  return node;
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/', search: '' });
  });

  it('renders a loading spinner while auth state is loading', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, loading: true });

    const element = expectElement(
      AuthGuard({
        children: React.createElement('section'),
      }),
    );

    expect(element.type).toBe('div');
    expect(element.props.className).toContain('min-h-screen');

    const spinner = expectElement(element.props.children);
    expect(spinner.type).toBe('div');
    expect(spinner.props.className).toContain('animate-spin');
  });

  it('redirects signed-out users to sign-in with the current URL', () => {
    mockUseAuth.mockReturnValue({ authenticated: false, loading: false });
    mockUseLocation.mockReturnValue({
      pathname: '/billing',
      search: '?plan=pro&step=2',
    });

    const element = expectElement(
      AuthGuard({
        children: React.createElement('section'),
      }),
    );

    expect(element.type).toBe(NavigateMock);
    expect(element.props.to).toBe('/sign-in?redirectURL=%2Fbilling%3Fplan%3Dpro%26step%3D2');
    expect(element.props.replace).toBe(true);
  });

  it('renders children when the user is authenticated', () => {
    mockUseAuth.mockReturnValue({ authenticated: true, loading: false });

    const child = React.createElement('section', { 'data-testid': 'protected' });
    const element = expectElement(AuthGuard({ children: child }));

    expect(element.type).toBe(React.Fragment);
    expect(element.props.children).toBe(child);
  });
});
