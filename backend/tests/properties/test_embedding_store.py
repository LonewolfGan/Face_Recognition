# Feature: project-restructure, Property 2: Concurrent write consistency
"""Property-based tests for EmbeddingStore concurrent write consistency.

Validates: Requirements 1.10
"""

import tempfile
import threading

import numpy as np
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

from app.services.embedding_service import EMBEDDING_DIM, EmbeddingStore


# --- Strategies ---


@st.composite
def concurrent_face_entries(draw):
    """Generate a list of 2-5 distinct face entries for concurrent writes.

    Each face_id gets embeddings based on a unique base direction in the
    512-dimensional space, with small perturbations. This ensures that
    searching with any of a face's embeddings will return that face_id
    (not a different one), which is necessary for verifying searchability.
    """
    num_entries = draw(st.integers(min_value=2, max_value=5))

    # Generate unique face_ids
    face_ids = draw(
        st.lists(
            st.text(
                alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_-"),
                min_size=1,
                max_size=10,
            ),
            min_size=num_entries,
            max_size=num_entries,
            unique=True,
        )
    )

    # Use a seed to generate well-separated embeddings deterministically
    seed = draw(st.integers(min_value=0, max_value=2**32 - 1))
    rng = np.random.default_rng(seed)

    entries = []
    for i, face_id in enumerate(face_ids):
        num_embeddings = draw(st.integers(min_value=1, max_value=3))

        # Create a base vector that is distinct per face_id index.
        # Use a one-hot-like approach: set a block of dimensions high for this face.
        base = np.zeros(EMBEDDING_DIM, dtype=np.float64)
        block_size = EMBEDDING_DIM // num_entries
        start = i * block_size
        end = start + block_size
        base[start:end] = 1.0

        # Generate embeddings as small perturbations of the base
        embeddings = []
        for _ in range(num_embeddings):
            noise = rng.uniform(-0.01, 0.01, size=EMBEDDING_DIM)
            emb = (base + noise).tolist()
            embeddings.append(emb)

        entries.append((face_id, embeddings))

    return entries


# --- Property Test ---


class TestConcurrentWriteConsistency:
    """Property 2: Concurrent write consistency.

    *For any* set of concurrent embedding additions (multiple face_ids with
    multiple embeddings each), after all writes complete, the FAISS index total
    count should equal the sum of all individual embeddings added, and each
    face_id should be retrievable via search.

    **Validates: Requirements 1.10**
    """

    @given(entries=concurrent_face_entries())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_concurrent_writes_preserve_total_count_and_searchability(self, entries):
        """After concurrent writes, index count equals total embeddings and all face_ids are searchable."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = EmbeddingStore(tmp_dir)

            # Perform concurrent writes using threads
            threads = []
            for face_id, embeddings in entries:
                t = threading.Thread(
                    target=store.add_embeddings,
                    args=(face_id, embeddings),
                )
                threads.append(t)

            # Start all threads
            for t in threads:
                t.start()

            # Wait for all threads to complete
            for t in threads:
                t.join()

            # Calculate expected total embeddings
            expected_total = sum(len(embs) for _, embs in entries)

            # Verify 1: FAISS index total count equals sum of all embeddings added
            assert store._index.ntotal == expected_total, (
                f"Expected {expected_total} embeddings in index, "
                f"got {store._index.ntotal}"
            )

            # Verify 2: Each face_id is searchable (returns the correct face_id)
            for face_id, embeddings in entries:
                # Use the first embedding of this face_id as the query
                query_embedding = embeddings[0]
                result_face_id, distance = store.search(query_embedding, threshold=float("inf"))
                assert result_face_id == face_id, (
                    f"Expected face_id '{face_id}' to be searchable, "
                    f"but search returned '{result_face_id}' with distance {distance}"
                )
