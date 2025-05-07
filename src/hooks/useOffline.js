import { useState, useEffect } from "react";

/**
 * Hook personnalisé pour détecter l'état de la connexion internet
 * @returns {boolean} - true si l'utilisateur est hors ligne, false sinon
 */
const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Fonction pour mettre à jour l'état hors ligne
    const handleOffline = () => setIsOffline(true);
    // Fonction pour mettre à jour l'état en ligne
    const handleOnline = () => setIsOffline(false);

    // Ajouter les écouteurs d'événements
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Nettoyer les écouteurs d'événements
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return isOffline;
};

export default useOffline;