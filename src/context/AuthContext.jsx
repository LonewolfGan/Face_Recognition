import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Création du contexte d'authentification
const AuthContext = createContext(null);

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  return useContext(AuthContext);
};

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  // État pour stocker l'utilisateur actuel
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Effet pour charger l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour connecter un utilisateur
  const login = (userData) => {
    // Stocker l'utilisateur dans le state et le localStorage
    setCurrentUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return true;
  };

  // Fonction pour déconnecter un utilisateur
  const logout = () => {
    // Supprimer l'utilisateur du state et du localStorage
    setCurrentUser(null);
    localStorage.removeItem('user');
    return true;
  };

  // Fonction pour mettre à jour les informations de l'utilisateur
  const updateUserInfo = (newUserData) => {
    // Fusionner les données existantes avec les nouvelles données
    const updatedUser = { ...currentUser, ...newUserData };
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  // Valeur du contexte
  const value = {
    currentUser,
    loading,
    login,
    logout,
    updateUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Composant HOC pour protéger les routes qui nécessitent une authentification
export const withAuth = (Component) => {
  return (props) => {
    const { currentUser, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !currentUser) {
        navigate('/login');
      }
    }, [currentUser, loading, navigate]);

    if (loading) {
      return <div>Chargement...</div>;
    }

    return currentUser ? <Component {...props} /> : null;
  };
};

export default AuthContext;