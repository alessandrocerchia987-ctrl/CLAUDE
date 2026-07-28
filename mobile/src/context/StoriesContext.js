import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const StoriesContext = createContext(null);

export function StoriesProvider({ children }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { stories: fetched } = await api.get('/stories');
      setStories(fetched);
    } catch (err) {
      console.warn('Falha ao carregar stories:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StoriesContext.Provider value={{ stories, loading, refresh }}>{children}</StoriesContext.Provider>
  );
}

export function useStories() {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
}
