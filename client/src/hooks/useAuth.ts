import { useState, useEffect, useCallback } from 'react';
import { setToken, setImpersonateUserId } from '../api/http';
import { wsClient } from '../api/ws';

interface AuthState {
  authenticated: boolean;
  username: string | null;
  userId: string | null;
  email: string | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    username: null,
    userId: null,
    email: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState({ authenticated: false, username: null, userId: null, email: null, role: null, loading: false });
      return;
    }
    // Verify token — use raw fetch to avoid the 401 interceptor
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        setState({
          authenticated: true,
          username: data.username,
          userId: data.userId,
          email: data.email,
          role: data.role,
          loading: false,
        });
      })
      .catch(() => {
        setToken(null);
        setState({ authenticated: false, username: null, userId: null, email: null, role: null, loading: false });
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    wsClient.reconnect(); // Reconnect with new token
    setState({
      authenticated: true,
      username: data.username,
      userId: data.userId,
      email: data.email,
      role: data.role,
      loading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } catch { /* ignore */ }
    setToken(null);
    setImpersonateUserId(null);
    wsClient.disconnect(); // Disconnect WebSocket on logout
    setState({ authenticated: false, username: null, userId: null, email: null, role: null, loading: false });
  }, []);

  return { ...state, login, logout };
}
