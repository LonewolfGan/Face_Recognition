"""Note model — CRUD operations for notes."""

import uuid
import datetime
from typing import Optional

from ..db import UnifiedConnection


def create_note(
    db: UnifiedConnection,
    user_id: str,
    title: str,
    content: str = "",
    folder_id: Optional[int] = None,
) -> str:
    """Create a new note for a user. Returns the generated note_id."""
    note_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO notes (note_id, user_id, title, content, folder_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (note_id, user_id, title, content, folder_id, now, now),
    )
    db.commit()
    return note_id


def get_note_by_id(
    db: UnifiedConnection,
    note_id: str,
    user_id: str,
) -> Optional[dict]:
    """Retrieve a specific note by its ID, scoped to a user."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM notes WHERE note_id = ? AND user_id = ?",
        (note_id, user_id),
    )
    return cursor.fetchone()


def get_notes_by_user(
    db: UnifiedConnection,
    user_id: str,
    folder_id: Optional[int] = None,
) -> list:
    """Retrieve all notes for a user, optionally filtered by folder."""
    cursor = db.cursor()
    if folder_id is not None:
        cursor.execute(
            """
            SELECT n.*, f.name as folder_name
            FROM notes n
            LEFT JOIN folders f ON n.folder_id = f.folder_id
            WHERE n.user_id = ? AND n.folder_id = ?
            ORDER BY n.updated_at DESC
            """,
            (user_id, folder_id),
        )
    else:
        cursor.execute(
            """
            SELECT n.*, f.name as folder_name
            FROM notes n
            LEFT JOIN folders f ON n.folder_id = f.folder_id
            WHERE n.user_id = ?
            ORDER BY n.updated_at DESC
            """,
            (user_id,),
        )
    return cursor.fetchall()


def get_notes_by_folder(
    db: UnifiedConnection,
    folder_id: int,
    user_id: str,
) -> list:
    """Retrieve all notes in a specific folder for a user."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY updated_at DESC",
        (folder_id, user_id),
    )
    return cursor.fetchall()


def update_note(
    db: UnifiedConnection,
    note_id: str,
    user_id: str,
    title: str,
    content: str = "",
    folder_id: Optional[int] = None,
) -> bool:
    """Update an existing note. Returns True if updated, False if not found."""
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE notes
        SET title = ?, content = ?, folder_id = ?, updated_at = ?
        WHERE note_id = ? AND user_id = ?
        """,
        (title, content, folder_id, datetime.datetime.now().isoformat(), note_id, user_id),
    )
    db.commit()
    return cursor.rowcount > 0


def delete_note(db: UnifiedConnection, note_id: str, user_id: str) -> bool:
    """Delete a note. Returns True if deleted, False if not found."""
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM notes WHERE note_id = ? AND user_id = ?",
        (note_id, user_id),
    )
    db.commit()
    return cursor.rowcount > 0
