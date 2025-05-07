/**
 * Définition des couleurs pour les thèmes clair et sombre
 * Ce fichier exporte les palettes de couleurs utilisées dans l'application
 */

// Thème clair (par défaut)
const lightTheme = {
  bg: '#f3f4f6',
  card: '#fff',
  text: '#222',
  textMuted: '#777',
  accent: '#4f46e5',
  accentRgb: '79, 70, 229',
  accentLight: '#f0fdf4',
  error: '#dc2626',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  darkRgb: '0, 0, 0',
  textLight: '#fff',
  textLightRgb: '255, 255, 255',
  hover: '#f3f4f6',
  accentDark: '#4338ca',
  disabled: '#a5a5a5'
};

// Thème sombre
const darkTheme = {
  bg: '#111827',
  card: '#1e293b',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  accent: '#6366f1',
  accentRgb: '99, 102, 241',
  accentLight: '#1e293b',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  darkRgb: '17, 24, 39',
  textLight: '#fff',
  textLightRgb: '255, 255, 255',
  hover: '#1f2937',
  accentDark: '#4f46e5',
  disabled: '#4b5563'
};

// Exporter les thèmes
export { lightTheme, darkTheme };

// Fonction utilitaire pour appliquer les variables CSS du thème
export const applyTheme = (theme) => {
  const root = document.documentElement;
  
  // Appliquer chaque propriété du thème comme variable CSS
  Object.entries(theme).forEach(([property, value]) => {
    // Convertir camelCase en kebab-case pour les variables CSS
    const cssVarName = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVarName}`, value);
  });
};