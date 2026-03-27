import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Dummy component to test the AuthContext hook
const TestComponent = () => {
  const { user, userLoading, token, login, logout, refreshUser } = useAuth();

  return (
    <div>
      <div data-testid="loading">{userLoading ? 'loading' : 'ready'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <div data-testid="user">{user ? user.username : 'no-user'}</div>
      <button onClick={() => login('fake-token')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={refreshUser}>Refresh</button>
    </div>
  );
};

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Simple localStorage mock
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
vi.stubGlobal('localStorage', mockLocalStorage);

describe('AuthContext', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockLocalStorage.clear();
  });

  it('starts with no user or token when localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('loads user on mount if token is in localStorage', async () => {
    localStorage.setItem('tm_token', 'stored-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'admin', role: 'admin' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state before fetch resolves
    expect(screen.getByTestId('loading').textContent).toBe('loading');
    expect(screen.getByTestId('token').textContent).toBe('stored-token');

    // Wait for the fetch to resolve
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });
    
    expect(screen.getByTestId('user').textContent).toBe('admin');
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/profile', {
      headers: { Authorization: 'Bearer stored-token' },
    });
  });

  it('clears user on mount if stored token is invalid', async () => {
    localStorage.setItem('tm_token', 'invalid-token');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('allows login, updates state, and sets localStorage', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, username: 'newuser', role: 'viewer' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click login
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('newuser');
    });
    expect(screen.getByTestId('token').textContent).toBe('fake-token');
    expect(localStorage.getItem('tm_token')).toBe('fake-token');
  });

  it('allows logout, clears state, and clears localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('tm_token', 'active-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'admin', role: 'admin' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('admin');
    });

    // Click logout
    await user.click(screen.getByText('Logout'));

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
    expect(localStorage.getItem('tm_token')).toBeNull();
  });

  it('logs out on auth_unauthorized event', async () => {
    localStorage.setItem('tm_token', 'active-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'admin', role: 'admin' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('admin');
    });

    // Dispatch event
    act(() => {
      window.dispatchEvent(new Event('auth_unauthorized'));
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
    expect(localStorage.getItem('tm_token')).toBeNull();
  });
});
