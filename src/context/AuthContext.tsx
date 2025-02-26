import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!response.ok) {
        throw new Error('Refresh token invalid or expired');
      }
      const data = await response.json();
      // Update the access token
      setAccessToken(data.access);
      localStorage.setItem('accessToken', data.access);
      // If a new refresh token is provided (due to rotation), update it too.
      if (data.refresh) {
        setRefreshToken(data.refresh);
        localStorage.setItem('refreshToken', data.refresh);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  // Automatically refresh the access token a minute before expiry (15 mins - 1 min = 14 mins)
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshToken) {
        refreshAccessToken();
      }
    }, 14 * 60 * 1000); // 14 minutes
    return () => clearInterval(interval);
  }, [refreshToken]);

  return (
    <AuthContext.Provider value={{ accessToken, refreshToken, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
