"""
Folder model - CRUD operations for folders against SQLite.

Migrated from backend/db.py. Uses sqlite3 directly with functions
accepting a database connection parameter.
"""

import sqlite3
import datetime
from typing import Optional


def get_connection(db_path: str) -> sqlite3.Connection:
    """
    Create a new database connection with row_factory set.

    Args:
        db_path: Path to the SQLite database file, or ":memory:" for in-memory.

    Returns:
        A sqlite3.Connection with Row factory enabled.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def create_folder(
    conn: sqlite3.Connection,
    user_id: str,
    name: str,
    parent_id: Optional[int] = None,
) -> int:
    """
    Create a new folder for a user.

    Args:
        conn: Active database connection.
        user_id: Identifier of the owning user.
        name: Folder name.
        parent_id: Optional parent folder ID for nesting.

    Returns:
        The auto-generated folder_id of the created folder.

    Raises:
        sqlite3.IntegrityError: If user_id doesn't exist or parent_id is invalid.
    """
    cursor = conn.cursor()
    now = datetime.datetime.now().isoformat()

    cursor.execute(
        "INSERT INTO folders (user_id, name, parent_id, created_at) VALUES (?, ?, ?, ?)",
        (user_id, name, parent_id, now),
    )
    conn.commit()
    return cursor.lastrowid


def get_folder_by_id(
    conn: sqlite3.Connection,
    folder_id: int,
    user_id: str,
) -> Optional[dict]:
    """
    Retrieve a specific folder owned by a user.

    Args:
        conn: Active database connection.
        folder_id: The folder's ID.
        user_id: The owning user's ID (for access verification).

    Returns:
        A dict with folder data, or None if not found.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM folders WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def get_folders_by_user(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    """
    Retrieve all folders belonging to a user, ordered by name.

    Args:
        conn: Active database connection.
        user_id: The owning user's ID.

    Returns:
        A list of dicts, each representing a folder.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM folders WHERE user_id = ? ORDER BY name",
        (user_id,),
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_notes_in_folder(
    conn: sqlite3.Connection,
    folder_id: int,
    user_id: str,
) -> list[dict]:
    """
    Retrieve all notes within a specific folder for a user.

    Args:
        conn: Active database connection.
        folder_id: The folder's ID.
        user_id: The owning user's ID (for access verification).

    Returns:
        A list of dicts representing notes, ordered by updated_at descending.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY updated_at DESC",
        (folder_id, user_id),
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def update_folder(
    conn: sqlite3.Connection,
    folder_id: int,
    user_id: str,
    name: str,
    parent_id: Optional[int] = None,
) -> bool:
    """
    Update an existing folder's name and/or parent.

    Args:
        conn: Active database connection.
        folder_id: The folder's ID.
        user_id: The owning user's ID (for access verification).
        name: New folder name.
        parent_id: New parent folder ID, or None for root-level.

    Returns:
        True if the folder was updated, False if not found or not owned by user.
    """
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE folders SET name = ?, parent_id = ? WHERE folder_id = ? AND user_id = ?",
        (name, parent_id, folder_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def delete_folder(
    conn: sqlite3.Connection,
    folder_id: int,
    user_id: str,
) -> bool:
    """
    Delete a folder and all notes it contains.

    Args:
        conn: Active database connection.
        folder_id: The folder's ID.
        user_id: The owning user's ID (for access verification).

    Returns:
        True if the folder was deleted, False if not found or not owned by user.
    """
    cursor = conn.cursor()

    # Delete all notes in the folder first
    cursor.execute(
        "DELETE FROM notes WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )

    # Delete the folder itself
    cursor.execute(
        "DELETE FROM folders WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )

    success = cursor.rowcount > 0
    conn.commit()
    return success
