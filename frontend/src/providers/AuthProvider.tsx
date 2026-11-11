import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, unwrap } from '@/lib/endpoints';
import { setAuthToken, setCsrfToken } from '@/lib/api';
import { useTheme } from './ThemeProvider';
import type { PublicUser, SessionPayload } from '@/types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  expiresAt: string | null;
  rememberMe: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<PublicUser>;
  loginWithGoogle: (credential: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setPreference } = useTheme();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    (session: SessionPayload) => {
      setUser(session.user);
      setExpiresAt(session.expiresAt);
      setRememberMe(session.rememberMe);
      setCsrfToken(session.csrfToken);
      setPreference(session.user.themePreference, false);
    },
    [setPreference],
  );

  const clearSession = useCallback(() => {
    setUser(null);
    setExpiresAt(null);
    setRememberMe(false);
    setCsrfToken(null);
    setAuthToken(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = unwrap(await authApi.me());
      applySession(session);
    } catch {
      clearSession();
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const session = unwrap(await authApi.me());
        if (active) applySession(session);
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener('nexo:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nexo:unauthorized', onUnauthorized);
  }, [clearSession]);

  /**
   * Tras iniciar sesión se comprueba si el navegador guardó la cookie de
   * sesión. Si no la guardó (cookies de terceros bloqueadas en modo incógnito
   * o en Safari), se conserva el token devuelto por el login y se envía como
   * `Authorization: Bearer`. Cuando la cookie funciona no se conserva el
   * token, para mantener la protección HttpOnly.
   */
  const applyLoginSession = useCallback(
    async (session: SessionPayload) => {
      applySession(session);
      if (!session.sessionToken) return;

      setAuthToken(session.sessionToken);
      try {
        // Petición deliberadamente sin el token: si responde, la cookie sirve.
        unwrap(await authApi.me({ skipBearerAuth: true }));
        setAuthToken(null);
      } catch {
        // Sin cookie de sesión disponible: se mantiene el token de respaldo.
      }
    },
    [applySession],
  );

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const session = unwrap(await authApi.login({ email, password, rememberMe: remember }));
      await applyLoginSession(session);
      return session.user;
    },
    [applyLoginSession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const session = unwrap(await authApi.loginWithGoogle(credential));
      await applyLoginSession(session);
      return session.user;
    },
    [applyLoginSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateUser = useCallback((next: PublicUser) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      expiresAt,
      rememberMe,
      login,
      loginWithGoogle,
      logout,
      refresh,
      updateUser,
    }),
    [user, loading, expiresAt, rememberMe, login, loginWithGoogle, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
