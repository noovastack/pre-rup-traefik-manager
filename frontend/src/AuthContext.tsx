import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'viewer';
  mustChangeCredentials: boolean;
  createdAt: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  userLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  userLoading: false,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

async function fetchProfile(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/v1/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tm_token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start loading if we have a token on mount (profile fetch in flight)
  const [userLoading, setUserLoading] = useState(() => !!localStorage.getItem('tm_token'));

  const login = useCallback(async (newToken: string) => {
    localStorage.setItem('tm_token', newToken);
    setToken(newToken);
    setUserLoading(true);
    const profile = await fetchProfile(newToken);
    setUser(profile);
    setUserLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tm_token');
    setToken(null);
    setUser(null);
    setUserLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('tm_token');
    if (!t) return;
    const profile = await fetchProfile(t);
    setUser(profile);
  }, []);

  // Restore user on page load if token exists
  useEffect(() => {
    const t = localStorage.getItem('tm_token');
    if (!t) {
      return;
    }
    fetchProfile(t).then((profile) => {
      setUser(profile);
      setUserLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, user, userLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
