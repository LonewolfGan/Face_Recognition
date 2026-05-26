"""Authentication utilities for JWT token management and password hashing.

Provides:
- JWT access token creation and verification
- Refresh token generation, rotation, and invalidation
- bcrypt password hashing and verification
- A `token_required` decorator for protecting Flask routes
"""

import hashlib
import functools
import secrets
import time
from datetime import datetime, timedelta

import bcrypt
import jwt
from flask import current_app, g, jsonify, request


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with cost factor 12.

    Args:
        password: The plaintext password to hash.

    Returns:
        The bcrypt hash as a UTF-8 string.
    """
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Args:
        password: The plaintext password to check.
        password_hash: The stored bcrypt hash.

    Returns:
        True if the password matches, False otherwise.
    """
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------


def generate_access_token(user_id: str) -> str:
    """Generate a JWT access token with sub, iat, and exp claims.

    The token is signed with HS256 using the app's JWT_SECRET_KEY.
    Expiry is determined by JWT_ACCESS_TOKEN_EXPIRES (seconds).

    Args:
        user_id: The user identifier to embed in the token's 'sub' claim.

    Returns:
        The encoded JWT string.
    """
    secret_key = current_app.config["JWT_SECRET_KEY"]
    expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 900)

    now = int(time.time())
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + expires,
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


def verify_access_token(token: str) -> dict | None:
    """Validate a JWT access token's signature and expiry.

    Args:
        token: The encoded JWT string.

    Returns:
        The decoded payload dict if valid, or None if expired/invalid.
    """
    secret_key = current_app.config["JWT_SECRET_KEY"]
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------


def generate_refresh_token() -> str:
    """Generate a cryptographically random refresh token.

    Returns:
        A 64-character hex string (32 bytes / 256 bits of entropy).
    """
    return secrets.token_hex(32)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token using SHA-256 for secure storage.

    Args:
        token: The raw refresh token string.

    Returns:
        The hex-encoded SHA-256 hash.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def get_refresh_token_expiry() -> str:
    """Calculate the expiry timestamp for a new refresh token.

    Returns:
        ISO-format timestamp string for the expiry time.
    """
    expires_seconds = current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", 604800)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_seconds)
    return expires_at.isoformat()


def is_refresh_token_expired(expires_at_str: str) -> bool:
    """Check whether a refresh token has expired.

    Args:
        expires_at_str: ISO-format expiry timestamp from the database.

    Returns:
        True if the token is expired, False otherwise.
    """
    expires_at = datetime.fromisoformat(expires_at_str)
    return datetime.utcnow() > expires_at


def invalidate_refresh_token(db, token_id: int) -> None:
    """Mark a single refresh token as invalidated.

    Args:
        db: SQLite database connection.
        token_id: The primary key of the refresh_tokens row.
    """
    cursor = db.cursor()
    cursor.execute(
        "UPDATE refresh_tokens SET invalidated = 1 WHERE id = ?",
        (token_id,),
    )
    db.commit()


def invalidate_all_user_tokens(db, user_id: str) -> None:
    """Invalidate all refresh tokens for a given user.

    Used during logout or when token reuse is detected (security violation).

    Args:
        db: SQLite database connection.
        user_id: The user whose tokens should be invalidated.
    """
    cursor = db.cursor()
    cursor.execute(
        "UPDATE refresh_tokens SET invalidated = 1 WHERE user_id = ?",
        (user_id,),
    )
    db.commit()


def store_refresh_token(db, user_id: str, token: str) -> None:
    """Hash and store a refresh token in the database.

    Args:
        db: SQLite database connection.
        user_id: The user this token belongs to.
        token: The raw refresh token to hash and store.
    """
    token_hash = hash_refresh_token(token)
    expires_at = get_refresh_token_expiry()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (token_hash, user_id, expires_at),
    )
    db.commit()


def validate_refresh_token(db, token: str) -> dict | None:
    """Look up and validate a refresh token from the database.

    Checks that the token exists, is not invalidated, and has not expired.

    Args:
        db: SQLite database connection.
        token: The raw refresh token string.

    Returns:
        The token record dict if valid, or None if invalid/expired/reused.
        If token reuse is detected (already invalidated), all tokens for
        that user are invalidated and None is returned.
    """
    token_hash = hash_refresh_token(token)

    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM refresh_tokens WHERE token_hash = ?",
        (token_hash,),
    )
    row = cursor.fetchone()

    if not row:
        return None

    record = dict(row)

    # Token reuse detection: if already invalidated, revoke all user tokens
    if record["invalidated"] == 1:
        invalidate_all_user_tokens(db, record["user_id"])
        return None

    # Check expiry
    if is_refresh_token_expired(record["expires_at"]):
        invalidate_refresh_token(db, record["id"])
        return None

    return record


def rotate_refresh_token(db, old_token_id: int, user_id: str) -> str:
    """Rotate a refresh token: invalidate the old one and issue a new one.

    Args:
        db: SQLite database connection.
        old_token_id: The primary key of the old token to invalidate.
        user_id: The user to issue the new token for.

    Returns:
        The new raw refresh token string.
    """
    # Invalidate old token
    invalidate_refresh_token(db, old_token_id)

    # Issue new token
    new_token = generate_refresh_token()
    store_refresh_token(db, user_id, new_token)

    return new_token


# ---------------------------------------------------------------------------
# Route protection decorator
# ---------------------------------------------------------------------------


def token_required(f):
    """Flask route decorator that requires a valid JWT access token.

    Extracts the token from the Authorization header (Bearer scheme),
    verifies it, and sets `g.user_id` to the token's subject claim.

    Returns 401 with specific error codes for:
    - Missing token ('missing_token')
    - Expired token ('token_expired')
    - Invalid token ('invalid_token')
    Returns 500 if JWT_SECRET_KEY is not configured.
    """

    @functools.wraps(f)
    def decorated(*args, **kwargs):
        secret_key = current_app.config.get("JWT_SECRET_KEY")
        if not secret_key:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": "internal_error",
                        "message": "Internal authentication error",
                    }
                ),
                500,
            )

        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": "missing_token",
                        "message": "Authentication required",
                    }
                ),
                401,
            )

        token = auth_header[7:]  # Remove 'Bearer ' prefix

        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            g.user_id = payload["sub"]
        except jwt.ExpiredSignatureError:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": "token_expired",
                        "message": "Token has expired, please refresh",
                    }
                ),
                401,
            )
        except jwt.InvalidTokenError:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": "invalid_token",
                        "message": "Invalid authentication token",
                    }
                ),
                401,
            )

        return f(*args, **kwargs)

    return decorated


# Backward-compatible alias
require_auth = token_required
