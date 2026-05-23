"""Unit tests for the Folder model CRUD operations."""

import sqlite3
import pytest

from app.models.folder import (
    create_folder,
    get_folder_by_id,
    get_folders_by_user,
    get_notes_in_folder,
    update_folder,
    delete_folder,
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
    conn.commit()

    yield conn
    conn.close()


class TestCreateFolder:
    def test_creates_folder_and_returns_id(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "My Folder")
        assert isinstance(folder_id, int)
        assert folder_id > 0

    def test_creates_folder_with_parent(self, db_conn):
        parent_id = create_folder(db_conn, "user-1", "Parent")
        child_id = create_folder(db_conn, "user-1", "Child", parent_id=parent_id)
        assert child_id != parent_id

        child = get_folder_by_id(db_conn, child_id, "user-1")
        assert child["parent_id"] == parent_id

    def test_creates_folder_without_parent(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Root Folder")
        folder = get_folder_by_id(db_conn, folder_id, "user-1")
        assert folder["parent_id"] is None

    def test_auto_increments_folder_id(self, db_conn):
        id1 = create_folder(db_conn, "user-1", "Folder A")
        id2 = create_folder(db_conn, "user-1", "Folder B")
        assert id2 > id1


class TestGetFolderById:
    def test_returns_folder_when_exists(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Test Folder")
        folder = get_folder_by_id(db_conn, folder_id, "user-1")

        assert folder is not None
        assert folder["folder_id"] == folder_id
        assert folder["user_id"] == "user-1"
        assert folder["name"] == "Test Folder"
        assert folder["parent_id"] is None
        assert folder["created_at"] is not None

    def test_returns_none_for_nonexistent_folder(self, db_conn):
        result = get_folder_by_id(db_conn, 9999, "user-1")
        assert result is None

    def test_returns_none_for_wrong_user(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Private Folder")
        result = get_folder_by_id(db_conn, folder_id, "other-user")
        assert result is None


class TestGetFoldersByUser:
    def test_returns_empty_list_when_no_folders(self, db_conn):
        folders = get_folders_by_user(db_conn, "user-1")
        assert folders == []

    def test_returns_all_user_folders(self, db_conn):
        create_folder(db_conn, "user-1", "Folder A")
        create_folder(db_conn, "user-1", "Folder B")
        create_folder(db_conn, "user-1", "Folder C")

        folders = get_folders_by_user(db_conn, "user-1")
        assert len(folders) == 3

    def test_returns_folders_ordered_by_name(self, db_conn):
        create_folder(db_conn, "user-1", "Zebra")
        create_folder(db_conn, "user-1", "Apple")
        create_folder(db_conn, "user-1", "Mango")

        folders = get_folders_by_user(db_conn, "user-1")
        names = [f["name"] for f in folders]
        assert names == ["Apple", "Mango", "Zebra"]

    def test_does_not_return_other_users_folders(self, db_conn):
        # Add another user
        db_conn.execute(
            "INSERT INTO users (user_id, name, face_id) VALUES (?, ?, ?)",
            ("user-2", "Other User", "face-2"),
        )
        db_conn.commit()

        create_folder(db_conn, "user-1", "User 1 Folder")
        create_folder(db_conn, "user-2", "User 2 Folder")

        folders = get_folders_by_user(db_conn, "user-1")
        assert len(folders) == 1
        assert folders[0]["name"] == "User 1 Folder"


class TestGetNotesInFolder:
    def test_returns_empty_list_when_no_notes(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Empty Folder")
        notes = get_notes_in_folder(db_conn, folder_id, "user-1")
        assert notes == []

    def test_returns_notes_in_folder(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "My Folder")

        # Insert test notes
        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title, content, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("note-1", "user-1", folder_id, "Note 1", "Content 1", "2024-01-02"),
        )
        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title, content, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("note-2", "user-1", folder_id, "Note 2", "Content 2", "2024-01-03"),
        )
        db_conn.commit()

        notes = get_notes_in_folder(db_conn, folder_id, "user-1")
        assert len(notes) == 2

    def test_returns_notes_ordered_by_updated_at_desc(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "My Folder")

        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title, updated_at) VALUES (?, ?, ?, ?, ?)",
            ("note-old", "user-1", folder_id, "Old Note", "2024-01-01"),
        )
        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title, updated_at) VALUES (?, ?, ?, ?, ?)",
            ("note-new", "user-1", folder_id, "New Note", "2024-01-10"),
        )
        db_conn.commit()

        notes = get_notes_in_folder(db_conn, folder_id, "user-1")
        assert notes[0]["title"] == "New Note"
        assert notes[1]["title"] == "Old Note"

    def test_does_not_return_other_users_notes(self, db_conn):
        db_conn.execute(
            "INSERT INTO users (user_id, name, face_id) VALUES (?, ?, ?)",
            ("user-2", "Other", "face-2"),
        )
        folder_id = create_folder(db_conn, "user-1", "Shared Folder")

        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title) VALUES (?, ?, ?, ?)",
            ("note-1", "user-1", folder_id, "My Note"),
        )
        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title) VALUES (?, ?, ?, ?)",
            ("note-2", "user-2", folder_id, "Their Note"),
        )
        db_conn.commit()

        notes = get_notes_in_folder(db_conn, folder_id, "user-1")
        assert len(notes) == 1
        assert notes[0]["note_id"] == "note-1"


class TestUpdateFolder:
    def test_updates_folder_name(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Old Name")
        result = update_folder(db_conn, folder_id, "user-1", "New Name")

        assert result is True
        folder = get_folder_by_id(db_conn, folder_id, "user-1")
        assert folder["name"] == "New Name"

    def test_updates_parent_id(self, db_conn):
        parent_id = create_folder(db_conn, "user-1", "Parent")
        child_id = create_folder(db_conn, "user-1", "Child")

        result = update_folder(db_conn, child_id, "user-1", "Child", parent_id=parent_id)
        assert result is True

        child = get_folder_by_id(db_conn, child_id, "user-1")
        assert child["parent_id"] == parent_id

    def test_returns_false_for_nonexistent_folder(self, db_conn):
        result = update_folder(db_conn, 9999, "user-1", "Name")
        assert result is False

    def test_returns_false_for_wrong_user(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "My Folder")
        result = update_folder(db_conn, folder_id, "other-user", "Hacked")
        assert result is False


class TestDeleteFolder:
    def test_deletes_folder(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "To Delete")
        result = delete_folder(db_conn, folder_id, "user-1")

        assert result is True
        assert get_folder_by_id(db_conn, folder_id, "user-1") is None

    def test_deletes_notes_in_folder(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "Folder With Notes")

        db_conn.execute(
            "INSERT INTO notes (note_id, user_id, folder_id, title) VALUES (?, ?, ?, ?)",
            ("note-1", "user-1", folder_id, "Note in folder"),
        )
        db_conn.commit()

        delete_folder(db_conn, folder_id, "user-1")

        cursor = db_conn.execute(
            "SELECT * FROM notes WHERE note_id = ?", ("note-1",)
        )
        assert cursor.fetchone() is None

    def test_returns_false_for_nonexistent_folder(self, db_conn):
        result = delete_folder(db_conn, 9999, "user-1")
        assert result is False

    def test_returns_false_for_wrong_user(self, db_conn):
        folder_id = create_folder(db_conn, "user-1", "My Folder")
        result = delete_folder(db_conn, folder_id, "other-user")
        assert result is False

        # Folder should still exist
        assert get_folder_by_id(db_conn, folder_id, "user-1") is not None
