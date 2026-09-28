import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<string>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dada_mani_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('dada_mani_access_token');
    if (token) {
      refreshProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('dada_mani_user', JSON.stringify(res.data.data));
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('dada_mani_user');
      localStorage.removeItem('dada_mani_access_token');
    }
  };

  const login = async (email: string, pass: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', { email, password: pass });
    const authData: AuthResponse = res.data.data;

    if (!authData.requiresOtp && authData.accessToken) {
      localStorage.setItem('dada_mani_access_token', authData.accessToken);
      if (authData.refreshToken) {
        localStorage.setItem('dada_mani_refresh_token', authData.refreshToken);
      }
      if (authData.user) {
        setUser(authData.user);
        localStorage.setItem('dada_mani_user', JSON.stringify(authData.user));
      }
    }

    return authData;
  };

  const verifyOtp = async (email: string, otp: string): Promise<void> => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const authData = res.data.data;

    localStorage.setItem('dada_mani_access_token', authData.accessToken);
    if (authData.refreshToken) {
      localStorage.setItem('dada_mani_refresh_token', authData.refreshToken);
    }
    if (authData.user) {
      setUser(authData.user);
      localStorage.setItem('dada_mani_user', JSON.stringify(authData.user));
    }
  };

  const resendOtp = async (email: string): Promise<string> => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data.message || 'OTP resent successfully';
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dada_mani_user');
    localStorage.removeItem('dada_mani_access_token');
    localStorage.removeItem('dada_mani_refresh_token');
    window.location.href = '/login';
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    // The server now returns the full effective permission set (role
    // defaults + customPermissions) on login/verify-otp/me — see backend
    // utils/permissions.util.ts. This used to unconditionally return true
    // for Manager/Viewer, which meant frontend permission gating did
    // nothing; the server-side requirePermission check was always the real
    // gate. Falling back to true only when we have no permissions array at
    // all (e.g. a stale cached user from before this change) avoids hiding
    // everything until the next login refreshes it.
    if (!user.permissions) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyOtp,
        resendOtp,
        logout,
        hasPermission,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
