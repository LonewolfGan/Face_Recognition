"""Folder model — CRUD operations for folders."""

import datetime
from typing import Optional

from ..db import UnifiedConnection


def create_folder(
    db: UnifiedConnection,
    user_id: str,
    name: str,
    parent_id: Optional[int] = None,
    icon: Optional[str] = None,
) -> int:
    """Create a new folder. Returns the auto-generated folder_id."""
    now = datetime.datetime.now().isoformat()
    return db.insert_returning_id(
        "INSERT INTO folders (user_id, name, icon, parent_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, icon, parent_id, now),
        id_column="folder_id",
    )


def get_folder_by_id(
    db: UnifiedConnection,
    folder_id: int,
    user_id: str,
) -> Optional[dict]:
    """Retrieve a specific folder owned by a user."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM folders WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )
    return cursor.fetchone()


def get_folders_by_user(db: UnifiedConnection, user_id: str) -> list:
    """Retrieve all folders belonging to a user, ordered by name."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM folders WHERE user_id = ? ORDER BY name",
        (user_id,),
    )
    return cursor.fetchall()


def get_notes_in_folder(
    db: UnifiedConnection,
    folder_id: int,
    user_id: str,
) -> list:
    """Retrieve all notes within a specific folder for a user."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY updated_at DESC",
        (folder_id, user_id),
    )
    return cursor.fetchall()


def update_folder(
    db: UnifiedConnection,
    folder_id: int,
    user_id: str,
    name: str,
    parent_id: Optional[int] = None,
    icon: Optional[str] = None,
) -> bool:
    """Update an existing folder. Returns True if updated, False if not found."""
    cursor = db.cursor()
    cursor.execute(
        "UPDATE folders SET name = ?, icon = ?, parent_id = ? WHERE folder_id = ? AND user_id = ?",
        (name, icon, parent_id, folder_id, user_id),
    )
    db.commit()
    return cursor.rowcount > 0


def delete_folder(db: UnifiedConnection, folder_id: int, user_id: str) -> bool:
    """Delete a folder and all notes it contains. Returns True if deleted."""
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM notes WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )
    cursor.execute(
        "DELETE FROM folders WHERE folder_id = ? AND user_id = ?",
        (folder_id, user_id),
    )
    success = cursor.rowcount > 0
    db.commit()
    return success
