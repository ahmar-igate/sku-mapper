// src/api/axiosInstance.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import { jwtDecode } from "jwt-decode";

// --------------------
// Environment Detection
// --------------------
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

// Local dev (localhost or loopback)
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// Private LAN IP ranges (192.168.x.x, 10.x.x.x, 172.16–31.x.x)
const isPrivateLan =
  /^192\.168\./.test(hostname) ||
  /^10\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

// Choose base URL
let apiurl: string;

if (isLocalhost) {
  apiurl = import.meta.env.VITE_LOCAL_URL;
} else if (isPrivateLan) {
  apiurl = import.meta.env.VITE_BASE_URL;
} else {
  apiurl = import.meta.env.VITE_BASE_GLOBAL_URL;
}

console.log("API URL:", apiurl);

// --------------------
// Axios Instance
// --------------------
const api = axios.create({
  baseURL: apiurl,
});

// --------------------
// Interceptor: Token Handling
// --------------------
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (accessToken) {
      try {
        // Decode token to get expiration time
        const { exp } = jwtDecode<{ exp: number }>(accessToken);
        const now = Date.now() / 1000;

        // If token expires in less than 60 seconds, refresh it
        if (exp - now < 60 && refreshToken) {
          const response = await axios.post(
            `${apiurl}/token/refresh/`,
            { refresh: refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          const newAccessToken = response.data.access;
          if (!newAccessToken) {
            throw new Error("No access token returned from refresh");
          }

          localStorage.setItem("accessToken", newAccessToken);
          accessToken = newAccessToken;

          if (response.data.refresh) {
            localStorage.setItem("refreshToken", response.data.refresh);
          }
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
      }

      // ✅ Safely attach Authorization header
      config.headers.set?.("Authorization", `Bearer ${accessToken}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
