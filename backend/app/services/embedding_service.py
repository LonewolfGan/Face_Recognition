"""Thread-safe FAISS embedding store with disk persistence.

Provides the EmbeddingStore class that manages face embeddings using a FAISS
IndexFlatL2 index for similarity search, with pickle-based metadata storage
and thread-safe write operations.
"""

import os
import pickle
import threading
import logging

import faiss
import numpy as np

logger = logging.getLogger(__name__)

# Dimension of ArcFace embeddings
EMBEDDING_DIM = 512


class EmbeddingStore:
    """Thread-safe FAISS embedding store with disk persistence.

    Manages a FAISS IndexFlatL2 index and a mapping of face_id to embeddings.
    Write operations (add_embeddings, persist) are serialized via a threading.Lock.
    Read operations (search) do not acquire the lock since FAISS reads are safe
    concurrent with other reads.

    Files on disk:
        - embeddings.pkl: pickle dict mapping face_id -> list of embeddings
        - embeddings.index: FAISS binary index file
    """

    def __init__(self, data_dir: str):
        """Load or initialize FAISS index and embeddings map.

        If the data files exist on disk, they are loaded into memory.
        If they do not exist, an empty FAISS IndexFlatL2(512) index and
        an empty embeddings map are initialized.

        Args:
            data_dir: Path to the directory containing embedding data files.
        """
        self._data_dir = data_dir
        self._lock = threading.Lock()

        self._pkl_path = os.path.join(data_dir, "embeddings.pkl")
        self._index_path = os.path.join(data_dir, "embeddings.index")

        # Mapping: face_id -> list of embedding vectors (list[list[float]])
        self._embeddings_map: dict[str, list[list[float]]] = {}

        # Ordered list tracking which face_id each index position belongs to
        self._index_to_face_id: list[str] = []

        # FAISS index for similarity search
        self._index: faiss.IndexFlatL2 = faiss.IndexFlatL2(EMBEDDING_DIM)

        # Load existing data if available
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Load embeddings map and FAISS index from disk files.

        If files don't exist, the store remains in its empty initialized state.
        If the FAISS index and embeddings map are out of sync, the index is
        rebuilt from the embeddings map.
        """
        # Load embeddings map from pickle
        if os.path.exists(self._pkl_path):
            try:
                with open(self._pkl_path, "rb") as f:
                    self._embeddings_map = pickle.load(f)
            except Exception as e:
                logger.warning("Failed to load embeddings.pkl: %s", e)
                self._embeddings_map = {}

        # Load FAISS index
        if os.path.exists(self._index_path):
            try:
                self._index = faiss.read_index(self._index_path)
            except Exception as e:
                logger.warning("Failed to load embeddings.index: %s", e)
                self._index = faiss.IndexFlatL2(EMBEDDING_DIM)

        # Rebuild index_to_face_id mapping from embeddings_map
        self._index_to_face_id = []
        for face_id, embeddings in self._embeddings_map.items():
            if isinstance(embeddings, list):
                self._index_to_face_id.extend([face_id] * len(embeddings))
            else:
                self._index_to_face_id.append(face_id)

        # Check for desynchronization and rebuild if needed
        if self._index.ntotal != len(self._index_to_face_id):
            logger.warning(
                "Index desync detected: index has %d vectors, map has %d. Rebuilding.",
                self._index.ntotal,
                len(self._index_to_face_id),
            )
            self._rebuild_index()

    def _rebuild_index(self) -> None:
        """Rebuild the FAISS index from the embeddings map."""
        self._index = faiss.IndexFlatL2(EMBEDDING_DIM)
        self._index_to_face_id = []

        for face_id, embeddings in self._embeddings_map.items():
            if isinstance(embeddings, list):
                for emb in embeddings:
                    self._add_single_embedding(face_id, emb)
            else:
                self._add_single_embedding(face_id, embeddings)

    def _add_single_embedding(self, face_id: str, embedding: list[float]) -> bool:
        """Add a single embedding vector to the FAISS index.

        Args:
            face_id: The face identifier.
            embedding: A 512-dimensional embedding vector.

        Returns:
            True if successfully added, False otherwise.
        """
        try:
            embedding_array = np.array(embedding, dtype=np.float32)
            if embedding_array.shape == (EMBEDDING_DIM,):
                embedding_array = embedding_array.reshape(1, EMBEDDING_DIM)

            if len(embedding_array.shape) != 2 or embedding_array.shape[1] != EMBEDDING_DIM:
                logger.warning(
                    "Invalid embedding shape %s for face_id %s",
                    embedding_array.shape,
                    face_id,
                )
                return False

            self._index_to_face_id.append(face_id)
            self._index.add(embedding_array)
            return True
        except Exception as e:
            logger.error("Error adding embedding for %s: %s", face_id, e)
            return False

    def add_embeddings(self, face_id: str, embeddings: list[list[float]]) -> None:
        """Add embeddings for a face_id. Thread-safe write.

        Acquires the write lock, adds all embeddings to the FAISS index,
        updates the embeddings map, and persists to disk.

        Args:
            face_id: Unique identifier for the face.
            embeddings: List of 512-dimensional embedding vectors.
        """
        with self._lock:
            # Update the embeddings map
            if face_id in self._embeddings_map:
                self._embeddings_map[face_id].extend(embeddings)
            else:
                self._embeddings_map[face_id] = list(embeddings)

            # Add each embedding to the FAISS index
            for emb in embeddings:
                self._add_single_embedding(face_id, emb)

            # Persist to disk (best effort)
            self._persist_internal()

    def search(self, embedding: list[float], threshold: float = 3.5) -> tuple[str | None, float]:
        """Find closest face_id for an embedding. Thread-safe read.

        Does not acquire the lock since FAISS reads are safe concurrent
        with other reads.

        Args:
            embedding: A 512-dimensional query embedding vector.
            threshold: Maximum L2 distance to consider a match.
                Distances above this threshold return (None, distance).

        Returns:
            A tuple of (face_id, distance) for the closest match,
            or (None, float('inf')) if no embeddings exist or no match
            is within the threshold.
        """
        if self._index.ntotal == 0:
            return (None, float("inf"))

        query = np.array(embedding, dtype=np.float32).reshape(1, EMBEDDING_DIM)
        distances, indices = self._index.search(query, k=1)

        distance = float(distances[0][0])
        idx = int(indices[0][0])

        if idx < 0 or idx >= len(self._index_to_face_id):
            return (None, float("inf"))

        logger.info("FAISS search: distance=%.4f, threshold=%.2f, match=%s",
                    distance, threshold, "YES" if distance <= threshold else "NO")

        if distance > threshold:
            return (None, distance)

        face_id = self._index_to_face_id[idx]
        return (face_id, distance)

    def persist(self) -> bool:
        """Write current state to disk. Returns False on failure.

        Acquires the write lock and writes both the embeddings map (pickle)
        and the FAISS index to disk. If persistence fails, in-memory state
        is retained.

        Returns:
            True if persistence succeeded, False otherwise.
        """
        with self._lock:
            return self._persist_internal()

    def _persist_internal(self) -> bool:
        """Internal persist without acquiring the lock.

        Called from within already-locked contexts (add_embeddings, persist).

        Returns:
            True if persistence succeeded, False otherwise.
        """
        try:
            os.makedirs(self._data_dir, exist_ok=True)

            # Write embeddings map
            with open(self._pkl_path, "wb") as f:
                pickle.dump(self._embeddings_map, f)

            # Write FAISS index
            faiss.write_index(self._index, self._index_path)

            return True
        except Exception as e:
            logger.error("Failed to persist embedding store: %s", e)
            # In-memory state is retained on failure
            return False

    def reload(self) -> None:
        """Reload state from disk files.

        Re-reads the embeddings map and FAISS index from disk,
        replacing the current in-memory state.
        """
        self._embeddings_map = {}
        self._index_to_face_id = []
        self._index = faiss.IndexFlatL2(EMBEDDING_DIM)
        self._load_from_disk()
