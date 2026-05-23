"""
User model — CRUD operations against SQLite.

All functions accept either a sqlite3.Connection or a database file path.
When a path is provided, a new connection is created and closed after the operation.
When a connection is provided, it is used directly and left open (caller manages lifecycle).
"""

import sqlite3
import uuid
from typing import Optional, Union


def _get_connection(db: Union[str, sqlite3.Connection]) -> tuple[sqlite3.Connection, bool]:
    """
    Resolve a database reference to a connection.

    Args:
        db: Either a file path (str) or an existing sqlite3.Connection.

    Returns:
        A tuple of (connection, should_close) where should_close indicates
        whether the caller should close the connection when done.
    """
    if isinstance(db, sqlite3.Connection):
        return db, False
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    return conn, True


def create_user(
    db: Union[str, sqlite3.Connection],
    name: str,
    face_id: str,
    password_hash: Optional[str] = None,
) -> str:
    """
    Create a new user in the database.

    Args:
        db: Database path or connection.
        name: Display name for the user.
        face_id: Unique face identifier.
        password_hash: Optional bcrypt hash of the user's password.

    Returns:
        The generated user_id (UUID string).

    Raises:
        sqlite3.IntegrityError: If face_id already exists.
        ValueError: If name or face_id is empty.
    """
    if not name or not name.strip():
        raise ValueError("name must not be empty")
    if not face_id or not face_id.strip():
        raise ValueError("face_id must not be empty")

    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, name, face_id, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, name.strip(), face_id.strip(), password_hash),
        )
        conn.commit()
        return user_id
    finally:
        if should_close:
            conn.close()


def get_user_by_id(
    db: Union[str, sqlite3.Connection],
    user_id: str,
) -> Optional[dict]:
    """
    Retrieve a user by their user_id.

    Args:
        db: Database path or connection.
        user_id: The UUID of the user.

    Returns:
        A dict with user data, or None if not found.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        if should_close:
            conn.close()


def get_user_by_face_id(
    db: Union[str, sqlite3.Connection],
    face_id: str,
) -> Optional[dict]:
    """
    Retrieve a user by their face_id.

    Args:
        db: Database path or connection.
        face_id: The unique face identifier.

    Returns:
        A dict with user data, or None if not found.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE face_id = ?", (face_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        if should_close:
            conn.close()


def get_user_by_name(
    db: Union[str, sqlite3.Connection],
    name: str,
) -> Optional[dict]:
    """
    Retrieve the first user matching the given name.

    Args:
        db: Database path or connection.
        name: The display name to search for.

    Returns:
        A dict with user data, or None if not found.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        if should_close:
            conn.close()


def update_user(
    db: Union[str, sqlite3.Connection],
    user_id: str,
    name: Optional[str] = None,
    face_id: Optional[str] = None,
    password_hash: Optional[str] = None,
) -> bool:
    """
    Update an existing user's fields. Only non-None arguments are applied.

    Args:
        db: Database path or connection.
        user_id: The UUID of the user to update.
        name: New display name (if provided).
        face_id: New face identifier (if provided).
        password_hash: New password hash (if provided).

    Returns:
        True if a row was updated, False if the user was not found.

    Raises:
        sqlite3.IntegrityError: If the new face_id conflicts with another user.
        ValueError: If name or face_id is provided but empty.
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

    conn, should_close = _get_connection(db)
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?",
            values,
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        if should_close:
            conn.close()


def delete_user(
    db: Union[str, sqlite3.Connection],
    user_id: str,
) -> bool:
    """
    Delete a user by their user_id.

    Args:
        db: Database path or connection.
        user_id: The UUID of the user to delete.

    Returns:
        True if a row was deleted, False if the user was not found.
    """
    conn, should_close = _get_connection(db)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        if should_close:
            conn.close()
