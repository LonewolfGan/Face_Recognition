"""Unit tests for backend/app/auth.py module."""

import sys
import os
import time
import sqlite3
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from flask import Flask

from app.auth import (
    hash_password,
    verify_password,
    generate_access_token,
    verify_access_token,
    generate_refresh_token,
    hash_refresh_token,
    get_refresh_token_expiry,
    is_refresh_token_expired,
    invalidate_refresh_token,
    invalidate_all_user_tokens,
    store_refresh_token,
    validate_refresh_token,
    rotate_refresh_token,
    token_required,
    require_auth,
)


@pytest.fixture
def app():
    """Create a minimal Flask app for testing."""
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = "test-secret-key-for-unit-testing"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 900
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 604800
    return app


@pytest.fixture
def db():
    """Create an in-memory SQLite database with refresh_tokens table."""
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            invalidated INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    return conn


# ---------------------------------------------------------------------------
# Password hashing tests
# ---------------------------------------------------------------------------


class TestPasswordHashing:
    def test_hash_password_returns_bcrypt_string(self):
        result = hash_password("mypassword")
        assert result.startswith("$2b$12$")

    def test_verify_password_correct(self):
        pw_hash = hash_password("testpassword123")
        assert verify_password("testpassword123", pw_hash) is True

    def test_verify_password_incorrect(self):
        pw_hash = hash_password("testpassword123")
        assert verify_password("wrongpassword", pw_hash) is False

    def test_verify_password_invalid_hash(self):
        assert verify_password("test", "not-a-valid-hash") is False

    def test_verify_password_empty_inputs(self):
        assert verify_password("", "") is False

    def test_different_passwords_produce_different_hashes(self):
        hash1 = hash_password("password1")
        hash2 = hash_password("password2")
        assert hash1 != hash2


# ---------------------------------------------------------------------------
# JWT access token tests
# ---------------------------------------------------------------------------


class TestAccessTokens:
    def test_generate_access_token(self, app):
        with app.app_context():
            token = generate_access_token("user-123")
            assert isinstance(token, str)
            assert len(token) > 0

    def test_verify_valid_token(self, app):
        with app.app_context():
            token = generate_access_token("user-456")
            payload = verify_access_token(token)
            assert payload is not None
            assert payload["sub"] == "user-456"
            assert "iat" in payload
            assert "exp" in payload

    def test_verify_invalid_token(self, app):
        with app.app_context():
            result = verify_access_token("invalid.token.string")
            assert result is None

    def test_verify_expired_token(self, app):
        import jwt as pyjwt

        with app.app_context():
            expired_payload = {
                "sub": "user-123",
                "iat": int(time.time()) - 1000,
                "exp": int(time.time()) - 500,
            }
            expired_token = pyjwt.encode(
                expired_payload, "test-secret-key-for-unit-testing", algorithm="HS256"
            )
            result = verify_access_token(expired_token)
            assert result is None

    def test_verify_wrong_secret(self, app):
        import jwt as pyjwt

        with app.app_context():
            payload = {
                "sub": "user-123",
                "iat": int(time.time()),
                "exp": int(time.time()) + 900,
            }
            token = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")
            result = verify_access_token(token)
            assert result is None


# ---------------------------------------------------------------------------
# Refresh token tests
# ---------------------------------------------------------------------------


class TestRefreshTokens:
    def test_generate_refresh_token_length(self):
        token = generate_refresh_token()
        assert len(token) == 64

    def test_generate_refresh_token_uniqueness(self):
        tokens = {generate_refresh_token() for _ in range(100)}
        assert len(tokens) == 100

    def test_hash_refresh_token(self):
        token = "abc123"
        hashed = hash_refresh_token(token)
        assert len(hashed) == 64  # SHA-256 hex digest

    def test_is_refresh_token_expired_future(self):
        assert is_refresh_token_expired("2099-12-31T23:59:59") is False

    def test_is_refresh_token_expired_past(self):
        assert is_refresh_token_expired("2020-01-01T00:00:00") is True

    def test_get_refresh_token_expiry(self, app):
        with app.app_context():
            expiry = get_refresh_token_expiry()
            assert isinstance(expiry, str)
            # Should be in the future
            from datetime import datetime

            expiry_dt = datetime.fromisoformat(expiry)
            assert expiry_dt > datetime.utcnow()


# ---------------------------------------------------------------------------
# Token storage and validation tests
# ---------------------------------------------------------------------------


