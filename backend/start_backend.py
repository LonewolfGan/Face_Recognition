import os
import subprocess
import sys
import time
import logging
from config import HOST, ADD_SERVICE_PORT, RECOGNIZE_SERVICE_PORT, API_SERVICE_PORT, LOG_LEVEL, DEBUG_MODE

# Configuration du logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('backend_starter')

def start_services():
    """Démarre tous les services backend en parallèle"""
    logger.info("Démarrage des services de reconnaissance faciale...")
    
    # Chemins des services
    add_service = "add_service.py"
    recognize_service = "recognize_service.py"
    api_service = "api_service.py"
    
    # Démarrer les processus
    processes = [
        subprocess.Popen([sys.executable, add_service], 
                        env=dict(os.environ, FLASK_APP=add_service, 
                                FLASK_ENV="development" if DEBUG_MODE else "production",
                                FLASK_DEBUG=str(int(DEBUG_MODE)))),
        subprocess.Popen([sys.executable, recognize_service], 
                        env=dict(os.environ, FLASK_APP=recognize_service, 
                                FLASK_ENV="development" if DEBUG_MODE else "production",
                                FLASK_DEBUG=str(int(DEBUG_MODE)))),
        subprocess.Popen([sys.executable, api_service], 
                        env=dict(os.environ, FLASK_APP=api_service, 
                                FLASK_ENV="development" if DEBUG_MODE else "production",
                                FLASK_DEBUG=str(int(DEBUG_MODE))))
    ]
    
    logger.info(f"Service d'ajout démarré sur {HOST}:{ADD_SERVICE_PORT}")
    logger.info(f"Service de reconnaissance démarré sur {HOST}:{RECOGNIZE_SERVICE_PORT}")
    logger.info(f"API principale démarrée sur {HOST}:{API_SERVICE_PORT}")
    
    print("\nTous les services ont été démarrés !")
    print("Appuyez sur Ctrl+C pour arrêter tous les services")
    
    try:
        # Maintenir le script en cours d'exécution
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # Arrêter tous les processus lors de l'interruption
        for process in processes:
            process.terminate()
        logger.info("Tous les services ont été arrêtés")
        print("\nTous les services ont été arrêtés")

if __name__ == "__main__":
    start_services()