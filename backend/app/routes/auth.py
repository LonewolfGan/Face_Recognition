"""Auth Blueprint — handles registration, login, token refresh, logout, and password change.

Routes:
    POST /register       — Register a new user with face images and password
    POST /login          — Login via face recognition or password
    POST /refresh-token  — Rotate refresh token and issue new access token
    POST /logout         — Invalidate all refresh tokens for the user
    POST /change_password — Change the authenticated user's password
"""

import sqlite3
import logging
import datetime

from flask import Blueprint, current_app, g, jsonify, make_response, request

from ..auth import (
    generate_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    invalidate_all_user_tokens,
    invalidate_refresh_token,
    rotate_refresh_token,
    store_refresh_token,
    token_required,
    validate_refresh_token,
    verify_password,
)
from ..validators import (
    REGISTER_SCHEMA,
    LOGIN_SCHEMA,
    sanitize_string,
    validate_password_strength,
    validate_request,
)
from ..models.user import create_user, get_user_by_face_id, get_user_by_id

auth_bp = Blueprint("auth", __name__)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_db() -> sqlite3.Connection:
    """Get or create a database connection for the current request context."""
    db = getattr(g, "_database", None)
    if db is None:
        db_path = current_app.config["DATABASE_PATH"]
        db = g._database = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
    return db


def _error_response(status_code: int, error_code: str, message):
    """Return a consistent error JSON structure."""
    return jsonify({
        "status": "error",
        "error": error_code,
        "message": message,
    }), status_code


def _log_auth_failure(failure_type: str, endpoint: str) -> None:
    """Log authentication failures with client IP, endpoint, and timestamp."""
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    logger.warning(
        "Auth failure: type=%s, ip=%s, endpoint=%s, timestamp=%s",
        failure_type,
        client_ip,
        endpoint,
        datetime.datetime.utcnow().isoformat(),
    )


def _set_refresh_cookie(response, refresh_token: str):
    """Set the refresh_token as an httpOnly secure cookie on the response."""
    import os
    is_prod = os.getenv("FLASK_ENV", "development") == "production"
    response.set_cookie(
        "refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="Lax",
        max_age=604800,
        path="/",
    )
    return response


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user with face images and password."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, REGISTER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        # Validate password strength
        password = data.get("password")
        pw_valid, pw_msg = validate_password_strength(password)
        if not pw_valid:
            return _error_response(400, "validation_error", pw_msg)

        # Sanitize name
        name = sanitize_string(data["name"])

        # Process face images via FaceService (direct function call, no HTTP)
        face_service = current_app.config.get("FACE_SERVICE")
        if face_service is None:
            # Fallback: try to get from app attribute
            face_service = getattr(current_app, "face_service", None)

        if face_service is None:
            logger.error("FACE_SERVICE is None in /register — embedding_store: %s, config FACE_SERVICE: %s",
                         getattr(current_app, 'embedding_store', 'MISSING'),
                         current_app.config.get('FACE_SERVICE', 'MISSING'))
            return _error_response(500, "internal_error", "Face service not available")

        try:
            face_id, _ = face_service.add_face(name, data["images"])
        except Exception as e:
            logger.exception("face_service.add_face failed: %s", str(e))
            return _error_response(400, "registration_failed", "Échec de l'enregistrement du visage")

        # Create user in database with password hash
        password_hash = hash_password(password)
        db = _get_db()
        user_id = create_user(db, name, face_id, password_hash=password_hash)

        return jsonify({
            "status": "success",
            "message": f"Utilisateur {name} enregistré avec succès",
            "user_id": user_id,
            "face_id": face_id,
        })

    except Exception as e:
        logger.exception("Unhandled error in /register: %s", str(e))
        return _error_response(500, "internal_error", str(e))


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login via face recognition or password."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, LOGIN_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        # Password-based login
        if data.get("password"):
            db = _get_db()
            cursor = db.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE password_hash IS NOT NULL AND password_hash != ''"
            )
            users = cursor.fetchall()

            authenticated_user = None
            for user_row in users:
                user_dict = dict(user_row)
                if user_dict.get("password_hash") and verify_password(
                    data["password"], user_dict["password_hash"]
                ):
                    authenticated_user = user_dict
                    break

            if not authenticated_user:
                _log_auth_failure("invalid_credentials", "/login")
                return _error_response(401, "invalid_credentials", "Invalid credentials")

            # Generate tokens
            access_token = generate_access_token(authenticated_user["user_id"])
            refresh_token = generate_refresh_token()

            # Store hashed refresh token in DB
            store_refresh_token(db, authenticated_user["user_id"], refresh_token)

            response = make_response(jsonify({
                "status": "success",
                "message": "Connexion réussie par mot de passe",
                "access_token": access_token,
                "user": {
                    "user_id": authenticated_user["user_id"],
                    "name": authenticated_user["name"],
                    "face_id": authenticated_user["face_id"],
                },
            }))
            _set_refresh_cookie(response, refresh_token)
            return response

        # Face recognition-based login
        if not data.get("image"):
            return _error_response(400, "validation_error", "Image ou mot de passe requis")

        # Use FaceService for recognition (direct function call, no HTTP)
        face_service = current_app.config.get("FACE_SERVICE")
        if face_service is None:
            face_service = getattr(current_app, "face_service", None)

        if face_service is None:
            return _error_response(500, "internal_error", "Face service not available")

        try:
            face_id, distance = face_service.recognize(data["image"])
        except Exception as e:
            _log_auth_failure("face_recognition_failed", "/login")
            err_msg = str(e)
            if "no_face_in_image" in err_msg:
                return _error_response(401, "no_face_detected", "Aucun visage détecté dans l'image. Placez votre visage face à la caméra.")
            return _error_response(401, "invalid_credentials", "Visage non reconnu")

        # Get user by face_id
        db = _get_db()
        user = get_user_by_face_id(db, face_id)

        if not user:
            _log_auth_failure("user_not_found", "/login")
            return _error_response(401, "invalid_credentials", "Invalid credentials")

        # Generate tokens
        access_token = generate_access_token(user["user_id"])
        refresh_token = generate_refresh_token()

        # Store hashed refresh token in DB
        store_refresh_token(db, user["user_id"], refresh_token)

        response = make_response(jsonify({
            "status": "success",
            "message": "Connexion réussie",
            "access_token": access_token,
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "face_id": user["face_id"],
            },
        }))
        _set_refresh_cookie(response, refresh_token)
        return response

    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@auth_bp.route("/refresh-token", methods=["POST"])
