import React from 'react';
import { useTheme } from './ThemeProvider';

/**
 * Composant bouton pour basculer entre les thèmes clair et sombre
 * Exemple d'utilisation du hook useTheme
 */
const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="settings-item"
      aria-label={isDarkMode ? 'Passer au thème clair' : 'Passer au thème sombre'}
    >
      <span>
        {isDarkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
      </span>
    </button>
  );
};

export default ThemeToggle;