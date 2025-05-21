# Set environment variables before importing TensorFlow
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress all TensorFlow logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom operations


from flask import Flask, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
import os
import uuid
import pickle
import faiss
from flask import request
import traceback
from utils import preprocess_batch, load_embeddings, process_embedding
# Set environment variables before importing TensorFlow
import warnings
import tensorflow as tf
import logging

# Suppress TensorFlow warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
tf.get_logger().setLevel(logging.ERROR)


app = Flask(__name__)
CORS(app)

# Configuration commune
EMBEDDINGS_FILE = 'embeddings.pkl'
EMBEDDINGS_INDEX_PATH = 'embeddings.index'
MODEL_NAME = 'ArcFace'
DETECTOR_BACKEND = 'ssd'

# Créer les fichiers d'embeddings s'ils n'existent pas
if not os.path.exists(EMBEDDINGS_FILE):
    with open(EMBEDDINGS_FILE, 'wb') as f:
        pickle.dump({}, f)
        
embeddings_map = {}
embedding_to_index = []
embeddings_map, faiss_index, embedding_to_index = load_embeddings(embeddings_file=EMBEDDINGS_FILE, embeddings_index_path=EMBEDDINGS_INDEX_PATH)

@app.route('/add_face', methods=['POST'])
def add_face():
    temp_img_path = 'temp_input.jpg'
    try:
        data = request.json
        if 'images' not in data or not isinstance(data['images'], list):
            return jsonify({'status': 'error', 'message': 'Liste d\'images requise'}), 400
        images = data['images']
        
        # Utiliser user_id comme nom ou une valeur par défaut si non fourni
        name = data.get('name', data.get('user_id', 'Unknown'))
        print(f"Nom: {name}")
        print(f"Nombre d'images reçues: {len(images)}")
        face_id = data.get('face_id', str(uuid.uuid4()))
        processed_images = preprocess_batch(images)
        if not processed_images:
            return jsonify({'status': 'error', 'message': 'Aucune image valide fournie'}), 400
        print(f"{len(processed_images)} images prétraitées avec succès")

        embeddings = []

        for i, processed_image in enumerate(processed_images):
            print(f"traitement de l'image {i+1}")
            temp_img_path = f'temp_{str(uuid.uuid4())}.jpg'
            cv2.imwrite(temp_img_path, processed_image)
            try:
                faces = DeepFace.extract_faces(img_path=temp_img_path, detector_backend=DETECTOR_BACKEND, enforce_detection=False)
                if not faces:
                    print(f"Aucun visage détecté dans l'image {i+1}")
                    continue
                embedding = DeepFace.represent(img_path=temp_img_path, model_name=MODEL_NAME,
                                            detector_backend=DETECTOR_BACKEND,
                                            enforce_detection=False,
                                            align=True)[0]['embedding']

                embeddings.append(embedding)
                os.remove(temp_img_path)
            except Exception as img_error:
                print(f"Erreur lors du traitement de l'image {i+1}: {str(img_error)}")
                continue

        if not embeddings:
            return jsonify({'status': 'error', 'message': 'Aucun visage détecté dans les images fournies'}), 400

        # Cette ligne associe tous les embeddings qui sont stockés dans la liste embeddings à un seul face_id dans le dictionnaire embeddings_map . Donc pour un client donné identifié par face_id.
        embeddings_map[face_id] = embeddings

        for emb in embeddings:
            process_embedding(emb, face_id, embedding_to_index, faiss_index)
        
        with open(EMBEDDINGS_FILE, 'wb') as f:
            pickle.dump(embeddings_map, f)
        faiss.write_index(faiss_index, EMBEDDINGS_INDEX_PATH)
        
        print(f"Visage ajouté avec succès: {face_id}")
        # Appel à la route de reload du service de reconnaissance
        try:
            import requests
            reload_url = "http://localhost:5002/reload_embeddings"
            reload_response = requests.post(reload_url)
            if reload_response.status_code == 200:
                print("Embeddings rechargés côté reconnaissance.")
            else:
                print(f"Erreur lors du rechargement des embeddings: {reload_response.text}")
        except Exception as reload_exc:
            print(f"Erreur lors de l'appel à /reload_embeddings: {str(reload_exc)}")
        return jsonify({
            'status': 'success', 
            'message': f'Visage de {name} ajouté avec succès',
            'face_id': face_id, 
            'name': name
        })

    except Exception as e:
        print(f"Erreur: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)