"""Shared pytest fixtures for the backend test suite.

Provides test app, test client, temporary data directory, and database
path fixtures used across all test modules.
"""

import os
import sys
import shutil
import tempfile

import pytest
from hypothesis import settings

# Add backend directory to sys.path so that `from app import create_app` works
# regardless of where pytest is invoked from.
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Set required environment variables for tests
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-at-least-32-chars-long")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-flask-sessions")

# Hypothesis profiles
settings.register_profile("ci", max_examples=200)
settings.register_profile("dev", max_examples=100)
settings.load_profile("dev")


@pytest.fixture
def test_app(tmp_path):
    """Create a Flask application configured for testing.

    Uses create_app("testing") which provides:
    - In-memory SQLite database
    - Rate limiting disabled
    - CSRF protection disabled

    The DATA_DIR is pointed at a temporary directory so tests don't
    pollute the real data folder.
    """
    from app import create_app

    # Point DATA_DIR to a temp directory for isolation
    data_dir = str(tmp_path / "data")
    os.makedirs(data_dir, exist_ok=True)

    # Temporarily override DATA_DIR env var for this test
    old_data_dir = os.environ.get("DATA_DIR")
    os.environ["DATA_DIR"] = data_dir

    app = create_app("testing")
    app.config["DATA_DIR"] = data_dir

    yield app

    # Restore original DATA_DIR
    if old_data_dir is None:
        os.environ.pop("DATA_DIR", None)
    else:
        os.environ["DATA_DIR"] = old_data_dir


@pytest.fixture
def test_client(test_app):
    """Create a Flask test client for making HTTP requests.

    Uses the test_app fixture to provide a client bound to the
    testing-configured application.
    """
    return test_app.test_client()


@pytest.fixture
def temp_data_dir():
    """Create a temporary directory for data files.

    Yields the path to the temporary directory. The directory and all
    its contents are cleaned up after the test completes.
    """
    dirpath = tempfile.mkdtemp(prefix="facer_test_")
    yield dirpath
    shutil.rmtree(dirpath, ignore_errors=True)


@pytest.fixture
def db_path(test_app):
    """Return the DATABASE_PATH from the test app configuration.

    For the testing config this is typically ':memory:'.
    """
    return test_app.config["DATABASE_PATH"]


# Keep backward-compatible fixtures for existing tests that use 'app' and 'client'
@pytest.fixture
def app(test_app):
    """Backward-compatible alias for test_app."""
    return test_app


@pytest.fixture
def client(test_client):
    """Backward-compatible alias for test_client."""
    return test_client
