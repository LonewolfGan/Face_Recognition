import sqlite3
import os
import uuid
import datetime
import bcrypt
from flask import g     # g sert à stocker des données pendant le cycle requête/réponse
from config import DATABASE_PATH

def get_db():
    """
    Obtient une connexion à la base de données.
    Réutilise la connexion si elle existe déjà dans le contexte de l'application.
    
    Returns:
        sqlite3.Connection: Connexion à la base de données
    """
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE_PATH)
        db.row_factory = sqlite3.Row  # Pour accéder aux colonnes par nom
    return db

def close_db(e=None):
    """
    Ferme la connexion à la base de données si elle existe.
    À utiliser comme fonction de nettoyage dans Flask.
    """
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """
    Initialise la base de données en créant les tables nécessaires
    si elles n'existent pas déjà.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Création de la table users
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        face_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Création de la table folders
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS folders (
        folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id),
        FOREIGN KEY (parent_id) REFERENCES folders (folder_id)
    )
    ''')
    
    # Création de la table notes
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notes (
        note_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id INTEGER REFERENCES folders(folder_id),
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    ''')
    
    # Création de la table settings pour le mot de passe alternatif
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    ''')
    
    # Ajouter la colonne folder_id à la table notes si elle n'existe pas
    try:
        cursor.execute('ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(folder_id)')
    except sqlite3.OperationalError:
        # La colonne existe déjà, on ignore l'erreur
        pass
    
    conn.commit()
    print("Base de données initialisée avec succès.")

# Fonctions pour la gestion des utilisateurs
def add_user(name, face_id):
    """
    Ajoute un nouvel utilisateur à la base de données.
    
    Args:
        name (str): Nom de l'utilisateur
        face_id (str): Identifiant unique du visage
        
    Returns:
        str: user_id de l'utilisateur créé
    """
    conn = get_db()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO users (user_id, name, face_id) VALUES (?, ?, ?)",
        (user_id, name, face_id)
    )
    
    conn.commit()    
    return user_id

def get_user_by_face_id(face_id):
    """
    Récupère un utilisateur par son face_id.
    
    Args:
        face_id (str): Identifiant unique du visage
        
    Returns:
        dict: Données de l'utilisateur ou None si non trouvé
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE face_id = ?", (face_id,))
    user = cursor.fetchone()
    
    
    if user:
        return dict(user)
    return None

# Fonctions pour la gestion des notes
def create_note(user_id, title, content='', folder_id=None):
    """Crée une nouvelle note pour un utilisateur."""
    db = get_db()
    cursor = db.cursor()
    note_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO notes (note_id, user_id, title, content, folder_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (note_id, user_id, title, content, folder_id, now, now))
    db.commit()
    return note_id

def get_notes_by_user(user_id, folder_id=None):
    """Récupère toutes les notes d'un utilisateur."""
    db = get_db()
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    if folder_id is not None:
        cursor.execute('''
            SELECT n.*, f.name as folder_name
            FROM notes n
            LEFT JOIN folders f ON n.folder_id = f.folder_id
            WHERE n.user_id = ? AND n.folder_id = ?
            ORDER BY n.updated_at DESC
        ''', (user_id, folder_id))
    else:
        cursor.execute('''
            SELECT n.*, f.name as folder_name
            FROM notes n
            LEFT JOIN folders f ON n.folder_id = f.folder_id
            WHERE n.user_id = ?
            ORDER BY n.updated_at DESC
        ''', (user_id,))
    
    notes = cursor.fetchall()
    return [dict(note) for note in notes]

