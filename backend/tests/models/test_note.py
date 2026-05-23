"""Unit tests for the Note model CRUD operations."""

import sqlite3
import uuid

import pytest

from backend.app.models.note import (
    create_note,
    delete_note,
    get_note_by_id,
    get_notes_by_folder,
    get_notes_by_user,
    update_note,
)


@pytest.fixture
def db_conn():
    """Create an in-memory SQLite database with the required schema."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            face_id TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE folders (
            folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            parent_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (parent_id) REFERENCES folders(folder_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE notes (
            note_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            folder_id INTEGER REFERENCES folders(folder_id),
            title TEXT NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # Insert a test user
    cursor.execute(
        "INSERT INTO users (user_id, name, face_id) VALUES (?, ?, ?)",
        ("user-1", "Test User", "face-1"),
    )

    # Insert a test folder
    cursor.execute(
        "INSERT INTO folders (user_id, name) VALUES (?, ?)",
        ("user-1", "Work"),
    )

    conn.commit()
    yield conn
    conn.close()


class TestCreateNote:
    def test_creates_note_and_returns_id(self, db_conn):
        note_id = create_note(db_conn, "user-1", "My Note", "Some content")
        assert note_id is not None
        # Verify it's a valid UUID
        uuid.UUID(note_id)

    def test_creates_note_with_default_empty_content(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Empty Note")
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note["content"] == ""

    def test_creates_note_in_folder(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Folder Note", "content", folder_id=1)
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note["folder_id"] == 1

    def test_creates_note_with_timestamps(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Timestamped")
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note["created_at"] is not None
        assert note["updated_at"] is not None


class TestGetNoteById:
    def test_returns_note_for_owner(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Test", "Content")
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note is not None
        assert note["title"] == "Test"
        assert note["content"] == "Content"

    def test_returns_none_for_wrong_user(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Test", "Content")
        note = get_note_by_id(db_conn, note_id, "other-user")
        assert note is None

    def test_returns_none_for_nonexistent_id(self, db_conn):
        note = get_note_by_id(db_conn, "nonexistent-id", "user-1")
        assert note is None


class TestGetNotesByUser:
    def test_returns_all_user_notes(self, db_conn):
        create_note(db_conn, "user-1", "Note 1")
        create_note(db_conn, "user-1", "Note 2")
        notes = get_notes_by_user(db_conn, "user-1")
        assert len(notes) == 2

    def test_returns_empty_list_for_no_notes(self, db_conn):
        notes = get_notes_by_user(db_conn, "user-1")
        assert notes == []

    def test_filters_by_folder_id(self, db_conn):
        create_note(db_conn, "user-1", "In folder", folder_id=1)
        create_note(db_conn, "user-1", "No folder")
        notes = get_notes_by_user(db_conn, "user-1", folder_id=1)
        assert len(notes) == 1
        assert notes[0]["title"] == "In folder"

    def test_includes_folder_name(self, db_conn):
        create_note(db_conn, "user-1", "In folder", folder_id=1)
        notes = get_notes_by_user(db_conn, "user-1")
        assert notes[0]["folder_name"] == "Work"

    def test_ordered_by_updated_at_descending(self, db_conn):
        id1 = create_note(db_conn, "user-1", "First")
        # Update the second note so it has a later updated_at
        id2 = create_note(db_conn, "user-1", "Second")
        # Force a later timestamp on the second note
        db_conn.execute(
            "UPDATE notes SET updated_at = '2099-01-01T00:00:00' WHERE note_id = ?",
            (id2,),
        )
        db_conn.commit()
        notes = get_notes_by_user(db_conn, "user-1")
        assert notes[0]["note_id"] == id2
        assert notes[1]["note_id"] == id1


class TestGetNotesByFolder:
    def test_returns_notes_in_folder(self, db_conn):
        create_note(db_conn, "user-1", "In folder", folder_id=1)
        create_note(db_conn, "user-1", "Not in folder")
        notes = get_notes_by_folder(db_conn, 1, "user-1")
        assert len(notes) == 1
        assert notes[0]["title"] == "In folder"

    def test_returns_empty_for_empty_folder(self, db_conn):
        notes = get_notes_by_folder(db_conn, 1, "user-1")
        assert notes == []

    def test_scoped_to_user(self, db_conn):
        create_note(db_conn, "user-1", "My note", folder_id=1)
        notes = get_notes_by_folder(db_conn, 1, "other-user")
        assert notes == []


class TestUpdateNote:
    def test_updates_title_and_content(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Old Title", "Old Content")
        result = update_note(db_conn, note_id, "user-1", "New Title", "New Content")
        assert result is True
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note["title"] == "New Title"
        assert note["content"] == "New Content"

    def test_updates_folder_id(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Note")
        update_note(db_conn, note_id, "user-1", "Note", folder_id=1)
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note["folder_id"] == 1

    def test_updates_updated_at_timestamp(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Note")
        original = get_note_by_id(db_conn, note_id, "user-1")
        update_note(db_conn, note_id, "user-1", "Updated")
        updated = get_note_by_id(db_conn, note_id, "user-1")
        assert updated["updated_at"] >= original["updated_at"]

    def test_returns_false_for_wrong_user(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Note")
        result = update_note(db_conn, note_id, "other-user", "Hacked")
        assert result is False

    def test_returns_false_for_nonexistent_note(self, db_conn):
        result = update_note(db_conn, "nonexistent", "user-1", "Title")
        assert result is False


class TestDeleteNote:
    def test_deletes_note(self, db_conn):
        note_id = create_note(db_conn, "user-1", "To Delete")
        result = delete_note(db_conn, note_id, "user-1")
        assert result is True
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note is None

    def test_returns_false_for_wrong_user(self, db_conn):
        note_id = create_note(db_conn, "user-1", "Note")
        result = delete_note(db_conn, note_id, "other-user")
        assert result is False
        # Note should still exist
        note = get_note_by_id(db_conn, note_id, "user-1")
        assert note is not None

    def test_returns_false_for_nonexistent_note(self, db_conn):
        result = delete_note(db_conn, "nonexistent", "user-1")
        assert result is False
