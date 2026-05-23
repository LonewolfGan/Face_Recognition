"""Quick verification test for backend/app/auth.py module."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

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


def test_password_hashing():
    """Test bcrypt password hashing and verification."""
    pw_hash = hash_password("testpassword123")
    assert pw_hash.startswith("$2b$12$"), f"Expected bcrypt hash, got: {pw_hash[:10]}"
    assert verify_password("testpassword123", pw_hash)
    assert not verify_password("wrongpassword", pw_hash)
    assert not verify_password("", pw_hash)
    # Edge case: invalid hash
    assert not verify_password("test", "not-a-valid-hash")
    print("  Password hashing: OK")


def test_jwt_tokens():
    """Test JWT access token creation and verification."""
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = "test-secret-key-for-verification"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 900

    with app.app_context():
        token = generate_access_token("user-123")
        assert isinstance(token, str)
        assert len(token) > 0

        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert "iat" in payload
        assert "exp" in payload
        assert payload["exp"] - payload["iat"] == 900

        # Invalid token
        assert verify_access_token("invalid.token.here") is None

    print("  JWT tokens: OK")


def test_refresh_tokens():
    """Test refresh token generation and hashing."""
    rt = generate_refresh_token()
    assert isinstance(rt, str)
    assert len(rt) == 64  # 32 bytes hex = 64 chars

    rt_hash = hash_refresh_token(rt)
    assert isinstance(rt_hash, str)
    assert len(rt_hash) == 64  # SHA-256 hex = 64 chars

    # Different tokens produce different hashes
    rt2 = generate_refresh_token()
    assert rt != rt2
    assert hash_refresh_token(rt) != hash_refresh_token(rt2)

    print("  Refresh tokens: OK")


def test_token_expiry():
    """Test refresh token expiry checking."""
    assert not is_refresh_token_expired("2099-01-01T00:00:00")
    assert is_refresh_token_expired("2020-01-01T00:00:00")
    assert is_refresh_token_expired("2000-12-31T23:59:59")

    print("  Token expiry: OK")


def test_refresh_token_expiry_generation():
    """Test that get_refresh_token_expiry returns a future timestamp."""
    app = Flask(__name__)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 604800

    with app.app_context():
        expiry = get_refresh_token_expiry()
        assert isinstance(expiry, str)
        assert not is_refresh_token_expired(expiry)

    print("  Refresh token expiry generation: OK")


def test_decorator_alias():
    """Test that require_auth is an alias for token_required."""
    assert token_required is require_auth

    print("  Decorator alias: OK")


def test_token_required_decorator():
    """Test the token_required decorator behavior."""
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = "test-secret-key"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 900

    @app.route("/protected")
    @token_required
    def protected_route():
        from flask import g, jsonify
        return jsonify({"user_id": g.user_id})

    with app.test_client() as client:
        # No token -> 401
        resp = client.get("/protected")
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["error"] == "missing_token"

        # Invalid token -> 401
        resp = client.get("/protected", headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401
        assert resp.get_json()["error"] == "invalid_token"

        # Valid token -> 200
        with app.app_context():
            token = generate_access_token("user-456")
        resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.get_json()["user_id"] == "user-456"

    print("  token_required decorator: OK")


if __name__ == "__main__":
    print("Verifying backend/app/auth.py...")
    test_password_hashing()
    test_jwt_tokens()
    test_refresh_tokens()
    test_token_expiry()
    test_refresh_token_expiry_generation()
    test_decorator_alias()
    test_token_required_decorator()
    print("\nAll auth utility tests PASSED!")
