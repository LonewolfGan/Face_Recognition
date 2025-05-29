import React, { createContext, useState, useContext, useEffect } from 'react';
import { lightTheme, darkTheme, applyTheme } from './colors';

// Création du contexte de thème
const ThemeContext = createContext();

/**
 * Hook personnalisé pour utiliser le contexte de thème
 * @returns {Object} Contexte de thème contenant le thème actuel et les fonctions pour le modifier
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un ThemeProvider');
  }
  return context;
};

/**
 * Composant fournisseur de thème qui gère l'état du thème et le rend disponible via le contexte
 * @param {Object} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Les composants enfants
 */
export const ThemeProvider = ({ children }) => {
  // Récupérer le thème depuis le localStorage ou utiliser le thème clair par défaut
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // Appliquer le thème actuel
  useEffect(() => {
    // Précharger les images de fond
    const lightBgImage = new Image();
    lightBgImage.src = '/src/assets/background-pattern.svg';
    
    const darkBgImage = new Image();
    darkBgImage.src = '/src/assets/background-pattern-dark.svg';
    
    // Précharger l'image de fond de la landing page
    const landingBgImage = new Image();
    landingBgImage.src = '/src/assets/face-recognition-bg.jpg';
    
    const theme = isDarkMode ? darkTheme : lightTheme;
    applyTheme(theme);
    
    // Mettre à jour la classe du body pour les styles CSS spécifiques au thème
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Sauvegarder le thème dans le localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Fonction pour basculer entre les thèmes
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Fonction pour définir explicitement un thème
  const setTheme = (mode) => {
    setIsDarkMode(mode === 'dark');
  };

  // Valeur du contexte à fournir
  const themeContextValue = {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: isDarkMode ? darkTheme : lightTheme
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;