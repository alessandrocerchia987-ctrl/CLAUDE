import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client';
import { registerForPushNotifications } from '../utils/registerPush';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { user: me } = await api.get('/auth/me');
          setUser(me);
          registerForPushNotifications();
        } catch {
          await setToken(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  const login = useCallback(async (phone, password) => {
    const { token, user: loggedInUser } = await api.post('/auth/login', { phone, password }, { auth: false });
    await setToken(token);
    setUser(loggedInUser);
    registerForPushNotifications();
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await api.post('/auth/register', payload, { auth: false });
    await setToken(token);
    setUser(newUser);
    registerForPushNotifications();
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: me } = await api.get('/auth/me');
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, booting, login, register, logout, refreshUser, setUser }),
    [user, booting, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
