import os
import shutil
import faiss
import pickle
import numpy as np
import sqlite3

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACES_DIR = os.path.join(BASE_DIR, 'faces')
EMBEDDINGS_FILE = os.path.join(BASE_DIR, 'embeddings.pkl')
EMBEDDINGS_INDEX_PATH = os.path.join(BASE_DIR, 'embeddings.index')
DATABASE_FILE = os.path.join(BASE_DIR, 'users.db')

def reset_face_recognition_system():
    """
    Réinitialise complètement le système de reconnaissance faciale
    en supprimant tous les fichiers d'index et les visages stockés.
    """
    print(f"Chemin embeddings: {EMBEDDINGS_FILE}")
    print(f"Chemin index FAISS: {EMBEDDINGS_INDEX_PATH}")
    # Supprimer le fichier d'embeddings
    try:
        if os.path.exists(EMBEDDINGS_FILE):
            os.remove(EMBEDDINGS_FILE)
            print(f"Fichier {EMBEDDINGS_FILE} supprimé.")
        else:
            print(f"Fichier {EMBEDDINGS_FILE} introuvable.")
    except Exception as e:
        print(f"Erreur lors de la suppression de {EMBEDDINGS_FILE}: {e}")
    # Supprimer l'index FAISS
    try:
        if os.path.exists(EMBEDDINGS_INDEX_PATH):
            os.remove(EMBEDDINGS_INDEX_PATH)
            print(f"Fichier {EMBEDDINGS_INDEX_PATH} supprimé.")
        else:
            print(f"Fichier {EMBEDDINGS_INDEX_PATH} introuvable.")
    except Exception as e:
        print(f"Erreur lors de la suppression de {EMBEDDINGS_INDEX_PATH}: {e}")
    # Créer un nouveau dictionnaire d'embeddings vide
    try:
        embeddings_map = {}
        with open(EMBEDDINGS_FILE, 'wb') as f:
            pickle.dump(embeddings_map, f)
        print(f"Nouveau fichier {EMBEDDINGS_FILE} créé (vide).")
    except Exception as e:
        print(f"Erreur lors de la création de {EMBEDDINGS_FILE}: {e}")
    # Créer un nouvel index FAISS vide
    try:
        dimension = 512  # Dimension des embeddings ArcFace
        index = faiss.IndexFlatL2(dimension)
        faiss.write_index(index, EMBEDDINGS_INDEX_PATH)
        print(f"Nouvel index FAISS créé (vide).")
    except Exception as e:
        print(f"Erreur lors de la création de l'index FAISS: {e}")
    print("Système de reconnaissance faciale réinitialisé avec succès.")

def reset_database():
    """
    Réinitialise la base de données en supprimant toutes les données
    des tables tout en préservant la structure.
    """
    print(f"Chemin base de données: {DATABASE_FILE}")
    print("Réinitialisation de la base de données...")
    # Vérifier si la base de données existe
    if not os.path.exists(DATABASE_FILE):
        print(f"Base de données {DATABASE_FILE} non trouvée.")
        return
    # Connexion à la base de données
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        try:
            # Démarrer une transaction
            cursor.execute("BEGIN TRANSACTION")
            # Récupérer toutes les tables utilisateur (hors tables système SQLite)
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            if not tables:
                print("Aucune table utilisateur à vider.")
            # Supprimer toutes les données de chaque table
            for (table_name,) in tables:
                print(f"Vidage de la table: {table_name}")
                cursor.execute(f"DELETE FROM {table_name}")
            # Valider les changements
            conn.commit()
            print("Toutes les tables de la base de données ont été vidées avec succès!")
        except Exception as e:
            # Annuler en cas d'erreur
            conn.rollback()
            print(f"Erreur lors de la réinitialisation de la base de données: {str(e)}")
        finally:
            # Fermer la connexion
            conn.close()
    except Exception as e:
        print(f"Erreur lors de la connexion à la base de données: {e}")

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