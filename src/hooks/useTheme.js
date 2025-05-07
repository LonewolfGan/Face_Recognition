import { useState, useEffect } from "react";
import useLocalStorage from "./useLocalStorage";

/**
 * Hook personnalisé pour gérer le thème de l'application
 * @returns {Object} - Objet contenant l'état du thème et les fonctions associées
 */
const useTheme = () => {
  // Utiliser le hook useLocalStorage pour persister le thème
  const [theme, setTheme] = useLocalStorage("theme", "light");
  
  // État pour suivre si le thème est sombre
  const [isDark, setIsDark] = useState(theme === "dark");

  // Appliquer le thème au chargement et lors des changements
  useEffect(() => {
    setIsDark(theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Fonction pour basculer entre les thèmes
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Fonction pour définir un thème spécifique
  const setThemeMode = (mode) => {
    if (mode === "light" || mode === "dark") {
      setTheme(mode);
    }
  };

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme: setThemeMode
  };
};

export default useTheme;