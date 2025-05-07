import { useState, useEffect } from "react";

/**
 * Hook personnalisé pour détecter les media queries CSS
 * @param {string} query - La media query à surveiller
 * @returns {boolean} - true si la media query correspond, false sinon
 */
const useMediaQuery = (query) => {
  // Créer un MediaQueryList
  const getMatches = () => {
    // Vérifier si window est défini (pour SSR)
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  // État pour stocker le résultat de la media query
  const [matches, setMatches] = useState(getMatches);

  // Fonction pour mettre à jour l'état
  const handleChange = () => {
    setMatches(getMatches());
  };

  // Écouter les changements de la media query
  useEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Appeler handleChange immédiatement pour définir l'état initial
    handleChange();

    // Utiliser addListener ou addEventListener selon la compatibilité du navigateur
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange);
    } else {
      matchMedia.addEventListener("change", handleChange);
    }

    // Nettoyer l'écouteur d'événement
    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange);
      } else {
        matchMedia.removeEventListener("change", handleChange);
      }
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;