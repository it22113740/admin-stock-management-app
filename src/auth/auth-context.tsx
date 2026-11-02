import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AuthUser } from '@/auth/types';
import { apiRequest, setUnauthorizedHandler } from '@/lib/api';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/session';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loginRequest(email: string, password: string): Promise<{
  accessToken: string;
  user: AuthUser;
}> {
  const response = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  return response.data;
}

async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<AuthUser>('/auth/me');
  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    setUnauthorizedHandler(() => {
      if (cancelled) {
        return;
      }
      setUser(null);
      setStatus('signedOut');
    });

    async function restore() {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setStatus('signedOut');
        }
        return;
      }

      try {
        const current = await fetchCurrentUser();
        if (cancelled) {
          return;
        }
        if (current.role !== 'ADMIN') {
          await clearAccessToken();
          setUser(null);
          setStatus('signedOut');
          return;
        }
        setUser(current);
        setStatus('signedIn');
      } catch {
        await clearAccessToken();
        if (!cancelled) {
          setUser(null);
          setStatus('signedOut');
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email: string, password: string) {
        const result = await loginRequest(email, password);
        if (result.user.role !== 'ADMIN') {
          throw new Error('This app is for admin accounts.');
        }
        await setAccessToken(result.accessToken);
        setUser(result.user);
        setStatus('signedIn');
      },
      async signOut() {
        await clearAccessToken();
        setUser(null);
        setStatus('signedOut');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
