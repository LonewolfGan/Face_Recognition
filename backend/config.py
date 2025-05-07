# Configuration centralisée pour les services backend
import os
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env s'il existe
load_dotenv()

# Configuration des serveurs
HOST = os.getenv('BACKEND_HOST', '0.0.0.0')
ADD_SERVICE_PORT = int(os.getenv('ADD_SERVICE_PORT', 5001))
RECOGNIZE_SERVICE_PORT = int(os.getenv('RECOGNIZE_SERVICE_PORT', 5002))
API_SERVICE_PORT = int(os.getenv('API_SERVICE_PORT', 5000))

# Configuration des chemins de fichiers
DATABASE_PATH = os.getenv('DATABASE_PATH', 'users.db')
EMBEDDINGS_FILE = os.getenv('EMBEDDINGS_FILE', 'embeddings.pkl')
EMBEDDINGS_INDEX_PATH = os.getenv('EMBEDDINGS_INDEX_PATH', 'embeddings.index')

# Configuration de la reconnaissance faciale
MODEL_NAME = os.getenv('MODEL_NAME', 'ArcFace')
DETECTOR_BACKEND = os.getenv('DETECTOR_BACKEND', 'ssd')

# Configuration de sécurité
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
DEBUG_MODE = os.getenv('DEBUG_MODE', 'False').lower() in ('true', '1', 't')

# Suppression des avertissements TensorFlow
TF_CPP_MIN_LOG_LEVEL = os.getenv('TF_CPP_MIN_LOG_LEVEL', '3')
TF_ENABLE_ONEDNN_OPTS = os.getenv('TF_ENABLE_ONEDNN_OPTS', '0')

# Configuration des logs
LOG_LEVEL = os.getenv('LOG_LEVEL', 'ERROR')