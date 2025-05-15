import sqlite3
import os
import uuid
import datetime
import bcrypt
from flask import g     # g sert à stocker des données pendant le cycle requête/réponse

# Configuration
DATABASE_PATH = 'users.db'

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
    
    # Création de la table notes
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notes (
        note_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
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
def create_note(user_id, title, content):
    """
    Crée une nouvelle note pour un utilisateur.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        title (str): Titre de la note
        content (str): Contenu de la note
        
    Returns:
        str: note_id de la note créée
    """
    conn = get_db()
    cursor = conn.cursor()
    
    note_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    cursor.execute(
        "INSERT INTO notes (note_id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (note_id, user_id, title, content, now, now)
    )
    
    conn.commit()
    
    return note_id

def get_notes_by_user(user_id):
    """
    Récupère toutes les notes d'un utilisateur.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        list: Liste des notes de l'utilisateur
    """
    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
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

def update_note(note_id, user_id, title, content):
    """
    Met à jour une note existante.
    
    Args:
        note_id (str): Identifiant de la note
        user_id (str): Identifiant de l'utilisateur (pour vérification)
        title (str): Nouveau titre
        content (str): Nouveau contenu
        
    Returns:
        bool: True si la mise à jour a réussi, False sinon
    """
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    
    cursor.execute(
        "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE note_id = ? AND user_id = ?",
        (title, content, now, note_id, user_id)
    )
    
    success = cursor.rowcount > 0
    conn.commit()
    
    return success

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