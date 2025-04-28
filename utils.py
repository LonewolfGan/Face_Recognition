import cv2
import numpy as np
import base64
import faiss
import pickle
import os

def process_embedding(emb, fid, embedding_to_index, faiss_index):
    try:
        embedding_array = np.array(emb).astype('float32')
        if embedding_array.shape == (512,):
            embedding_array = embedding_array.reshape(1, 512)
        
        # Vérifier les dimensions
        if len(embedding_array.shape) != 2 or embedding_array.shape[1] != 512:
            print(f"AVERTISSEMENT: Format incorrect: {embedding_array.shape}")
            return False
        
        embedding_to_index.append(fid)
        faiss_index.add(embedding_array)
        return True
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return False      

""" def is_image_noisy_or_blurry(image, threshold=100):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold """

def preprocess_base64_image(base64_str, target_size=(112, 112)):
    """
    Prétraite une image base64 pour ArcFace.
    Améliorations : CLAHE, flou gaussien si bruit, accentuation des contours.
    """
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
            image_bytes = base64.b64decode(base64_str)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)

        """ # Corriger l’éclairage avec CLAHE
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        equalized = clahe.apply(gray)
        image = cv2.cvtColor(equalized, cv2.COLOR_GRAY2BGR) """

        """  # Si image floue, appliquer un flou gaussien doux
        if is_image_noisy_or_blurry(image, threshold=100):
            print("Image bruitée/floue → flou gaussien appliqué")
            image = cv2.GaussianBlur(image, (3, 3), 0) """

        """ # Accentuation des contours
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        image = cv2.filter2D(image, -1, kernel) """

        return image.astype(np.uint8)

    except Exception as e:
        print(f"Erreur lors du traitement d'une image : {e}")
        return None

def load_embeddings(embeddings_file, embeddings_index_path):
    """
    Charge les embeddings depuis un fichier et reconstruit l'index FAISS si nécessaire.
    
    Args:
        embeddings_file (str): Chemin vers le fichier des embeddings
        embeddings_index_path (str): Chemin vers le fichier d'index FAISS
    
    Returns:
        tuple: (embeddings_map, faiss_index, embedding_to_index)
            - embeddings_map (dict): Dictionnaire associant les identifiants aux embeddings
            - faiss_index (faiss.IndexFlatL2): Index FAISS pour la recherche rapide
            - embedding_to_index (list): Liste de correspondance entre index et identifiants
    """
    print(f"Chargement des embeddings depuis: {embeddings_file}")

    if not os.path.exists(embeddings_file):
        print(f"ERREUR: Fichier d'embeddings non trouvé: {embeddings_file}")
        return {}, faiss.IndexFlatL2(512), []

    # Charger les embeddings depuis le fichier
    with open(embeddings_file, 'rb') as f:
        embeddings_map = pickle.load(f)
    
    # Initialiser l'index FAISS
    faiss_index = faiss.IndexFlatL2(512)
    if os.path.exists(embeddings_index_path):
        faiss_index = faiss.read_index(embeddings_index_path)
    
    # Reconstruire embedding_to_index à partir de embeddings_map
    embedding_to_index = []
    
    # First just build the mapping without adding to index
    for fid, embeddings in embeddings_map.items():
        if isinstance(embeddings, list):
            embedding_to_index.extend([fid] * len(embeddings))
        else:
            embedding_to_index.append(fid)
    
    # Reconstruire l'index si nécessaire
    if faiss_index.ntotal != len(embedding_to_index):
        print(f"AVERTISSEMENT: Désynchronisation détectée au chargement! Index: {faiss_index.ntotal}, Map: {len(embedding_to_index)}")
        print("Reconstruction de l'index...")
        
        # Réinitialiser l'index et la correspondance
        faiss_index = faiss.IndexFlatL2(512)
        embedding_to_index = []
        
        # Traiter tous les embeddings
        for fid, embeddings in embeddings_map.items():
            if isinstance(embeddings, list):
                for emb in embeddings:
                    process_embedding(emb, fid, embedding_to_index, faiss_index)
            else:
                process_embedding(embeddings, fid, embedding_to_index, faiss_index)
        
        faiss.write_index(faiss_index, embeddings_index_path)
        print(f"Index reconstruit avec {faiss_index.ntotal} embeddings")
    
    return embeddings_map, faiss_index, embedding_to_index


def preprocess_batch(images_base64_list, target_size=(112, 112)):
    """
    Prétraite une liste d'images base64 avec amélioration complète.
    
    Args:
        images_base64_list (list): Liste de chaînes base64 représentant des images
        target_size (tuple, optional): Taille cible pour le redimensionnement. Par défaut (112, 112).
    
    Returns:
        list: Liste des images prétraitées (numpy.ndarray)
    """
    processed_images = []
    for b64 in images_base64_list:
        img = preprocess_base64_image(b64, target_size)
        if img is not None:
            processed_images.append(img)
    return processed_images
