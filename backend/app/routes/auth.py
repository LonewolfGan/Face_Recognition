"""Auth Blueprint — registration, login, token refresh, logout, password change."""

import logging
import datetime

from flask import Blueprint, current_app, g, jsonify, make_response, request

from ..auth import (
    generate_access_token,
    generate_refresh_token,
    hash_password,
    invalidate_all_user_tokens,
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
from ..models.user import create_user, delete_user, get_user_by_face_id
from ..services.face_service import FaceNotFoundError, FaceProcessingError
from ..db import open_connection

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


def _get_db():
    """Get or create a request-scoped database connection."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = open_connection(current_app.config)
    return db


def _error_response(status_code: int, error_code: str, message):
    return jsonify({"status": "error", "error": error_code, "message": message}), status_code


def _log_auth_failure(failure_type: str, endpoint: str) -> None:
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
    """Set the refresh_token as an httpOnly secure cookie.

    Uses SameSite=None in production for cross-origin (Vercel → Render).
    Uses SameSite=Lax in development (same-origin via Vite proxy).
    """
    import os
    is_prod = os.getenv("FLASK_ENV", "development") == "production"
    response.set_cookie(
        "refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="None" if is_prod else "Lax",
        max_age=604800,
        path="/",
    )
    return response


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        valid, errors = validate_request(data, REGISTER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        password = data.get("password")
        pw_valid, pw_msg = validate_password_strength(password)
        if not pw_valid:
            return _error_response(400, "validation_error", pw_msg)

        name = sanitize_string(data["name"])

        face_service = current_app.config.get("FACE_SERVICE") or getattr(current_app, "face_service", None)
        if face_service is None:
            return _error_response(500, "internal_error", "Face service not available")

        try:
            existing_face_id, _ = face_service.recognize_best(data["images"])
            if existing_face_id:
                return _error_response(409, "face_already_registered",
                    "Un compte avec ce visage existe déjà. Connectez-vous plutôt.")
        except (FaceNotFoundError, FaceProcessingError):
            pass

        try:
            face_id, _ = face_service.add_face(name, data["images"])
        except Exception as e:
            logger.exception("face_service.add_face failed: %s", str(e))
            return _error_response(400, "registration_failed", "Échec de l'enregistrement du visage")

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
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        valid, errors = validate_request(data, LOGIN_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        if data.get("password"):
            db = _get_db()
            cursor = db.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE password_hash IS NOT NULL AND password_hash != ''"
            )
            users = cursor.fetchall()

            authenticated_user = None
            for user_dict in users:
                if user_dict.get("password_hash") and verify_password(
                    data["password"], user_dict["password_hash"]
                ):
                    authenticated_user = user_dict
                    break

            if not authenticated_user:
                _log_auth_failure("invalid_credentials", "/login")
                return _error_response(401, "invalid_credentials", "Invalid credentials")

            access_token = generate_access_token(authenticated_user["user_id"])
            refresh_token = generate_refresh_token()
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

        images_list = data.get("images")
        single_image = data.get("image")

        if not images_list and not single_image:
            return _error_response(400, "validation_error", "Image ou mot de passe requis")

        images_to_try = images_list if images_list else [single_image]

        face_service = current_app.config.get("FACE_SERVICE") or getattr(current_app, "face_service", None)
        if face_service is None:
            return _error_response(500, "internal_error", "Face service not available")

        try:
            face_id, distance = face_service.recognize_best(images_to_try)
        except Exception as e:
            _log_auth_failure("face_recognition_failed", "/login")
            err_msg = str(e)
            if "no_face_in_image" in err_msg:
                return _error_response(401, "no_face_detected",
                    "Aucun visage détecté dans l'image. Placez votre visage face à la caméra.")
            return _error_response(401, "invalid_credentials", "Visage non reconnu")

        db = _get_db()
        user = get_user_by_face_id(db, face_id)
        if not user:
            _log_auth_failure("user_not_found", "/login")
            return _error_response(401, "invalid_credentials", "Invalid credentials")

        access_token = generate_access_token(user["user_id"])
        refresh_token = generate_refresh_token()
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
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/refresh-token", methods=["POST"])
def refresh_token_endpoint():
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            _log_auth_failure("missing_refresh_token", "/refresh-token")
            return _error_response(401, "invalid_refresh", "Re-authentication required")

        db = _get_db()
        token_record = validate_refresh_token(db, refresh_token)

        if not token_record:
            _log_auth_failure("invalid_refresh_token", "/refresh-token")
            return _error_response(401, "invalid_refresh", "Re-authentication required")

        user_id = token_record["user_id"]
        new_refresh_token = rotate_refresh_token(db, token_record["id"], user_id)
        new_access_token = generate_access_token(user_id)

        response = make_response(jsonify({
            "status": "success",
            "access_token": new_access_token,
        }))
        _set_refresh_cookie(response, new_refresh_token)
        return response

    except Exception as e:
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    try:
        db = _get_db()
        invalidate_all_user_tokens(db, g.user_id)

        response = make_response(jsonify({"status": "success", "message": "Logged out successfully"}))
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
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile():
    try:
        db = _get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT user_id, name, avatar FROM users WHERE user_id = ?",
            (g.user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return _error_response(404, "not_found", "User not found")
        return jsonify({"status": "success", "user": row})
    except Exception as e:
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/profile", methods=["PATCH"])
@token_required
def update_profile():
    try:
        data = request.json or {}
        name = sanitize_string(data.get("name", "").strip())
        avatar = data.get("avatar")

        if not name:
            return _error_response(400, "validation_error", "Name is required")
        if len(name) > 100:
            return _error_response(400, "validation_error", "Name is too long")

        if avatar is not None:
            allowed_prefixes = (
                "data:image/jpeg;base64,",
                "data:image/jpg;base64,",
                "data:image/png;base64,",
                "data:image/gif;base64,",
                "data:image/webp;base64,",
            )
            if not any(avatar.startswith(p) for p in allowed_prefixes):
                return _error_response(400, "validation_error", "Avatar must be a valid image (JPEG, PNG, GIF or WebP)")
            if len(avatar) > 2_800_000:
                return _error_response(400, "validation_error", "Avatar image is too large")

        db = _get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE users SET name = ?, avatar = ? WHERE user_id = ?",
            (name, avatar, g.user_id),
        )
        db.commit()

        if cursor.rowcount == 0:
            return _error_response(404, "not_found", "User not found")

        return jsonify({
            "status": "success",
            "user": {"user_id": g.user_id, "name": name, "avatar": avatar},
        })

    except Exception as e:
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/account", methods=["DELETE"])
@token_required
def delete_account():
    try:
        db = _get_db()
        cursor = db.cursor()

        cursor.execute("SELECT face_id FROM users WHERE user_id = ?", (g.user_id,))
        row = cursor.fetchone()
        if not row:
            return _error_response(404, "not_found", "User not found")
        face_id = row["face_id"]

        cursor.execute("DELETE FROM notes WHERE user_id = ?", (g.user_id,))
        cursor.execute("DELETE FROM folders WHERE user_id = ?", (g.user_id,))
        invalidate_all_user_tokens(db, g.user_id)
        deleted = delete_user(db, g.user_id)
        if not deleted:
            return _error_response(404, "not_found", "User not found")

        try:
            face_service = current_app.config.get("FACE_SERVICE") or getattr(current_app, "face_service", None)
            if face_service and face_id:
                face_service.delete_face(face_id)
        except Exception as e:
            logger.warning("Face service cleanup failed for face_id=%s: %s", face_id, e)

        response = make_response(jsonify({"status": "success", "message": "Compte supprimé avec succès"}))
        response.set_cookie("refresh_token", value="", httponly=True, secure=True, samesite="Strict", max_age=0)
        return response

    except Exception as e:
        logger.exception("Unhandled error in DELETE /account: %s", str(e))
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")


@auth_bp.route("/change_password", methods=["POST"])
@token_required
def change_password():
    try:
        data = request.json
        if not data or "password" not in data:
            return _error_response(400, "validation_error", "Password is required")

        pw_valid, pw_msg = validate_password_strength(data["password"])
        if not pw_valid:
            return _error_response(400, "validation_error", pw_msg)

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

        return jsonify({"status": "success", "message": "Mot de passe mis à jour avec succès"})

    except Exception as e:
        return _error_response(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer.")
