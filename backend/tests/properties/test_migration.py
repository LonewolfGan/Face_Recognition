# Feature: project-restructure, Property 7: Migration file integrity
"""Property-based tests for migration file integrity.

Validates: Requirements 11.4
"""

import os
import pickle
import sqlite3
import tempfile

import faiss
import numpy as np
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

# Add the project root to sys.path so we can import migrate_data
import sys

_project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from migrate_data import migrate_data


# --- Strategies ---

EMBEDDING_DIM = 512


@st.composite
def migration_scenario(draw):
    """Generate a valid SQLite database and FAISS index pair for migration testing.

    Draws:
        - num_rows: number of rows in the SQLite database (1-50)
        - num_vectors: number of vectors in the FAISS index (1-20)
        - embedding_dim: always 512

    Returns a tuple of (num_rows, num_vectors, embedding_dim, seed) where seed
    is used to deterministically generate the vectors.
    """
    num_rows = draw(st.integers(min_value=1, max_value=50))
    num_vectors = draw(st.integers(min_value=1, max_value=20))
    embedding_dim = EMBEDDING_DIM
    seed = draw(st.integers(min_value=0, max_value=2**32 - 1))
    return num_rows, num_vectors, embedding_dim, seed


def _create_test_db(filepath: str, num_rows: int) -> None:
    """Create a valid SQLite database with a users table containing num_rows rows."""
    conn = sqlite3.connect(filepath)
    conn.execute(
        """CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            face_id TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    for i in range(num_rows):
        conn.execute(
            "INSERT INTO users (user_id, name, face_id) VALUES (?, ?, ?)",
            (f"user_{i}", f"User {i}", f"face_{i}"),
        )
    conn.commit()
    conn.close()


def _create_test_faiss_index(filepath: str, num_vectors: int, dim: int, seed: int) -> None:
    """Create a valid FAISS index file with num_vectors random vectors."""
    rng = np.random.default_rng(seed)
    index = faiss.IndexFlatL2(dim)
    vectors = rng.random((num_vectors, dim)).astype(np.float32)
    index.add(vectors)
    faiss.write_index(index, filepath)


# --- Property Test ---


class TestMigrationFileIntegrity:
    """Property 7: Migration file integrity.

    *For any* valid SQLite database file and FAISS index file pair, after the
    migration script moves them to the target directory, the database should be
    openable and queryable, and the FAISS index should load without errors and
    contain the same number of vectors.

    **Validates: Requirements 11.4**
    """

    @given(scenario=migration_scenario())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_migration_preserves_db_and_faiss_integrity(self, scenario):
        """After migration, DB is queryable with same row count and FAISS index has same vector count."""
        num_rows, num_vectors, embedding_dim, seed = scenario

        with tempfile.TemporaryDirectory() as source_dir, tempfile.TemporaryDirectory() as target_dir:
            # 1. Create a valid SQLite DB in the source directory
            db_path = os.path.join(source_dir, "users.db")
            _create_test_db(db_path, num_rows)

            # 2. Create a valid FAISS index in the source directory
            index_path = os.path.join(source_dir, "embeddings.index")
            _create_test_faiss_index(index_path, num_vectors, embedding_dim, seed)

            # 3. Run the migration
            results = migrate_data(
                source_dir=source_dir,
                target_dir=target_dir,
                root_dir=source_dir,  # Use source_dir as root to avoid fallback lookups
            )

            # 4. Verify the DB was moved successfully
            assert results.get("users.db") == "moved", (
                f"Expected users.db status 'moved', got '{results.get('users.db')}'"
            )

            # 5. Verify the FAISS index was moved successfully
            assert results.get("embeddings.index") == "moved", (
                f"Expected embeddings.index status 'moved', got '{results.get('embeddings.index')}'"
            )

            # 6. Verify the DB at target is openable and has the same row count
            target_db_path = os.path.join(target_dir, "users.db")
            assert os.path.exists(target_db_path), "users.db not found at target"

            conn = sqlite3.connect(target_db_path)
            row_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            conn.close()
            assert row_count == num_rows, (
                f"Expected {num_rows} rows in migrated DB, got {row_count}"
            )

            # 7. Verify the FAISS index at target loads and has the same vector count
            target_index_path = os.path.join(target_dir, "embeddings.index")
            assert os.path.exists(target_index_path), "embeddings.index not found at target"

            loaded_index = faiss.read_index(target_index_path)
            assert loaded_index.ntotal == num_vectors, (
                f"Expected {num_vectors} vectors in migrated FAISS index, "
                f"got {loaded_index.ntotal}"
            )
            assert loaded_index.d == embedding_dim, (
                f"Expected dimension {embedding_dim}, got {loaded_index.d}"
            )
