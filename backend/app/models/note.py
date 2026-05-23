"""Note model - CRUD operations for notes against SQLite."""

import sqlite3
import uuid
import datetime


def _get_connection(db):
    """
    Get a sqlite3 connection from a path string or existing connection.

    Args:
        db: Either a file path (str) to a SQLite database, or an existing
            sqlite3.Connection instance.

    Returns:
        tuple: (connection, should_close) where should_close indicates if the
               caller is responsible for closing the connection.
    """
    if isinstance(db, sqlite3.Connection):
        return db, False
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    return conn, True


def create_note(db, user_id, title, content="", folder_id=None):
    """
    Create a new note for a user.

    Args:
        db: Database path (str) or sqlite3.Connection.
        user_id (str): ID of the user who owns the note.
        title (str): Note title.
        content (str): Note content. Defaults to empty string.
        folder_id (int | None): Optional folder ID to place the note in.

    Returns:
        str: The generated note_id.

    Raises:
        sqlite3.IntegrityError: If user_id or folder_id references are invalid.
    """
    conn, should_close = _get_connection(db)
    try:
        cursor = conn.cursor()
        note_id = str(uuid.uuid4())
        now = datetime.datetime.now().isoformat()

        cursor.execute(
            """
            INSERT INTO notes (note_id, user_id, title, content, folder_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (note_id, user_id, title, content, folder_id, now, now),
        )
        conn.commit()
        return note_id
    finally:
        if should_close:
            conn.close()


def get_note_by_id(db, note_id, user_id):
    """
    Retrieve a specific note by its ID, scoped to a user.

    Args:
        db: Database path (str) or sqlite3.Connection.
        note_id (str): The note's unique identifier.
        user_id (str): The owner's user ID (for access control).

    Returns:
        dict | None: Note data as a dictionary, or None if not found.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM notes WHERE note_id = ? AND user_id = ?",
            (note_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        if should_close:
            conn.close()


def get_notes_by_user(db, user_id, folder_id=None):
    """
    Retrieve all notes for a user, optionally filtered by folder.

    Args:
        db: Database path (str) or sqlite3.Connection.
        user_id (str): The owner's user ID.
        folder_id (int | None): If provided, only return notes in this folder.

    Returns:
        list[dict]: List of note dictionaries ordered by updated_at descending.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

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

        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        if should_close:
            conn.close()


def get_notes_by_folder(db, folder_id, user_id):
    """
    Retrieve all notes in a specific folder for a user.

    Args:
        db: Database path (str) or sqlite3.Connection.
        folder_id (int): The folder's ID.
        user_id (str): The owner's user ID (for access control).

    Returns:
        list[dict]: List of note dictionaries ordered by updated_at descending.
    """
    conn, should_close = _get_connection(db)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM notes
            WHERE folder_id = ? AND user_id = ?
            ORDER BY updated_at DESC
            """,
            (folder_id, user_id),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        if should_close:
            conn.close()


def update_note(db, note_id, user_id, title, content="", folder_id=None):
    """
    Update an existing note.

    Args:
        db: Database path (str) or sqlite3.Connection.
        note_id (str): The note's unique identifier.
        user_id (str): The owner's user ID (for access control).
        title (str): Updated title.
        content (str): Updated content. Defaults to empty string.
        folder_id (int | None): Updated folder ID, or None to remove from folder.

    Returns:
        bool: True if the note was updated, False if not found or not owned by user.
    """
    conn, should_close = _get_connection(db)
    try:
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE notes
            SET title = ?, content = ?, folder_id = ?, updated_at = ?
            WHERE note_id = ? AND user_id = ?
            """,
            (title, content, folder_id, datetime.datetime.now().isoformat(), note_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        if should_close:
            conn.close()


def delete_note(db, note_id, user_id):
    """
    Delete a note.

    Args:
        db: Database path (str) or sqlite3.Connection.
        note_id (str): The note's unique identifier.
        user_id (str): The owner's user ID (for access control).

    Returns:
        bool: True if the note was deleted, False if not found or not owned by user.
    """
    conn, should_close = _get_connection(db)
    try:
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM notes WHERE note_id = ? AND user_id = ?",
            (note_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        if should_close:
            conn.close()
