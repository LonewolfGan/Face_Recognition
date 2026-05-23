"""Unit tests for the Health Blueprint.

Tests the GET /health endpoint for both healthy and unhealthy states.
Uses a minimal Flask app with only the health blueprint registered
to avoid importing heavy dependencies (deepface, tensorflow, faiss).
"""

import os
import sqlite3
import sys
import tempfile

import pytest
from flask import Flask

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.routes.health import health_bp


def _create_test_app(db_path: str) -> Flask:
    """Create a minimal Flask app with only the health blueprint."""
    app = Flask(__name__)
    app.config["DATABASE_PATH"] = db_path
    app.config["TESTING"] = True
    app.register_blueprint(health_bp)
    return app


def _init_db(db_path: str) -> None:
    """Create a minimal SQLite database at the given path."""
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)")
    conn.commit()
    conn.close()


@pytest.fixture
def healthy_app():
    """Create an app with a valid, reachable database."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "test.db")
        _init_db(db_path)
        app = _create_test_app(db_path)
        yield app


@pytest.fixture
def healthy_client(healthy_app):
    """Test client with a healthy database."""
    return healthy_app.test_client()


@pytest.fixture
def unhealthy_app():
    """Create an app with an invalid/unreachable database path."""
    # Point to a non-existent directory that can't be created
    app = _create_test_app("/nonexistent/path/to/db.sqlite")
    return app


@pytest.fixture
def unhealthy_client(unhealthy_app):
    """Test client with an unreachable database."""
    return unhealthy_app.test_client()


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200_when_db_healthy(self, healthy_client):
        """Health check returns 200 with healthy status when DB is reachable."""
        response = healthy_client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data == {"status": "healthy"}

    def test_health_returns_json_content_type(self, healthy_client):
        """Health check response has JSON content type."""
        response = healthy_client.get("/health")
        assert "application/json" in response.content_type

    def test_health_returns_503_when_db_unreachable(self, unhealthy_client):
        """Health check returns 503 with unhealthy status when DB is unreachable."""
        response = unhealthy_client.get("/health")
        assert response.status_code == 503
        data = response.get_json()
        assert data == {"status": "unhealthy", "reason": "database_unavailable"}

    def test_health_no_auth_required(self, healthy_client):
        """Health check does not require authentication headers."""
        # No Authorization header provided
        response = healthy_client.get("/health")
        assert response.status_code == 200

    def test_health_returns_503_when_no_database_path(self):
        """Health check returns 503 when DATABASE_PATH is empty."""
        app = _create_test_app("")
        client = app.test_client()
        response = client.get("/health")
        assert response.status_code == 503
        data = response.get_json()
        assert data["status"] == "unhealthy"
        assert data["reason"] == "database_unavailable"