def refresh_token_endpoint():
    """Validate cookie token, rotate (invalidate old + issue new), detect reuse."""
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            _log_auth_failure("missing_refresh_token", "/refresh-token")
            return _error_response(401, "invalid_refresh", "Re-authentication required")

        db = _get_db()

        # Validate the refresh token (handles reuse detection and expiry)
        token_record = validate_refresh_token(db, refresh_token)

        if not token_record:
            _log_auth_failure("invalid_refresh_token", "/refresh-token")
            return _error_response(401, "invalid_refresh", "Re-authentication required")

        # Rotate: invalidate old token and issue new one
        user_id = token_record["user_id"]
        new_refresh_token = rotate_refresh_token(db, token_record["id"], user_id)

        # Issue new access token
        new_access_token = generate_access_token(user_id)

        response = make_response(jsonify({
            "status": "success",
            "access_token": new_access_token,
        }))
        _set_refresh_cookie(response, new_refresh_token)
        return response

    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    """Invalidate all refresh tokens for the authenticated user."""
    try:
        db = _get_db()
        invalidate_all_user_tokens(db, g.user_id)

        response = make_response(jsonify({
            "status": "success",
            "message": "Logged out successfully",
        }))
        # Clear the refresh token cookie
        response.set_cookie(
            "refresh_token",
            value="",
            httponly=True,
            secure=True,
            samesite="Strict",
            max_age=0,
        )
        return response

    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@auth_bp.route("/change_password", methods=["POST"])
@token_required
def change_password():
    """Change the authenticated user's password."""
    try:
        data = request.json
        if not data or "password" not in data:
            return _error_response(400, "validation_error", "Password is required")

        # Validate new password strength
        pw_valid, pw_msg = validate_password_strength(data["password"])
        if not pw_valid:
            return _error_response(400, "validation_error", pw_msg)

        # Hash and store new password
        new_hash = hash_password(data["password"])
        db = _get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE user_id = ?",
            (new_hash, g.user_id),
        )
        db.commit()

        if cursor.rowcount == 0:
            return _error_response(404, "not_found", "User not found")

        return jsonify({
            "status": "success",
            "message": "Mot de passe mis à jour avec succès",
        })

    except Exception as e:
        return _error_response(500, "internal_error", str(e))
