"""
User model — CRUD operations against the database.

All functions accept a UnifiedConnection from backend/app/db.py.
SQL uses ? placeholders which are auto-translated to %s for PostgreSQL.
"""

import uuid
from typing import Optional

from ..db import UnifiedConnection


def create_user(
    db: UnifiedConnection,
    name: str,
    face_id: str,
    password_hash: Optional[str] = None,
) -> str:
    """Create a new user in the database.

    Returns:
        The generated user_id (UUID string).

    Raises:
        ValueError: If name or face_id is empty.
    """
    if not name or not name.strip():
        raise ValueError("name must not be empty")
    if not face_id or not face_id.strip():
        raise ValueError("face_id must not be empty")

    user_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO users (user_id, name, face_id, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, name.strip(), face_id.strip(), password_hash),
    )
    db.commit()
    return user_id


def get_user_by_id(db: UnifiedConnection, user_id: str) -> Optional[dict]:
    """Retrieve a user by their user_id."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    return cursor.fetchone()


def get_user_by_face_id(db: UnifiedConnection, face_id: str) -> Optional[dict]:
    """Retrieve a user by their face_id."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE face_id = ?", (face_id,))
    return cursor.fetchone()


def get_user_by_name(db: UnifiedConnection, name: str) -> Optional[dict]:
    """Retrieve the first user matching the given name."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
    return cursor.fetchone()


def update_user(
    db: UnifiedConnection,
    user_id: str,
    name: Optional[str] = None,
    face_id: Optional[str] = None,
    password_hash: Optional[str] = None,
) -> bool:
    """Update an existing user's fields. Only non-None arguments are applied.

    Returns:
        True if a row was updated, False if the user was not found.
    """
    fields = []
    values = []

    if name is not None:
        if not name.strip():
            raise ValueError("name must not be empty")
        fields.append("name = ?")
        values.append(name.strip())

    if face_id is not None:
        if not face_id.strip():
            raise ValueError("face_id must not be empty")
        fields.append("face_id = ?")
        values.append(face_id.strip())

    if password_hash is not None:
        fields.append("password_hash = ?")
        values.append(password_hash)

    if not fields:
        return False

    values.append(user_id)
    cursor = db.cursor()
    cursor.execute(
        f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?",
        values,
    )
    db.commit()
    return cursor.rowcount > 0


def delete_user(db: UnifiedConnection, user_id: str) -> bool:
    """Delete a user by their user_id.

    Returns:
        True if a row was deleted, False if the user was not found.
    """
    cursor = db.cursor()
    cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
    db.commit()
    return cursor.rowcount > 0
