# Set environment variables before importing TensorFlow
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress all TensorFlow logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom operations

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import requests
import warnings
import tensorflow as tf
import os
from db import close_db, get_user_by_face_id, add_user, get_notes_by_user, create_note, update_note, delete_note, get_note, set_password, verify_password
import logging

# Suppress TensorFlow warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
tf.get_logger().setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app)
# Configure CORS with more permissive settings
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "expose_headers": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})


# Configuration
ADD_FACE_SERVICE_URL = 'http://localhost:5001/add_face'
RECOGNIZE_SERVICE_URL = 'http://localhost:5002/recognize'

# Register database close function with Flask
@app.teardown_appcontext
def close_connection(exception):
    close_db()

@app.route('/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        if not data or 'name' not in data or 'images' not in data:
            return jsonify({'status': 'error', 'message': 'Nom et images requis'}), 400

        if 'password' in data:
            set_password(data['password'])
        
        # Envoyer les images au service d'ajout de visage
        add_face_response = requests.post(ADD_FACE_SERVICE_URL, json={'name': data['name'], 'images': data['images']})
        add_face_data = add_face_response.json()
        print("Add face response:", add_face_data) 
        
        if add_face_response.status_code != 200 or add_face_data.get('status') != 'success':
            return jsonify({'status': 'error', 'message': 'Échec de l\'enregistrement du visage'}), 400
        
        # Récupérer l'ID du visage et créer l'utilisateur dans la base de données
        face_id = add_face_data['face_id']
        user_id = add_user(data['name'], face_id)
        
        return jsonify({
            'status': 'success',
            'message': f"Utilisateur {data['name']} enregistré avec succès",
            'user_id': user_id,
            'face_id': face_id
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/login', methods=['POST'])
def login_user():
    try:
        data = request.json
        # Vérifier si c'est une connexion par mot de passe
        if 'password' in data:
            if verify_password(data['password']):
                # Récupérer le seul utilisateur existant dans la base
                from db import get_first_user
                user = get_first_user()
                if user:
                    return jsonify({
                        'status': 'success',
                        'message': 'Connexion réussie par mot de passe',
                        'user': user
                    })
                else:
                    return jsonify({'status': 'error', 'message': 'Aucun utilisateur trouvé'}), 404
            else:
                return jsonify({'status': 'error', 'message': 'Mot de passe incorrect'}), 401
        
        # Sinon, c'est une connexion par reconnaissance faciale
        if 'image' not in data:
            return jsonify({'status': 'error', 'message': 'Image requise'}), 400
        
        # Envoyer l'image au service de reconnaissance
        recognize_response = requests.post(RECOGNIZE_SERVICE_URL, json={'image': data['image']})
        recognize_data = recognize_response.json()
        
        if recognize_response.status_code != 200 or recognize_data.get('status') != 'success':
            return jsonify({
                'status': 'face_failed',
                'message': 'Visage non reconnu. Voulez-vous essayer avec un mot de passe ?'
            }), 401
        
        # Récupérer l'utilisateur à partir de l'ID du visage
        face_id = recognize_data['face_id']
        user = get_user_by_face_id(face_id)
        
        if not user:
            return jsonify({'status': 'error', 'message': 'Utilisateur non trouvé'}), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Connexion réussie',
            'user': user
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/notes', methods=['GET'])
def get_notes():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'status': 'error', 'message': 'ID utilisateur requis'}), 400
        
        notes = get_notes_by_user(user_id)
        return jsonify({
            'status': 'success',
            'notes': notes
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/notes', methods=['POST'])
def add_note():
    try:
        data = request.json
        if not data or 'user_id' not in data or 'title' not in data:
            return jsonify({'status': 'error', 'message': 'Données incomplètes'}), 400
        
        note_id = create_note(data['user_id'], data['title'], data.get('content', ''))
        return jsonify({
            'status': 'success',
            'message': 'Note créée avec succès',
            'note_id': note_id
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/notes/<note_id>', methods=['PUT'])
def update_note_route(note_id):
    try:
        data = request.json
        if not data or 'user_id' not in data or 'title' not in data:
            return jsonify({'status': 'error', 'message': 'Données incomplètes'}), 400
        
        success = update_note(note_id, data['user_id'], data['title'], data.get('content', ''))
        if not success:
            return jsonify({'status': 'error', 'message': 'Note non trouvée ou non autorisée'}), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Note mise à jour avec succès'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/notes/<note_id>', methods=['DELETE'])
def delete_note_route(note_id):
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'status': 'error', 'message': 'ID utilisateur requis'}), 400
        
        success = delete_note(note_id, user_id)
        if not success:
            return jsonify({'status': 'error', 'message': 'Note non trouvée ou non autorisée'}), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Note supprimée avec succès'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)