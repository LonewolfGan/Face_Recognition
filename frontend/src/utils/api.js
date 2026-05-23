/**
 * API client configuration.
 *
 * Reads the backend URL from the VITE_API_URL environment variable
 * (set in .env.development / .env.production), falling back to
 * http://localhost:5000 for local development.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Pre-configured Axios instance pointing at the backend API.
 * Use this for unauthenticated requests (e.g., login, register).
 * For authenticated requests, use the authFetch instance from AuthContext.
 */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export { API_URL };
export default api;