def get_note(note_id, user_id):
    """
    Récupère une note spécifique d'un utilisateur.
    
    Args:
        note_id (str): Identifiant de la note
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        
    Returns:
        dict: Données de la note ou None si non trouvée
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM notes WHERE note_id = ? AND user_id = ?", (note_id, user_id))
    note = cursor.fetchone()
    
    
    if note:
        return dict(note)
    return None

def update_note(note_id, user_id, title, content='', folder_id=None):
    """Met à jour une note existante."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE notes
        SET title = ?, content = ?, folder_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE note_id = ? AND user_id = ?
    ''', (title, content, folder_id, note_id, user_id))
    db.commit()
    return cursor.rowcount > 0

def delete_note(note_id, user_id):
    """
    Supprime une note.
    
    Args:
        note_id (str): Identifiant de la note
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        
    Returns:
        bool: True si la suppression a réussi, False sinon
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM notes WHERE note_id = ? AND user_id = ?", (note_id, user_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    
    return success

# Fonctions pour la gestion des paramètres
def set_password(password):
    """
    Définit le mot de passe global pour l'application (stocké sous forme de hash).
    Ce mot de passe est utilisé comme alternative à la reconnaissance faciale.
    
    Args:
        password (str): Mot de passe en clair
        
    Returns:
        bool: True si l'opération a réussi
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Création d'un hash sécurisé du mot de passe avec bcrypt
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    cursor.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        ("password_hash", password_hash)
    )
    
    conn.commit()
    
    return True

def verify_password(password):
    """
    Vérifie si le mot de passe fourni correspond au hash stocké dans les paramètres.
    
    Args:
        password (str): Mot de passe à vérifier
        
    Returns:
        bool: True si le mot de passe est correct, False sinon
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT value FROM settings WHERE key = ?", ("password_hash",))
    result = cursor.fetchone()
    
    
    if not result:
        return False
    
    stored_hash = result[0]
    return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

# Initialisation de la base de données si le fichier n'existe pas
if not os.path.exists(DATABASE_PATH):
    init_db()


def get_first_user():
    """
    Récupère le premier utilisateur de la base de données.
    Returns:
        dict: Données du premier utilisateur ou None si aucun utilisateur n'est trouvé
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users LIMIT 1")
    user = cursor.fetchone()
    if user:
        return dict(user)
    return None

def get_user(user_id):
    """
    Récupère un utilisateur par son user_id.
    
    Args:
        user_id (str): Identifiant unique de l'utilisateur
        
    Returns:
        dict: Données de l'utilisateur ou None si non trouvé
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    
    
    if user:
        return dict(user)
    return None

# Fonctions pour la gestion des dossiers
def create_folder(user_id, name, parent_id=None):
    """
    Crée un nouveau dossier pour un utilisateur.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        name (str): Nom du dossier
        parent_id (str, optional): Identifiant du dossier parent
        
    Returns:
        int: folder_id du dossier créé
    """
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    
    cursor.execute(
        "INSERT INTO folders (user_id, name, parent_id, created_at) VALUES (?, ?, ?, ?)",
        (user_id, name, parent_id, now)
    )
    
    folder_id = cursor.lastrowid
    conn.commit()
    return folder_id

def get_folders_by_user(user_id):
    """
    Récupère tous les dossiers d'un utilisateur.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        list: Liste des dossiers de l'utilisateur
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM folders WHERE user_id = ? ORDER BY name", (user_id,))
    folders = cursor.fetchall()
    
    return [dict(folder) for folder in folders]

def get_folder(folder_id, user_id):
    """
    Récupère un dossier spécifique d'un utilisateur.
    
    Args:
        folder_id (str): Identifiant du dossier
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        
    Returns:
        dict: Données du dossier ou None si non trouvé
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM folders WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))
    folder = cursor.fetchone()
    
    if folder:
        return dict(folder)
    return None

def update_folder(folder_id, user_id, name, parent_id=None):
    """
    Met à jour un dossier existant.
    
    Args:
        folder_id (str): Identifiant du dossier
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        name (str): Nouveau nom
        parent_id (str, optional): Nouveau dossier parent
        
    Returns:
        bool: True si la mise à jour a réussi, False sinon
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE folders SET name = ?, parent_id = ? WHERE folder_id = ? AND user_id = ?",
        (name, parent_id, folder_id, user_id)
    )
    
    success = cursor.rowcount > 0
    conn.commit()
    
    return success

def delete_folder(folder_id, user_id):
    """
    Supprime un dossier et toutes les notes qu'il contient.
    Args:
        folder_id (str): Identifiant du dossier
        user_id (str): Identifiant de l'utilisateur (pour vérification)
    Returns:
        bool: True si la suppression a réussi, False sinon
    """
    conn = get_db()
    cursor = conn.cursor()

    # Supprimer toutes les notes du dossier
    cursor.execute("DELETE FROM notes WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))

    # Supprimer le dossier
    cursor.execute("DELETE FROM folders WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))

    success = cursor.rowcount > 0
    conn.commit()

    return success

def get_notes_by_folder(folder_id, user_id):
    """
    Récupère toutes les notes d'un dossier spécifique.
    
    Args:
        folder_id (str): Identifiant du dossier
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        
    Returns:
        list: Liste des notes du dossier
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY updated_at DESC",
        (folder_id, user_id)
    )
    notes = cursor.fetchall()
    
    return [dict(note) for note in notes]