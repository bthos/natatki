/**
 * Auth store for managing authentication state
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  loading: boolean;
  
  // Actions
  login: () => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  accessToken: null,
  loading: true,

  login: () => {
    // Redirect to GitHub OAuth
    if (typeof window === 'undefined') {
      console.error('login() called on server side');
      return;
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const authUrl = `${apiUrl}/auth/github`;
    console.log('Redirecting to:', authUrl);
    
    // Use window.location.href for immediate redirect
    window.location.href = authUrl;
  },

  setAccessToken: (token: string) => {
    apiClient.setAccessToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('natatki_access_token', token);
    }
    set({ accessToken: token, isAuthenticated: true });
  },

  logout: () => {
    apiClient.clearAccessToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('natatki_access_token');
    }
    set({ accessToken: null, isAuthenticated: false });
  },

  checkAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('natatki_access_token');
      if (token) {
        apiClient.setAccessToken(token);
        set({ accessToken: token, isAuthenticated: true, loading: false });
      } else {
        set({ isAuthenticated: false, loading: false });
      }
    }
  }
}));

