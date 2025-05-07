# My-App - Application de Reconnaissance Faciale

Une application complète avec reconnaissance faciale, authentification et gestion de notes, utilisant React pour le frontend et Python/Flask pour le backend.

## Fonctionnalités

- Authentification par reconnaissance faciale
- Authentification alternative par mot de passe
- Gestion de notes avec éditeur de texte riche
- Thème clair/sombre
- Interface responsive

## Structure du projet

- **Frontend**: React avec Vite
- **Backend**: Services Flask pour la reconnaissance faciale et l'API
- **Base de données**: SQLite avec FAISS pour les embeddings de visages

## Prérequis

### Système
- **Node.js 18+** ([Téléchargement](https://nodejs.org/))
- **Python 3.9+** ([Téléchargement](https://www.python.org/downloads/))
- **Webcam fonctionnelle**
- **Outils de compilation** (pour les dépendances Python) :
  ```bash
  # Windows
  winget install -e --id Kitware.CMake
  winget install -e --id LLVM.LLVM
  
  # Linux (Debian/Ubuntu)
  sudo apt-get install build-essential cmake
  ```

### Environnement virtuel Python
```bash
# Création de l'environnement
python -m venv face_env
```

## Installation

### Dépendances Backend
1. Activer l'environnement virtuel :
```bash
# Windows
.\face_env\Scripts\activate

# Linux/Mac
source face_env/bin/activate
```
2. Installer les dépendances :
```bash
cd backend
pip install -r requirements.txt
```

### Dépendances Frontend
```bash
npm install
```

```bash
# Naviguer vers le dossier backend
cd backend

# Installer les dépendances

> **Important : Avant d'installer les dépendances, activez votre environnement virtuel Python avec** :
> 
> Windows :
> ```bash
> .\\face_env\\Scripts\\activate
> ```
> Linux/Mac :
> ```bash
> source face_env/bin/activate
> ```

pip install -r requirements.txt

# Démarrer les services
python start_backend.py
```

### Frontend

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

# Lancement de l'application

Pour démarrer rapidement l'application, suivez ces étapes dans l'ordre :

## 1. Prérequis système
- **Node.js 18+** ([Téléchargement](https://nodejs.org/))
- **Python 3.9+** ([Téléchargement](https://www.python.org/downloads/))
- **Webcam fonctionnelle**

## 2. Création et activation de l'environnement virtuel Python
Dans le dossier racine du projet :
```bash
python -m venv face_env
```
- **Windows** :
  ```bash
  .\face_env\Scripts\activate
  ```
- **Linux/Mac** :
  ```bash
  source face_env/bin/activate
  ```

## 3. Installation des dépendances Backend
```bash
cd backend
pip install -r requirements.txt
```

## 4. Installation des dépendances Frontend
Dans le dossier racine du projet :
```bash
npm install
```

## 5. Lancement global de l'application
Utilisez le script fourni pour démarrer à la fois le backend et le frontend :
```bash
start_app.bat
```

## 6. Accès à l'application
Ouvrez votre navigateur à l'adresse suivante :
[http://localhost:5173](http://localhost:5173)

---

Pour plus de détails ou d'autres méthodes de déploiement (Docker, serveur), consultez la section "Déploiement" ci-dessous.

## Déploiement

Plusieurs options de déploiement sont disponibles :

1. **Déploiement local** : Suivre les instructions d'installation ci-dessus
2. **Déploiement avec Docker** : Utiliser `docker-compose up` pour déployer l'ensemble de l'application
3. **Déploiement sur serveur** : Consulter le fichier `DEPLOYMENT.md` pour des instructions détaillées

## Configuration

Les variables d'environnement peuvent être configurées dans le fichier `.env` à la racine du projet.

## Développement

### Scripts disponibles

- `npm run dev` : Démarrer le serveur de développement
- `npm run build` : Construire l'application pour la production
- `npm run preview` : Prévisualiser la version de production

### Réinitialisation du système

Pour réinitialiser complètement le système (base de données et embeddings) :

```bash
python backend/reset_system.py
```

## Licence

Ce projet est sous licence MIT.
