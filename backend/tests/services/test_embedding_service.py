"""Unit tests for the EmbeddingStore class.

Tests cover initialization, add/search round-trip, persistence,
reload, thread safety, and error handling.
"""

import os
import tempfile
import threading

import numpy as np
import pytest

from app.services.embedding_service import EmbeddingStore, EMBEDDING_DIM


@pytest.fixture
def tmp_data_dir():
    """Provide a temporary directory for embedding data files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def store(tmp_data_dir):
    """Provide a fresh EmbeddingStore instance."""
    return EmbeddingStore(tmp_data_dir)


def random_embedding():
    """Generate a random 512-dim embedding vector."""
    return np.random.rand(EMBEDDING_DIM).tolist()


class TestInit:
    """Tests for EmbeddingStore initialization."""

    def test_empty_directory_creates_empty_store(self, tmp_data_dir):
        store = EmbeddingStore(tmp_data_dir)
        assert store._index.ntotal == 0
        assert store._embeddings_map == {}
        assert store._index_to_face_id == []

    def test_loads_existing_data_from_disk(self, tmp_data_dir):
        # Create a store, add data, persist
        store1 = EmbeddingStore(tmp_data_dir)
        emb = random_embedding()
        store1.add_embeddings("face_001", [emb])

        # Create a new store from same directory
        store2 = EmbeddingStore(tmp_data_dir)
        assert store2._index.ntotal == 1
        assert "face_001" in store2._embeddings_map

    def test_missing_pkl_initializes_empty(self, tmp_data_dir):
        # Only create the index file, not the pkl
        import faiss
        index = faiss.IndexFlatL2(EMBEDDING_DIM)
        faiss.write_index(index, os.path.join(tmp_data_dir, "embeddings.index"))

        store = EmbeddingStore(tmp_data_dir)
        assert store._index.ntotal == 0
        assert store._embeddings_map == {}

    def test_missing_index_initializes_empty_index(self, tmp_data_dir):
        import pickle
        # Only create the pkl file, not the index
        with open(os.path.join(tmp_data_dir, "embeddings.pkl"), "wb") as f:
            pickle.dump({"face_001": [random_embedding()]}, f)

        store = EmbeddingStore(tmp_data_dir)
        # Should rebuild index from pkl data
        assert store._index.ntotal == 1


class TestAddEmbeddings:
    """Tests for add_embeddings method."""

    def test_add_single_embedding(self, store):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        assert store._index.ntotal == 1
        assert "face_001" in store._embeddings_map
        assert len(store._embeddings_map["face_001"]) == 1

    def test_add_multiple_embeddings(self, store):
        embs = [random_embedding() for _ in range(5)]
        store.add_embeddings("face_001", embs)
        assert store._index.ntotal == 5
        assert len(store._embeddings_map["face_001"]) == 5

    def test_add_to_existing_face_id(self, store):
        embs1 = [random_embedding() for _ in range(3)]
        store.add_embeddings("face_001", embs1)

        embs2 = [random_embedding() for _ in range(2)]
        store.add_embeddings("face_001", embs2)

        assert store._index.ntotal == 5
        assert len(store._embeddings_map["face_001"]) == 5

    def test_add_persists_to_disk(self, store, tmp_data_dir):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        assert os.path.exists(os.path.join(tmp_data_dir, "embeddings.pkl"))
        assert os.path.exists(os.path.join(tmp_data_dir, "embeddings.index"))


class TestSearch:
    """Tests for search method."""

    def test_search_returns_correct_face_id(self, store):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        result_id, distance = store.search(emb)
        assert result_id == "face_001"
        assert distance < 0.001  # near-zero for same vector

    def test_search_empty_store_returns_none(self, store):
        emb = random_embedding()
        result_id, distance = store.search(emb)
        assert result_id is None
        assert distance == float("inf")

    def test_search_above_threshold_returns_none(self, store):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        # Search with a very different vector and tight threshold
        other_emb = random_embedding()
        result_id, distance = store.search(other_emb, threshold=0.0001)
        assert result_id is None

    def test_search_finds_closest_match(self, store):
        emb1 = random_embedding()
        emb2 = random_embedding()
        store.add_embeddings("face_001", [emb1])
        store.add_embeddings("face_002", [emb2])

        # Search for emb1 should find face_001
        result_id, _ = store.search(emb1)
        assert result_id == "face_001"

        # Search for emb2 should find face_002
        result_id, _ = store.search(emb2)
        assert result_id == "face_002"


class TestPersist:
    """Tests for persist method."""

    def test_persist_returns_true_on_success(self, store):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        assert store.persist() is True

    def test_persist_failure_retains_in_memory_state(self, store):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])

        # Point to invalid path to force failure
        store._data_dir = "Z:\\nonexistent\\path"
        store._pkl_path = os.path.join(store._data_dir, "embeddings.pkl")
        store._index_path = os.path.join(store._data_dir, "embeddings.index")

        result = store.persist()
        assert result is False
        # In-memory state retained
        assert store._index.ntotal == 1
        assert "face_001" in store._embeddings_map

    def test_persist_creates_data_dir_if_missing(self, tmp_data_dir):
        subdir = os.path.join(tmp_data_dir, "nested", "dir")
        store = EmbeddingStore(subdir)
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        assert store.persist() is True
        assert os.path.exists(subdir)


class TestReload:
    """Tests for reload method."""

    def test_reload_restores_disk_state(self, store, tmp_data_dir):
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])
        # Disk now has face_001

        # Manually add face_002 to memory only
        emb2 = random_embedding()
        emb_array = np.array(emb2, dtype=np.float32).reshape(1, EMBEDDING_DIM)
        store._embeddings_map["face_002"] = [emb2]
        store._index_to_face_id.append("face_002")
        store._index.add(emb_array)

        assert store._index.ntotal == 2

        # Reload should revert to disk state
        store.reload()
        assert store._index.ntotal == 1
        assert "face_001" in store._embeddings_map
        assert "face_002" not in store._embeddings_map

    def test_reload_empty_disk_clears_state(self, tmp_data_dir):
        store = EmbeddingStore(tmp_data_dir)
        emb = random_embedding()
        store.add_embeddings("face_001", [emb])

        # Delete disk files
        os.remove(os.path.join(tmp_data_dir, "embeddings.pkl"))
        os.remove(os.path.join(tmp_data_dir, "embeddings.index"))

        store.reload()
        assert store._index.ntotal == 0
        assert store._embeddings_map == {}


class TestThreadSafety:
    """Tests for thread-safe behavior."""

    def test_concurrent_writes_maintain_consistency(self, store):
        num_faces = 10
        embeddings_per_face = 5

        def add_face(face_id):
            embs = [random_embedding() for _ in range(embeddings_per_face)]
            store.add_embeddings(face_id, embs)

        threads = [
            threading.Thread(target=add_face, args=(f"face_{i:03d}",))
            for i in range(num_faces)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        expected_total = num_faces * embeddings_per_face
        assert store._index.ntotal == expected_total
        assert len(store._embeddings_map) == num_faces
