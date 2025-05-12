// src/api/axiosInstance.ts
import axios from 'axios';
import {jwtDecode} from "jwt-decode";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL as string,
});

api.interceptors.request.use(
  async (config) => {
    let accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
      try {
        // Decode token to get expiration time
        const { exp } = jwtDecode<{ exp: number }>(accessToken);
        const now = Date.now() / 1000;
        // If token expires in less than 60 seconds, refresh it
        if (exp - now < 60 && refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );
          // Ensure we get a new access token as a string
          const newAccessToken = response.data.access;
          if (!newAccessToken) {
            throw new Error("No access token returned from refresh");
          }
          localStorage.setItem('accessToken', newAccessToken);
          accessToken = newAccessToken;
          // If a new refresh token is provided, update it too.
          if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh);
          }
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
      // Update the Authorization header using the set method if available
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        config.headers = { ...config.headers, Authorization: `Bearer ${accessToken}` } as any;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
