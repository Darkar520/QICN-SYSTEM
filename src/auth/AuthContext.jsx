import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import runtimeEnv from '../config/runtimeEnv.js';

const TOKEN_STORAGE_KEY = 'QICN_NETLIFY_JWT';

const AuthContext = createContext({
  loading: true,
  isAuthenticated: false,
  user: null,
  token: '',
  login: () => {},
  logout: () => {},
  refreshSession: async () => ({ ok: false })
});

const getIdentity = () => {
  if (typeof window === 'undefined') return null;
  return window.netlifyIdentity || null;
};

const parseIdentityUser = (identityUser) => {
  if (!identityUser) return null;
  return {
    id: identityUser?.id || identityUser?.sub || null,
    email: identityUser?.email || identityUser?.user_metadata?.email || '',
    role: Array.isArray(identityUser?.app_metadata?.roles) ? identityUser.app_metadata.roles.join(',') : ''
  };
};

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  const refreshSession = useCallback(async (explicitToken) => {
    const nextToken = explicitToken || token || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!runtimeEnv.AUTH_REQUIRED) {
      setUser({ id: 'local-dev', email: 'local@qicn', role: 'dev' });
      setToken('dev');
      setLoading(false);
      return { ok: true, user: { id: 'local-dev' } };
    }

    if (!nextToken) {
      setUser(null);
      setToken('');
      setLoading(false);
      return { ok: false, error: 'NO_TOKEN' };
    }

    try {
      const response = await fetch('/.netlify/functions/auth-introspection', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${nextToken}`
        }
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `AUTH_${response.status}`);
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      setToken(nextToken);
      setUser(body.user || null);
      return { ok: true, user: body.user || null };
    } catch (error) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken('');
      setUser(null);
      return { ok: false, error: error?.message || 'AUTH_FAILED' };
    } finally {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(() => {
    const identity = getIdentity();
    if (identity) {
      identity.open('login');
      return;
    }
    const manual = window.prompt('Pega tu JWT de Netlify Identity para acceso privado:');
    if (manual && manual.trim()) {
      refreshSession(manual.trim());
    }
  }, [refreshSession]);

  const logout = useCallback(() => {
    const identity = getIdentity();
    if (identity) {
      identity.logout();
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const identity = getIdentity();

    if (identity) {
      identity.on('login', async (identityUser) => {
        const jwt = await identityUser?.jwt?.();
        await refreshSession(jwt || '');
      });
      identity.on('logout', () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken('');
        setUser(null);
        setLoading(false);
      });
      identity.on('init', async (identityUser) => {
        if (identityUser) {
          const jwt = await identityUser?.jwt?.();
          setUser(parseIdentityUser(identityUser));
          await refreshSession(jwt || '');
        } else {
          await refreshSession(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
        }
      });
      identity.init();
      return;
    }

    refreshSession(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  }, [refreshSession]);

  const value = useMemo(() => ({
    loading,
    isAuthenticated: !runtimeEnv.AUTH_REQUIRED || Boolean(token),
    user,
    token,
    login,
    logout,
    refreshSession
  }), [loading, token, user, login, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
