import axios from 'axios';
import { API_URL } from '../config';

// Module-level state for token refresh queue
let isRefreshing = false;
let failedQueue = [];

/**
 * Process queued requests after a token refresh attempt.
 * @param {string|null} newToken - The new access token, or null if refresh failed.
 * @param {Error|null} error - The error if refresh failed.
 */
function processQueue(newToken, error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(newToken);
    }
  });
  failedQueue = [];
}

/**
 * Creates and configures an Axios instance with auth interceptors.
 *
 * @param {Object} options
 * @param {() => string|null} options.getAccessToken - Returns the current access token from state.
 * @param {(token: string|null) => void} options.setAccessToken - Updates the access token in state.
 * @param {() => void} options.onAuthFailure - Called when refresh fails (should redirect to login).
 * @returns {import('axios').AxiosInstance} Configured axios instance.
 */
export function createAuthFetch({ getAccessToken, setAccessToken, onAuthFailure }) {
  const instance = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Send httpOnly cookies (refresh_token) with every request
    timeout: 15000,       // Fail fast if backend is cold-starting or unreachable
  });

  // Request interceptor: attach Authorization header if token exists
  instance.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle 401 token_expired with refresh + retry
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Only handle 401 with "token_expired" error code, and only retry once
      if (
        error.response &&
        error.response.status === 401 &&
        error.response.data &&
        error.response.data.error === 'token_expired' &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return instance(originalRequest);
          });
        }

        isRefreshing = true;

        try {
          // Attempt to refresh the token
          const refreshResponse = await axios.post(
            `${API_URL}/refresh-token`,
            {},
            { withCredentials: true, timeout: 15000 }
          );

          const newAccessToken = refreshResponse.data.access_token;
          setAccessToken(newAccessToken);
          processQueue(newAccessToken, null);

          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(null, refreshError);
          setAccessToken(null);
          onAuthFailure();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
