import os
import shutil
import faiss
import pickle
import numpy as np
import sqlite3

# Configuration
FACES_DIR = 'faces'
EMBEDDINGS_FILE = 'embeddings.pkl'
EMBEDDINGS_INDEX_PATH = 'embeddings.index'
DATABASE_FILE = 'users.db'

def reset_face_recognition_system():
    """
    Réinitialise complètement le système de reconnaissance faciale
    en supprimant tous les fichiers d'index et les visages stockés.
    """
    # Supprimer le fichier d'embeddings
    if os.path.exists(EMBEDDINGS_FILE):
        os.remove(EMBEDDINGS_FILE)
        print(f"Fichier {EMBEDDINGS_FILE} supprimé.")
    
    # Supprimer l'index FAISS
    if os.path.exists(EMBEDDINGS_INDEX_PATH):
        os.remove(EMBEDDINGS_INDEX_PATH)
        print(f"Fichier {EMBEDDINGS_INDEX_PATH} supprimé.")
    
    
    # Créer un nouveau dictionnaire d'embeddings vide
    embeddings_map = {}
    with open(EMBEDDINGS_FILE, 'wb') as f:
        pickle.dump(embeddings_map, f)
    print(f"Nouveau fichier {EMBEDDINGS_FILE} créé (vide).")
    
    # Créer un nouvel index FAISS vide
    dimension = 512  # Dimension des embeddings ArcFace
    index = faiss.IndexFlatL2(dimension)
    faiss.write_index(index, EMBEDDINGS_INDEX_PATH)
    print(f"Nouvel index FAISS créé (vide).")
    
    print("Système de reconnaissance faciale réinitialisé avec succès.")

def reset_database():
    """
    Réinitialise la base de données en supprimant toutes les données
    des tables tout en préservant la structure.
    """
    print("Réinitialisation de la base de données...")
    
    # Vérifier si la base de données existe
    if not os.path.exists(DATABASE_FILE):
        print(f"Base de données {DATABASE_FILE} non trouvée.")
        return
    
    # Connexion à la base de données
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    try:
        # Démarrer une transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # Supprimer toutes les données des tables
        cursor.execute("DELETE FROM notes")
        cursor.execute("DELETE FROM users")
        
        # Vérifier si la table settings existe avant de la vider
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM settings")
        
        # Valider les changements
        conn.commit()
        print("Tables de la base de données vidées avec succès!")
        
    except Exception as e:
        # Annuler en cas d'erreur
        conn.rollback()
        print(f"Erreur lors de la réinitialisation de la base de données: {str(e)}")
    finally:
        # Fermer la connexion
        conn.close()

def reset_complete_system():
    """
    Réinitialise l'ensemble du système: reconnaissance faciale et base de données.
    """
    print("=== RÉINITIALISATION COMPLÈTE DU SYSTÈME ===")
    reset_face_recognition_system()
    reset_database()
    print("=== RÉINITIALISATION TERMINÉE ===")

if __name__ == "__main__":
    # Demander confirmation
    confirm = input("Cette opération va SUPPRIMER TOUTES les données du système. Êtes-vous sûr? (o/n): ")
    if confirm.lower() in ['o', 'oui', 'y', 'yes']:
        reset_complete_system()
    else:
        print("Opération annulée.")