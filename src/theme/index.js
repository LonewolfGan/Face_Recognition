/**
 * Point d'entrée pour le système de thème
 * Exporte tous les composants et fonctions liés au thème
 */

import ThemeProvider, { useTheme } from './ThemeProvider';
import { lightTheme, darkTheme, applyTheme } from './colors';

export {
  ThemeProvider,
  useTheme,
  lightTheme,
  darkTheme,
  applyTheme
};

export default ThemeProvider;