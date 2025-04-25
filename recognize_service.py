from flask import Flask, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
import os
import pickle
from flask import request
import traceback
import sys
from utils import preprocess_base64_image, load_embeddings
import time


app = Flask(__name__)
CORS(app)

# Configuration commune
BASE_DIR = os.getcwd()  # Use current working directory
EMBEDDINGS_FILE = os.path.join(BASE_DIR, 'embeddings.pkl')
EMBEDDINGS_INDEX_PATH = os.path.join(BASE_DIR, 'embeddings.index')
MODEL_NAME = 'ArcFace'
DETECTOR_BACKEND = 'ssd'

# Créer les fichiers d'embeddings s'ils n'existent pas
if not os.path.exists(EMBEDDINGS_FILE):
    with open(EMBEDDINGS_FILE, 'wb') as f:
        pickle.dump({}, f)
        
embeddings_map = {}
embedding_to_index = []
embeddings_map, faiss_index, embedding_to_index = load_embeddings(embeddings_file=EMBEDDINGS_FILE, embeddings_index_path=EMBEDDINGS_INDEX_PATH)
print(f"Chargement terminé: {len(embeddings_map)} visages, {faiss_index.ntotal} embeddings")

@app.route('/recognize', methods=['POST'])
def recognize_face():
    temp_path = 'temp_recog.jpg'
    print('image reçue')
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({'status': 'error', 'message': 'Image requise'}), 400
        preprocess_start = time.time()
        image_data = data['image']
        processed_image = preprocess_base64_image(image_data)
        cv2.imwrite(temp_path, processed_image)
        print(f"Prétraitement: {time.time() - preprocess_start:.2f}s")

        # Vérifier si des visages sont enregistrés
        if faiss_index.ntotal == 0 or not embeddings_map:
            print("Aucun visage enregistré dans la base de données.")
            return jsonify({'status': 'error', 'message': 'Aucun visage enregistré dans la base de données'}), 404

        represent_start = time.time()
        representation = DeepFace.represent(img_path=temp_path, model_name=MODEL_NAME, detector_backend=DETECTOR_BACKEND, enforce_detection=False,
        align=True)
        print(f"Extraction des caractéristiques: {time.time() - represent_start:.2f}s")
        if not representation or len(representation) == 0:
            print("Aucun visage détecté dans l'image.")
            return jsonify({'status': 'error', 'message': 'Aucun visage détecté dans l\'image'}), 400

        search_start = time.time()
        captured_embedding = representation[0]['embedding']
        captured_embedding_array = np.array([captured_embedding]).astype('float32')
        k = faiss_index.ntotal
        distances, indices = faiss_index.search(captured_embedding_array, k=k)
        best_scores = {}
        for i in range(len(indices[0])):
            index = indices[0][i]
            distance = distances[0][i]
            if index >= len(embedding_to_index):
                continue
            face_id = embedding_to_index[index]
            if face_id not in best_scores or distance < best_scores[face_id]:
                best_scores[face_id] = distance
        print(f"Recherche: {time.time() - search_start:.2f}s")
        if not best_scores:
            print('Aucune correspondance trouvée')
            return jsonify({'status': 'error', 'message': 'Aucune correspondance trouvée'}), 404

        best_face_id = min(best_scores, key=best_scores.get)
        best_distance = best_scores[best_face_id]
        # Calculate total time from the start of preprocessing
        print(f"Temps total: {time.time() - preprocess_start:.2f}s")
        if best_distance < 8.6:
            print(f'Visage reconnu avec ID: {best_face_id}, distance: {best_distance}')
            return jsonify({
                'status': 'success', 
                'message': f'Visage reconnu avec ID: {best_face_id}', 
                'face_id': best_face_id, 
                'distance': float(best_distance)
            })
        else:
            print(f'Visage non reconnu, meilleure distance: {best_distance}')
            return jsonify({
                'status': 'error', 
                'message': 'Visage non reconnu ou non autorisé', 
                'distance': float(best_distance)
            }), 401  # Using 401 Unauthorized status code

    except Exception as e:
        print(f"Erreur: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False)