class TestTokenStorage:
    def test_store_refresh_token(self, app, db):
        with app.app_context():
            store_refresh_token(db, "user-1", "my-refresh-token")
            cursor = db.cursor()
            cursor.execute("SELECT * FROM refresh_tokens WHERE user_id = ?", ("user-1",))
            row = cursor.fetchone()
            assert row is not None

    def test_validate_refresh_token_valid(self, app, db):
        with app.app_context():
            token = generate_refresh_token()
            store_refresh_token(db, "user-1", token)
            record = validate_refresh_token(db, token)
            assert record is not None
            assert record["user_id"] == "user-1"
            assert record["invalidated"] == 0

    def test_validate_refresh_token_invalid(self, app, db):
        with app.app_context():
            result = validate_refresh_token(db, "nonexistent-token")
            assert result is None

    def test_validate_refresh_token_reuse_detection(self, app, db):
        with app.app_context():
            token = generate_refresh_token()
            store_refresh_token(db, "user-1", token)

            # Manually invalidate the token (simulating it was already used)
            token_hash = hash_refresh_token(token)
            db.execute(
                "UPDATE refresh_tokens SET invalidated = 1 WHERE token_hash = ?",
                (token_hash,),
            )
            db.commit()

            # Attempting to validate should return None and invalidate all user tokens
            result = validate_refresh_token(db, token)
            assert result is None

    def test_invalidate_all_user_tokens(self, app, db):
        with app.app_context():
            store_refresh_token(db, "user-1", "token-1")
            store_refresh_token(db, "user-1", "token-2")
            store_refresh_token(db, "user-2", "token-3")

            invalidate_all_user_tokens(db, "user-1")

            cursor = db.cursor()
            cursor.execute(
                "SELECT invalidated FROM refresh_tokens WHERE user_id = ?", ("user-1",)
            )
            for row in cursor.fetchall():
                assert row[0] == 1

            # user-2 tokens should be unaffected
            cursor.execute(
                "SELECT invalidated FROM refresh_tokens WHERE user_id = ?", ("user-2",)
            )
            for row in cursor.fetchall():
                assert row[0] == 0

    def test_rotate_refresh_token(self, app, db):
        with app.app_context():
            # Store initial token
            old_token = generate_refresh_token()
            store_refresh_token(db, "user-1", old_token)

            # Get the old token's ID
            cursor = db.cursor()
            cursor.execute("SELECT id FROM refresh_tokens WHERE user_id = ?", ("user-1",))
            old_id = cursor.fetchone()[0]

            # Rotate
            new_token = rotate_refresh_token(db, old_id, "user-1")
            assert new_token != old_token
            assert len(new_token) == 64

            # Old token should be invalidated
            cursor.execute("SELECT invalidated FROM refresh_tokens WHERE id = ?", (old_id,))
            assert cursor.fetchone()[0] == 1

            # New token should be valid
            record = validate_refresh_token(db, new_token)
            assert record is not None
            assert record["user_id"] == "user-1"


# ---------------------------------------------------------------------------
# token_required decorator tests
# ---------------------------------------------------------------------------


class TestTokenRequiredDecorator:
    def test_missing_auth_header(self, app):
        @app.route("/protected")
        @token_required
        def protected():
            return "ok"

        with app.test_client() as client:
            resp = client.get("/protected")
            assert resp.status_code == 401
            data = resp.get_json()
            assert data["error"] == "missing_token"

    def test_invalid_bearer_format(self, app):
        @app.route("/protected")
        @token_required
        def protected():
            return "ok"

        with app.test_client() as client:
            resp = client.get("/protected", headers={"Authorization": "Basic abc"})
            assert resp.status_code == 401
            data = resp.get_json()
            assert data["error"] == "missing_token"

    def test_valid_token_sets_user_id(self, app):
        @app.route("/protected")
        @token_required
        def protected():
            from flask import g

            return {"user_id": g.user_id}

        with app.app_context():
            token = generate_access_token("user-789")

        with app.test_client() as client:
            resp = client.get(
                "/protected", headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["user_id"] == "user-789"

    def test_expired_token(self, app):
        import jwt as pyjwt

        @app.route("/protected2")
        @token_required
        def protected2():
            return "ok"

        expired_payload = {
            "sub": "user-123",
            "iat": int(time.time()) - 1000,
            "exp": int(time.time()) - 500,
        }
        expired_token = pyjwt.encode(
            expired_payload, "test-secret-key-for-unit-testing", algorithm="HS256"
        )

        with app.test_client() as client:
            resp = client.get(
                "/protected2", headers={"Authorization": f"Bearer {expired_token}"}
            )
            assert resp.status_code == 401
            data = resp.get_json()
            assert data["error"] == "token_expired"

    def test_no_secret_key_returns_500(self):
        app = Flask(__name__)
        app.config["JWT_SECRET_KEY"] = ""

        @app.route("/protected")
        @token_required
        def protected():
            return "ok"

        with app.test_client() as client:
            resp = client.get(
                "/protected", headers={"Authorization": "Bearer sometoken"}
            )
            assert resp.status_code == 500
            data = resp.get_json()
            assert data["error"] == "internal_error"

    def test_require_auth_alias(self):
        assert require_auth is token_required


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
