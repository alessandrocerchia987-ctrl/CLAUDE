import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 30 * 1000;

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollTimer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { count } = await api.get('/notifications/unread-count');
      setUnreadCount(count);
    } catch (err) {
      console.warn('Falha ao carregar notificações por ler:', err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    pollTimer.current = setInterval(refresh, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      sub.remove();
    };
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
