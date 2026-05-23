"""Unit tests for backend/app/auth.py module."""

import sqlite3
import time

import pytest
from flask import g, jsonify

from app import create_app
from app.auth import (
    generate_access_token as create_access_token,
    generate_refresh_token as create_refresh_token,
    hash_password,
    hash_refresh_token as hash_token,
    invalidate_all_user_tokens,
    rotate_refresh_token,
    store_refresh_token,
    token_required,
    validate_refresh_token,
    verify_password,
    verify_access_token as verify_token,
)


@pytest.fixture
def app():
    """Create a test application instance."""
    application = create_app("testing")
    return application


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Get a database connection within app context."""
    with app.app_context():
        db_path = app.config["DATABASE_PATH"]
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        # Create schema
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_hash TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                invalidated INTEGER DEFAULT 0
            )
        """)
        conn.commit()
        yield conn
        conn.close()


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password_returns_string(self):
        result = hash_password("mypassword123")
        assert isinstance(result, str)
        assert result.startswith("$2b$12$")

    def test_verify_password_correct(self):
        password = "securePassword!1"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_verify_password_invalid_hash(self):
        assert verify_password("password", "not_a_valid_hash") is False

    def test_verify_password_empty_hash(self):
        assert verify_password("password", "") is False

    def test_hash_password_different_salts(self):
        """Two hashes of the same password should differ (different salts)."""
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2
        # But both should verify
        assert verify_password("same_password", h1) is True
        assert verify_password("same_password", h2) is True


class TestAccessToken:
    """Tests for JWT access token creation and verification."""

    def test_create_access_token(self, app):
        with app.app_context():
            token = create_access_token("user-123")
            assert isinstance(token, str)
            assert len(token) > 0

    def test_verify_valid_token(self, app):
        with app.app_context():
            token = create_access_token("user-456")
            payload = verify_token(token)
            assert payload is not None
            assert payload["sub"] == "user-456"

    def test_verify_expired_token(self, app):
        with app.app_context():
            # Override expires to 0 seconds
            app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 0
            token = create_access_token("user-789")
            # Wait a moment for expiry
            time.sleep(1)
            payload = verify_token(token)
            assert payload is None

    def test_verify_invalid_token(self, app):
        with app.app_context():
            payload = verify_token("not.a.valid.token")
            assert payload is None

    def test_verify_tampered_token(self, app):
        with app.app_context():
            token = create_access_token("user-abc")
            # Tamper with the token
            tampered = token[:-5] + "XXXXX"
            payload = verify_token(tampered)
            assert payload is None


class TestRefreshToken:
    """Tests for refresh token generation."""

    def test_create_refresh_token_length(self):
        token = create_refresh_token()
        # 32 bytes = 64 hex chars
        assert len(token) == 64

    def test_create_refresh_token_uniqueness(self):
        tokens = {create_refresh_token() for _ in range(100)}
        assert len(tokens) == 100

    def test_hash_token(self):
        token = "test_token_value"
        hashed = hash_token(token)
        assert isinstance(hashed, str)
        assert len(hashed) == 64  # SHA-256 hex digest


class TestTokenRefreshAndInvalidation:
    """Tests for token refresh rotation and invalidation logic."""

    def test_store_and_validate_refresh_token(self, app, db):
        with app.app_context():
            token = create_refresh_token()
            store_refresh_token(db, "user-001", token)

            result = validate_refresh_token(db, token)
            assert result is not None
            assert result["user_id"] == "user-001"
            assert result["invalidated"] == 0

    def test_validate_nonexistent_token(self, app, db):
        with app.app_context():
            result = validate_refresh_token(db, "nonexistent_token")
            assert result is None

    def test_validate_invalidated_token_detects_reuse(self, app, db):
        with app.app_context():
            token = create_refresh_token()
            store_refresh_token(db, "user-002", token)

            # Manually invalidate
            token_hashed = hash_token(token)
            db.cursor().execute(
                "UPDATE refresh_tokens SET invalidated = 1 WHERE token_hash = ?",
                (token_hashed,),
            )
            db.commit()

            # Reuse detection: returns None and invalidates all user tokens
            result = validate_refresh_token(db, token)
            assert result is None

            # Verify all tokens for the user are now invalidated
            cursor = db.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND invalidated = 0",
                ("user-002",),
            )
            assert cursor.fetchone()[0] == 0

    def test_validate_expired_token(self, app, db):
        with app.app_context():
            token = create_refresh_token()
            token_hashed = hash_token(token)
            # Insert with past expiry
            db.cursor().execute(
                "INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (token_hashed, "user-003", "2020-01-01T00:00:00"),
            )
            db.commit()

            result = validate_refresh_token(db, token)
            assert result is None

    def test_rotate_refresh_token(self, app, db):
        with app.app_context():
            # Store initial token
            old_token = create_refresh_token()
            store_refresh_token(db, "user-004", old_token)

            # Get the record ID
            old_hash = hash_token(old_token)
            cursor = db.cursor()
            cursor.execute(
                "SELECT id FROM refresh_tokens WHERE token_hash = ?",
                (old_hash,),
            )
            old_id = cursor.fetchone()[0]

            # Rotate
            new_token = rotate_refresh_token(db, old_id, "user-004")
            assert new_token != old_token
            assert len(new_token) == 64

            # Old token should be invalidated
            cursor.execute(
                "SELECT invalidated FROM refresh_tokens WHERE token_hash = ?",
                (old_hash,),
            )
            assert cursor.fetchone()[0] == 1

            # New token should be valid
            result = validate_refresh_token(db, new_token)
            assert result is not None
            assert result["user_id"] == "user-004"

    def test_invalidate_all_user_tokens(self, app, db):
        with app.app_context():
            # Store multiple tokens
            for _ in range(3):
                token = create_refresh_token()
                store_refresh_token(db, "user-005", token)

            # Invalidate all
            invalidate_all_user_tokens(db, "user-005")

            # Check all are invalidated
            cursor = db.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND invalidated = 0",
                ("user-005",),
            )
            assert cursor.fetchone()[0] == 0


class TestTokenRequiredDecorator:
    """Tests for the token_required route protection decorator."""

    def test_missing_auth_header(self, app, client):
        @app.route("/test-protected")
        @token_required
        def protected():
            return jsonify({"user": g.user_id})

        response = client.get("/test-protected")
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "missing_token"

    def test_invalid_bearer_format(self, app, client):
        @app.route("/test-protected2")
        @token_required
        def protected2():
            return jsonify({"user": g.user_id})

        response = client.get(
            "/test-protected2", headers={"Authorization": "Basic abc123"}
        )
        assert response.status_code == 401

    def test_valid_token_sets_user_id(self, app, client):
        @app.route("/test-protected3")
        @token_required
        def protected3():
            return jsonify({"user": g.user_id})

        with app.app_context():
            token = create_access_token("user-test-decorator")

        response = client.get(
            "/test-protected3", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["user"] == "user-test-decorator"

    def test_expired_token(self, app, client):
        @app.route("/test-protected4")
        @token_required
        def protected4():
            return jsonify({"user": g.user_id})

        with app.app_context():
            app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 0
            token = create_access_token("user-expired")

        time.sleep(1)
        response = client.get(
            "/test-protected4", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "token_expired"
