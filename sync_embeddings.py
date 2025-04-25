import os
import faiss
import pickle
import numpy as np

# Configuration
EMBEDDINGS_FILE = 'embeddings.pkl'
EMBEDDINGS_INDEX_PATH = 'embeddings.index'

def synchronize_faiss_index():
    """
    Synchronise l'index FAISS avec le dictionnaire d'embeddings existant
    sans supprimer les données existantes.
    """
    # Charger le dictionnaire d'embeddings
    if not os.path.exists(EMBEDDINGS_FILE):
        print(f"Erreur: Le fichier {EMBEDDINGS_FILE} n'existe pas.")
        return False
    
    with open(EMBEDDINGS_FILE, 'rb') as f:
        embeddings_map = pickle.load(f)
    
    if not embeddings_map:
        print("Avertissement: Le dictionnaire d'embeddings est vide.")
    
    # Créer un nouvel index FAISS
    dimension = 128  # Dimension des embeddings Facenet
    new_index = faiss.IndexFlatL2(dimension)
    
    # Ajouter les embeddings existants au nouvel index
    if embeddings_map:
        embeddings_array = np.array(list(embeddings_map.values())).astype('float32')
        new_index.add(embeddings_array)
    
    # Sauvegarder le nouvel index
    faiss.write_index(new_index, EMBEDDINGS_INDEX_PATH)
    
    print(f"Index FAISS synchronisé avec succès.")
    print(f"Nombre d'embeddings dans le dictionnaire: {len(embeddings_map)}")
    print(f"Nombre d'embeddings dans l'index FAISS: {new_index.ntotal}")
    
    return True

if __name__ == "__main__":
    synchronize_faiss_index()