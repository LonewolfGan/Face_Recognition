# Système de Thème

Ce dossier contient un système complet de gestion de thème pour l'application React.

## Fichiers

- `colors.js` - Définit les palettes de couleurs pour les thèmes clair et sombre
- `ThemeProvider.jsx` - Fournit un contexte React pour gérer le thème
- `ThemeToggle.jsx` - Composant d'exemple pour basculer entre les thèmes
- `index.js` - Point d'entrée pour faciliter l'importation

## Utilisation

### 1. Envelopper votre application avec le ThemeProvider

```jsx
import { ThemeProvider } from './theme';

function App() {
  return (
    <ThemeProvider>
      {/* Votre application */}
    </ThemeProvider>
  );
}
```

### 2. Utiliser le hook useTheme dans vos composants

```jsx
import { useTheme } from './theme';

function MonComposant() {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  
  return (
    <div>
      <p>Mode actuel: {isDarkMode ? 'Sombre' : 'Clair'}</p>
      <button onClick={toggleTheme}>Changer de thème</button>
      
      {/* Accéder aux couleurs du thème actuel */}
      <div style={{ color: theme.accent }}>
        Texte coloré avec la couleur d'accent du thème
      </div>
    </div>
  );
}
```

### 3. Utiliser le composant ThemeToggle

```jsx
import ThemeToggle from './theme/ThemeToggle';

function Header() {
  return (
    <header>
      <h1>Mon Application</h1>
      <ThemeToggle />
    </header>
  );
}
```

## Fonctionnalités

- Bascule entre thèmes clair et sombre
- Persistance du thème via localStorage
- Application automatique des variables CSS
- Accès aux valeurs du thème via le hook useTheme