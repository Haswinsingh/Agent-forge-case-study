import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('agentforge_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    // Verify token on mount
    const token = localStorage.getItem('agentforge_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.user);
          localStorage.setItem('agentforge_user', JSON.stringify(res.user));
        })
        .catch(() => {
          localStorage.removeItem('agentforge_token');
          localStorage.removeItem('agentforge_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('agentforge_token', data.token);
    localStorage.setItem('agentforge_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('agentforge_token');
      localStorage.removeItem('agentforge_user');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      localStorage.setItem('agentforge_user', JSON.stringify(res.user));
    } catch (e) {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
