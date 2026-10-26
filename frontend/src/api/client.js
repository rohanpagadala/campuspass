import axios from "axios";

// Defaults to a relative "/api" path so the built bundle works unmodified
// behind any reverse proxy (nginx in Docker, Vite's dev proxy locally) -
// no backend URL needs to be baked in at build time. VITE_API_URL remains
// available as an escape hatch for setups with no proxy in front (e.g.
// frontend and backend deployed as separate public services).
const API_URL = import.meta.env.VITE_API_URL || "/api";

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
