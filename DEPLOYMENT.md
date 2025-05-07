# Guide de déploiement pour my-app

## Structure du projet

L'application est composée de deux parties principales :

### Backend (Python)

- **Services** :
  - `add_service.py` : Service d'ajout de visages (port 5001)
  - `recognize_service.py` : Service de reconnaissance faciale (port 5002)
  - `api_service.py` : API principale (port 5000)

- **Base de données** :
  - SQLite (`users.db`)
  - Stockage des embeddings FAISS (`embeddings.pkl`, `embeddings.index`)

- **Utilitaires** :
  - `db.py` : Gestion de la base de données
  - `utils.py` : Fonctions utilitaires pour le traitement d'images
  - `reset_system.py` : Réinitialisation du système
  - `sync_embeddings.py` : Synchronisation des embeddings

### Frontend (React)

- Application Vite/React avec les fonctionnalités suivantes :
  - Authentification par reconnaissance faciale
  - Gestion des notes
  - Mode hors ligne avec synchronisation
  - Thème clair/sombre

## Préparation au déploiement

### 1. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet :

```
# Backend
BACKEND_HOST=0.0.0.0
ADD_SERVICE_PORT=5001
RECOGNIZE_SERVICE_PORT=5002
API_SERVICE_PORT=5000

# Frontend
VITE_API_URL=http://localhost:5000
```

### 2. Optimisation du backend

1. **Créer un script de démarrage unique** :

Créer un fichier `start_backend.py` dans le dossier `backend` :

```python
import os
import subprocess
import sys
import time

def start_services():
    """Démarre tous les services backend en parallèle"""
    print("Démarrage des services de reconnaissance faciale...")
    
    # Chemins des services
    add_service = "add_service.py"
    recognize_service = "recognize_service.py"
    api_service = "api_service.py"
    
    # Démarrer les processus
    processes = [
        subprocess.Popen([sys.executable, add_service]),
        subprocess.Popen([sys.executable, recognize_service]),
        subprocess.Popen([sys.executable, api_service])
    ]
    
    print("Tous les services ont été démarrés !")
    print("Appuyez sur Ctrl+C pour arrêter tous les services")
    
    try:
        # Maintenir le script en cours d'exécution
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # Arrêter tous les processus lors de l'interruption
        for process in processes:
            process.terminate()
        print("\nTous les services ont été arrêtés")

if __name__ == "__main__":
    start_services()
```

2. **Créer un fichier requirements.txt** :

```
flask==2.3.3
flask-cors==4.0.0
deepface==0.0.79
opencv-python==4.8.0.74
numpy==1.24.3
faiss-cpu==1.7.4
pillow==10.0.0
```

### 3. Optimisation du frontend

1. **Mettre à jour les URL d'API** :

Créer un fichier `src/config.js` :

```javascript
// Configuration des URLs d'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ADD_FACE_URL = `${API_URL.replace(':5000', ':5001')}/add_face`;
const RECOGNIZE_URL = `${API_URL.replace(':5000', ':5002')}/recognize`;

export { API_URL, ADD_FACE_URL, RECOGNIZE_URL };
```

2. **Mettre à jour le script de build** dans `package.json` :

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "start": "vite preview --port 3000"
}
```

## Déploiement

### Option 1: Déploiement local

1. **Backend** :
   - Installer les dépendances : `pip install -r requirements.txt`
   - Démarrer les services : `python backend/start_backend.py`

2. **Frontend** :
   - Installer les dépendances : `npm install`
   - Construire l'application : `npm run build`
   - Démarrer le serveur : `npm run start`

### Option 2: Déploiement sur serveur

1. **Backend** :
   - Déployer avec Gunicorn ou uWSGI derrière un proxy Nginx
   - Configurer les services comme des services systemd

2. **Frontend** :
   - Déployer les fichiers statiques sur Nginx, Apache ou un service d'hébergement statique

### Option 3: Conteneurisation avec Docker

1. **Créer un Dockerfile pour le backend** :

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY backend/ /app/
COPY requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000 5001 5002

CMD ["python", "start_backend.py"]
```

2. **Créer un Dockerfile pour le frontend** :

```dockerfile
# Étape de build
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Étape de production
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

3. **Créer un fichier docker-compose.yml** :

```yaml
version: '3'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
      - "5001:5001"
      - "5002:5002"
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

## Considérations de sécurité

1. **Protection des données** :
   - Sécuriser la base de données SQLite
   - Protéger les fichiers d'embeddings

2. **HTTPS** :
   - Configurer SSL/TLS pour toutes les communications

3. **Authentification** :
   - Renforcer la sécurité de l'authentification par reconnaissance faciale
   - Implémenter des mécanismes anti-spoofing

## Maintenance

1. **Sauvegarde** :
   - Sauvegarder régulièrement la base de données et les embeddings

2. **Mise à jour** :
   - Mettre à jour les dépendances régulièrement
   - Tester les mises à jour dans un environnement de staging

3. **Monitoring** :
   - Mettre en place un système de monitoring pour surveiller les performances
   - Configurer des alertes en cas de problème