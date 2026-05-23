import { useState, useEffect } from "react";

/**
 * Hook personnalisé pour gérer le stockage local
 * @param {string} key - La clé pour stocker la valeur
 * @param {any} initialValue - La valeur initiale
 * @returns {Array} - [storedValue, setValue]
 */
const useLocalStorage = (key, initialValue) => {
  // Fonction pour obtenir la valeur initiale du localStorage
  const readValue = () => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture de ${key} depuis localStorage:`, error);
      return initialValue;
    }
  };

  // État pour stocker la valeur
  const [storedValue, setStoredValue] = useState(readValue);

  // Fonction pour mettre à jour la valeur dans le localStorage
  const setValue = (value) => {
    try {
      // Permettre à la valeur d'être une fonction
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Sauvegarder dans l'état
      setStoredValue(valueToStore);
      
      // Sauvegarder dans localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erreur lors de l'écriture de ${key} dans localStorage:`, error);
    }
  };

  // Écouter les changements dans d'autres onglets/fenêtres
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key) {
        setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
      }
    };
    
    // Ajouter l'écouteur d'événement
    window.addEventListener("storage", handleStorageChange);
    
    // Nettoyer l'écouteur d'événement
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
};

export default useLocalStorage;