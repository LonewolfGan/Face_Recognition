import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import useOffline from "./useOffline";

/**
 * Hook personnalisé pour synchroniser les notes entre le stockage local et le serveur
 * @param {Array} notes - Les notes à synchroniser
 * @returns {Object} - Objet contenant l'état de synchronisation et les fonctions associées
 */
const useSyncNotes = (notes) => {
  const { currentUser } = useAuth();
  const isOffline = useOffline();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);

  // Vérifier s'il y a des notes à synchroniser au démarrage
  useEffect(() => {
    if (currentUser) {
      const storedPendingChanges = localStorage.getItem(`pending_sync_${currentUser.user_id}`);
      if (storedPendingChanges) {
        setPendingChanges(JSON.parse(storedPendingChanges));
      }
    }
  }, [currentUser]);

  // Surveiller les changements de connexion pour synchroniser automatiquement
  useEffect(() => {
    if (!isOffline && pendingChanges.length > 0 && currentUser) {
      syncNotes();
    }
  }, [isOffline, pendingChanges, currentUser]);

  // Fonction pour ajouter une note à synchroniser
  const addPendingChange = (note, changeType) => {
    if (!currentUser) return;

    const newPendingChange = {
      note,
      changeType, // 'add', 'update', ou 'delete'
      timestamp: Date.now()
    };

    const updatedPendingChanges = [...pendingChanges, newPendingChange];
    setPendingChanges(updatedPendingChanges);
    localStorage.setItem(`pending_sync_${currentUser.user_id}`, JSON.stringify(updatedPendingChanges));
  };

  // Fonction pour synchroniser les notes avec le serveur
  const syncNotes = async () => {
    if (isOffline || !currentUser || pendingChanges.length === 0) return;

    setIsSyncing(true);

    try {
      // Simulation: Attendre un peu pour simuler une requête réseau
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ici, vous implémenteriez l'appel API réel pour synchroniser les notes
      console.log("Synchronisation des notes:", pendingChanges);

      // Mise à jour de l'état après synchronisation réussie
      setPendingChanges([]);
      localStorage.removeItem(`pending_sync_${currentUser.user_id}`);
      setLastSynced(new Date());
    } catch (error) {
      console.error("Erreur lors de la synchronisation:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    lastSynced,
    pendingChanges,
    addPendingChange,
    syncNotes,
    hasPendingChanges: pendingChanges.length > 0
  };
};

export default useSyncNotes;