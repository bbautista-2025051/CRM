import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi, unwrap } from '@/lib/endpoints';
import { getAuthToken, setAuthToken, setCsrfToken } from '@/lib/api';
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
  /**
   * Marca cada inicio de sesión. Las comprobaciones que estaban en curso
   * (bootstrap o refresh) solo pueden limpiar la sesión si no ocurrió un login
   * después de que empezaran; de lo contrario borrarían una sesión recién
   * creada (el "entra y me saca al instante" en iOS con la API en otro dominio).
   */
  const sessionGeneration = useRef(0);

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
    const generation = sessionGeneration.current;
    try {
      const session = unwrap(await authApi.me());
      if (sessionGeneration.current === generation) applySession(session);
    } catch {
      if (sessionGeneration.current === generation) clearSession();
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    let active = true;
    const generation = sessionGeneration.current;

    const bootstrap = async () => {
      try {
        const session = unwrap(await authApi.me());
        if (active && sessionGeneration.current === generation) applySession(session);
      } catch {
        if (active && sessionGeneration.current === generation) clearSession();
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
    const onUnauthorized = (event: Event) => {
      const failedToken =
        (event as CustomEvent<{ token?: string | null }>).detail?.token ?? null;
      const currentToken = getAuthToken();
      // Un 401 de una petición anterior no debe cerrar una sesión más reciente.
      if (currentToken && currentToken !== failedToken) return;
      clearSession();
    };
    window.addEventListener('nexo:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nexo:unauthorized', onUnauthorized);
  }, [clearSession]);

  /**
   * Conserva siempre el token devuelto por el login. La cookie HttpOnly sigue
   * siendo el mecanismo principal, pero en iOS/Safari y en modo incógnito el
   * navegador bloquea las cookies de terceros (frontend y API en dominios
   * distintos) y el token es lo único que mantiene la sesión. El backend
   * acepta la primera sesión válida entre cookie y Bearer, así que enviarlo
   * también cuando la cookie funciona no rompe nada.
   */
  const applyLoginSession = useCallback(
    (session: SessionPayload) => {
      sessionGeneration.current += 1;
      applySession(session);
      if (session.sessionToken) setAuthToken(session.sessionToken);
    },
    [applySession],
  );

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const session = unwrap(await authApi.login({ email, password, rememberMe: remember }));
      applyLoginSession(session);
      return session.user;
    },
    [applyLoginSession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const session = unwrap(await authApi.loginWithGoogle(credential));
      applyLoginSession(session);
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
