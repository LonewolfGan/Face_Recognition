"""Unit tests for backend.app.models.user module."""

import sqlite3
import pytest
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.models.user import (
    create_user,
    get_user_by_id,
    get_user_by_face_id,
    get_user_by_name,
    update_user,
    delete_user,
)


@pytest.fixture
def db_conn():
    """Create an in-memory SQLite database with the users table."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            face_id TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    yield conn
    conn.close()


class TestCreateUser:
    def test_creates_user_and_returns_uuid(self, db_conn):
        user_id = create_user(db_conn, "Alice", "face_001")
        assert user_id is not None
        assert len(user_id) == 36  # UUID format

    def test_user_stored_in_database(self, db_conn):
        user_id = create_user(db_conn, "Bob", "face_002")
        row = db_conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        assert row is not None
        assert row["name"] == "Bob"
        assert row["face_id"] == "face_002"

    def test_password_hash_stored(self, db_conn):
        user_id = create_user(db_conn, "Carol", "face_003", password_hash="hashed_pw")
        row = db_conn.execute(
            "SELECT password_hash FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        assert row["password_hash"] == "hashed_pw"

    def test_duplicate_face_id_raises_integrity_error(self, db_conn):
        create_user(db_conn, "Dave", "face_004")
        with pytest.raises(sqlite3.IntegrityError):
            create_user(db_conn, "Eve", "face_004")

    def test_empty_name_raises_value_error(self, db_conn):
        with pytest.raises(ValueError, match="name must not be empty"):
            create_user(db_conn, "", "face_005")

    def test_whitespace_name_raises_value_error(self, db_conn):
        with pytest.raises(ValueError, match="name must not be empty"):
            create_user(db_conn, "   ", "face_005")

    def test_empty_face_id_raises_value_error(self, db_conn):
        with pytest.raises(ValueError, match="face_id must not be empty"):
            create_user(db_conn, "Frank", "")

    def test_strips_whitespace_from_name_and_face_id(self, db_conn):
        user_id = create_user(db_conn, "  Grace  ", "  face_006  ")
        user = get_user_by_id(db_conn, user_id)
        assert user["name"] == "Grace"
        assert user["face_id"] == "face_006"


class TestGetUserById:
    def test_returns_user_dict(self, db_conn):
        user_id = create_user(db_conn, "Hank", "face_010")
        user = get_user_by_id(db_conn, user_id)
        assert user is not None
        assert user["user_id"] == user_id
        assert user["name"] == "Hank"
        assert user["face_id"] == "face_010"

    def test_returns_none_for_nonexistent_id(self, db_conn):
        result = get_user_by_id(db_conn, "nonexistent-uuid")
        assert result is None


class TestGetUserByFaceId:
    def test_returns_user_dict(self, db_conn):
        user_id = create_user(db_conn, "Ivy", "face_020")
        user = get_user_by_face_id(db_conn, "face_020")
        assert user is not None
        assert user["user_id"] == user_id
        assert user["name"] == "Ivy"

    def test_returns_none_for_nonexistent_face_id(self, db_conn):
        result = get_user_by_face_id(db_conn, "no_such_face")
        assert result is None


class TestGetUserByName:
    def test_returns_user_dict(self, db_conn):
        user_id = create_user(db_conn, "Jack", "face_030")
        user = get_user_by_name(db_conn, "Jack")
        assert user is not None
        assert user["user_id"] == user_id

    def test_returns_none_for_nonexistent_name(self, db_conn):
        result = get_user_by_name(db_conn, "Nobody")
        assert result is None


class TestUpdateUser:
    def test_update_name(self, db_conn):
        user_id = create_user(db_conn, "Kate", "face_040")
        result = update_user(db_conn, user_id, name="Katherine")
        assert result is True
        user = get_user_by_id(db_conn, user_id)
        assert user["name"] == "Katherine"

    def test_update_face_id(self, db_conn):
        user_id = create_user(db_conn, "Leo", "face_050")
        result = update_user(db_conn, user_id, face_id="face_051")
        assert result is True
        user = get_user_by_id(db_conn, user_id)
        assert user["face_id"] == "face_051"

    def test_update_password_hash(self, db_conn):
        user_id = create_user(db_conn, "Mia", "face_060")
        result = update_user(db_conn, user_id, password_hash="new_hash")
        assert result is True
        user = get_user_by_id(db_conn, user_id)
        assert user["password_hash"] == "new_hash"

    def test_update_multiple_fields(self, db_conn):
        user_id = create_user(db_conn, "Ned", "face_070")
        result = update_user(db_conn, user_id, name="Edward", face_id="face_071")
        assert result is True
        user = get_user_by_id(db_conn, user_id)
        assert user["name"] == "Edward"
        assert user["face_id"] == "face_071"

    def test_returns_false_for_nonexistent_user(self, db_conn):
        result = update_user(db_conn, "no-such-id", name="Ghost")
        assert result is False

    def test_returns_false_when_no_fields_provided(self, db_conn):
        user_id = create_user(db_conn, "Olivia", "face_080")
        result = update_user(db_conn, user_id)
        assert result is False

    def test_duplicate_face_id_raises_integrity_error(self, db_conn):
        create_user(db_conn, "Pat", "face_090")
        user_id2 = create_user(db_conn, "Quinn", "face_091")
        with pytest.raises(sqlite3.IntegrityError):
            update_user(db_conn, user_id2, face_id="face_090")

    def test_empty_name_raises_value_error(self, db_conn):
        user_id = create_user(db_conn, "Rose", "face_100")
        with pytest.raises(ValueError, match="name must not be empty"):
            update_user(db_conn, user_id, name="")

    def test_empty_face_id_raises_value_error(self, db_conn):
        user_id = create_user(db_conn, "Sam", "face_110")
        with pytest.raises(ValueError, match="face_id must not be empty"):
            update_user(db_conn, user_id, face_id="  ")


class TestDeleteUser:
    def test_deletes_existing_user(self, db_conn):
        user_id = create_user(db_conn, "Tom", "face_120")
        result = delete_user(db_conn, user_id)
        assert result is True
        assert get_user_by_id(db_conn, user_id) is None

    def test_returns_false_for_nonexistent_user(self, db_conn):
        result = delete_user(db_conn, "no-such-id")
        assert result is False


class TestWithFilePath:
    """Test that functions work when given a file path instead of a connection."""

    def test_create_and_retrieve_with_path(self, tmp_path):
        db_path = str(tmp_path / "test.db")
        # Initialize the table
        conn = sqlite3.connect(db_path)
        conn.execute("""
            CREATE TABLE users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                face_id TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

        # Use path-based API
        user_id = create_user(db_path, "Uma", "face_200")
        user = get_user_by_id(db_path, user_id)
        assert user is not None
        assert user["name"] == "Uma"
        assert user["face_id"] == "face_200"
