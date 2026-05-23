"""Unit tests for the migrate_data.py migration script."""

import os
import pickle
import sqlite3
import sys
import tempfile

import pytest

# Add project root to path so we can import migrate_data
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from migrate_data import migrate_data, _verify_sqlite, _verify_pickle


class TestMigrateData:
    """Tests for the migrate_data function."""

    def _create_test_db(self, path: str) -> None:
        """Create a minimal valid SQLite database."""
        conn = sqlite3.connect(path)
        conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)")
        conn.execute("INSERT INTO test VALUES (1)")
        conn.commit()
        conn.close()

    def _create_test_pickle(self, path: str) -> None:
        """Create a minimal valid pickle file."""
        data = {"test_face": [[0.1] * 512]}
        with open(path, "wb") as f:
            pickle.dump(data, f)

    def test_migrate_creates_target_dir(self, tmp_path):
        """Target directory is created if it doesn't exist."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target" / "nested"

        # Create a test db in source
        db_path = source / "users.db"
        self._create_test_db(str(db_path))

        # Use an empty root_dir so it doesn't find real project files
        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert target.exists()
        assert result["users.db"] == "moved"

    def test_migrate_skips_missing_files(self, tmp_path):
        """Missing files are skipped with 'skipped' status."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        # Use an empty root_dir so it doesn't find real project files
        empty_root = tmp_path / "empty_root"
        empty_root.mkdir()
        result = migrate_data(str(source), str(target), root_dir=str(empty_root))

        assert result["users.db"] == "skipped"
        assert result["embeddings.pkl"] == "skipped"
        assert result["embeddings.index"] == "skipped"

    def test_migrate_moves_sqlite_db(self, tmp_path):
        """SQLite database is moved and verified successfully."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        db_path = source / "users.db"
        self._create_test_db(str(db_path))

        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert result["users.db"] == "moved"
        assert not db_path.exists()  # Source removed
        assert (target / "users.db").exists()  # Target exists

    def test_migrate_moves_pickle_file(self, tmp_path):
        """Pickle file is moved and verified successfully."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        pkl_path = source / "embeddings.pkl"
        self._create_test_pickle(str(pkl_path))

        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert result["embeddings.pkl"] == "moved"
        assert not pkl_path.exists()
        assert (target / "embeddings.pkl").exists()

    def test_migrate_reports_integrity_failure_for_corrupt_db(self, tmp_path):
        """Corrupt database file reports integrity_failed status."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        # Create a corrupt "database" file
        db_path = source / "users.db"
        db_path.write_text("this is not a database")

        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert result["users.db"] == "integrity_failed"

    def test_migrate_reports_integrity_failure_for_corrupt_pickle(self, tmp_path):
        """Corrupt pickle file reports integrity_failed status."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        pkl_path = source / "embeddings.pkl"
        pkl_path.write_text("this is not a pickle")

        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert result["embeddings.pkl"] == "integrity_failed"

    def test_migrate_all_statuses_returned(self, tmp_path):
        """All three data files have a status in the result dict."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()

        result = migrate_data(str(source), str(target), root_dir=str(tmp_path / "empty_root"))

        assert "users.db" in result
        assert "embeddings.pkl" in result
        assert "embeddings.index" in result

    def test_migrate_falls_back_to_root_dir(self, tmp_path):
        """Files not in source_dir are found in root_dir as fallback."""
        source = tmp_path / "source"
        source.mkdir()
        target = tmp_path / "target"
        target.mkdir()
        root = tmp_path / "root"
        root.mkdir()

        # Put file in root, not in source
        db_path = root / "users.db"
        self._create_test_db(str(db_path))

        result = migrate_data(str(source), str(target), root_dir=str(root))

        assert result["users.db"] == "moved"
        assert not db_path.exists()
        assert (target / "users.db").exists()


class TestVerifyHelpers:
    """Tests for individual verification helper functions."""

    def test_verify_sqlite_valid(self, tmp_path):
        """Valid SQLite file passes verification."""
        db_path = tmp_path / "test.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE t (id INTEGER)")
        conn.commit()
        conn.close()

        assert _verify_sqlite(str(db_path)) is True

    def test_verify_sqlite_invalid(self, tmp_path):
        """Invalid file fails SQLite verification."""
        db_path = tmp_path / "bad.db"
        db_path.write_text("not a database")

        assert _verify_sqlite(str(db_path)) is False

    def test_verify_pickle_valid(self, tmp_path):
        """Valid pickle file passes verification."""
        pkl_path = tmp_path / "test.pkl"
        with open(str(pkl_path), "wb") as f:
            pickle.dump({"key": "value"}, f)

        assert _verify_pickle(str(pkl_path)) is True

    def test_verify_pickle_invalid(self, tmp_path):
        """Invalid file fails pickle verification."""
        pkl_path = tmp_path / "bad.pkl"
        pkl_path.write_text("not a pickle")

        assert _verify_pickle(str(pkl_path)) is False
