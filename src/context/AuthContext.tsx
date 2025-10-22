import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  department: string | null;
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
  const [department, setDepartment] = useState<string | null>(() => {
    const storedDept = localStorage.getItem('department');
    console.log('Stored department from localStorage:', storedDept);
    return storedDept;
  });

  const login = async (email: string, password: string) => {
    // Determine if client is on a local network
    const isLocalNetwork = typeof window !== 'undefined' &&
      (window.location.hostname.startsWith('192.168.') ||
       window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1');
    // Choose the appropriate base URL
    const apiurl = isLocalNetwork
      ? import.meta.env.VITE_BASE_URL || import.meta.env.VITE_LOCAL_URL
      : import.meta.env.VITE_BASE_GLOBAL_URL;
    console.log("API URL:", apiurl);

    try {
      const response = await fetch(`${apiurl}/token/`, {
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
      
      // Parse the JWT to get the department
      try {
        const payload = JSON.parse(atob(data.access.split('.')[1]));
        console.log('JWT Payload:', payload); // Debug payload
        
        // Check if department exists and set it properly
        if (payload.department) {
          const userDepartment = payload.department.toString().trim();
          console.log('Department from JWT (raw):', userDepartment);
          console.log('Department from JWT (uppercase):', userDepartment.toUpperCase());
          
          // Store the department in the exact format needed for later comparisons
          setDepartment(userDepartment.toUpperCase());
          localStorage.setItem('department', userDepartment.toUpperCase());
        } else {
          console.log('No department found in JWT, defaulting to SCM');
          setDepartment('SCM');
          localStorage.setItem('department', 'SCM');
        }
      } catch (e) {
        console.error('Error parsing JWT:', e);
        setDepartment('SCM'); // Default to SCM if there's an error
        localStorage.setItem('department', 'SCM');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setDepartment(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('department');
  };

  const refreshAccessToken = async () => {
    // Determine if client is on a local network
    const isLocalNetwork = typeof window !== 'undefined' &&
      (window.location.hostname.startsWith('192.168.') ||
       window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1');

    // Choose the appropriate base URL
    const apiurl = isLocalNetwork
      ? import.meta.env.VITE_BASE_URL || import.meta.env.VITE_LOCAL_URL
      : import.meta.env.VITE_BASE_GLOBAL_URL;
    console.log("API URL:", apiurl);

    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await fetch(`${apiurl}/token/refresh/`, {
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
      
      // Parse the JWT to get the department (in case it changed)
      try {
        const payload = JSON.parse(atob(data.access.split('.')[1]));
        console.log('Refresh Token JWT Payload:', payload); // Debug payload
        
        // Check if department exists and set it properly
        if (payload.department) {
          const userDepartment = payload.department.toString().trim();
          console.log('Department from refresh token (raw):', userDepartment);
          console.log('Department from refresh token (uppercase):', userDepartment.toUpperCase());
          
          // Store the department in the exact format needed for later comparisons
          setDepartment(userDepartment.toUpperCase());
          localStorage.setItem('department', userDepartment.toUpperCase());
        } else {
          console.log('No department found in refresh token, defaulting to SCM');
          setDepartment('SCM');
          localStorage.setItem('department', 'SCM');
        }
      } catch (e) {
        console.error('Error parsing JWT:', e);
      }
      
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
    }, 64 * 60 * 1000); // 14 minutes
    return () => clearInterval(interval);
  }, [refreshToken]);

  // More aggressive logging for department
  useEffect(() => {
    console.log('Current department state:', department);
  }, [department]);

  return (
    <AuthContext.Provider value={{ accessToken, refreshToken, department, login, logout, refreshAccessToken }}>
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
