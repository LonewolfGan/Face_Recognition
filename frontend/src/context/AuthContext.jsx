import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { createAuthFetch } from '../utils/authFetch';

// Création du contexte d'authentification
const AuthContext = createContext(null);

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  return useContext(AuthContext);
};

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  // Access token stored ONLY in React state (never localStorage/sessionStorage)
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to always have the latest token available for the interceptor
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // Auth failure handler: clear state and redirect to login
  const handleAuthFailure = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    // Use window.location for redirect since AuthProvider may be outside Router
    window.location.href = '/login';
  }, []);

  // Create the authFetch axios instance with interceptors
  const authFetch = useMemo(() => {
    return createAuthFetch({
      getAccessToken: () => accessTokenRef.current,
      setAccessToken: (token) => setAccessToken(token),
      onAuthFailure: handleAuthFailure,
    });
  }, [handleAuthFailure]);

  // On app load: attempt to restore session from existing httpOnly cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/refresh-token`,
          {},
          { withCredentials: true }
        );

        if (response.data && response.data.access_token) {
          setAccessToken(response.data.access_token);
          // If the backend returns user info with the refresh response, use it
          if (response.data.user) {
            setUser(response.data.user);
          }
        }
      } catch (error) {
        // No valid refresh token cookie — user needs to log in
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login: authenticate and store access_token in state
  // Refresh token is set as httpOnly cookie by the backend automatically
  const login = useCallback(async (credentials) => {
    const response = await axios.post(
      `${API_URL}/login`,
      credentials,
      { withCredentials: true }
    );

    const { access_token, user: userData } = response.data;
    setAccessToken(access_token);
    setUser(userData);
    return response.data;
  }, []);

  // Logout: call backend to invalidate refresh tokens, then clear local state
  const logout = useCallback(async () => {
    try {
      await authFetch.post('/logout');
    } catch (error) {
      // Even if the logout request fails, clear local state
      console.error('Logout request failed:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [authFetch]);

  // Derived authentication state
  const isAuthenticated = !!accessToken;

  // Valeur du contexte — expose `currentUser` as alias for backward compatibility
  const value = useMemo(() => ({
    user,
    currentUser: user, // backward compatibility alias
    accessToken,
    isAuthenticated,
    isLoading,
    loading: isLoading, // backward compatibility alias
    login,
    logout,
    authFetch,
  }), [user, accessToken, isAuthenticated, isLoading, login, logout, authFetch]);

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Composant HOC pour protéger les routes qui nécessitent une authentification
export const withAuth = (Component) => {
  return (props) => {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        window.location.href = '/login';
      }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
      return <div>Chargement...</div>;
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
};

export default AuthContext;
