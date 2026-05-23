"""Folders Blueprint - CRUD operations for user folders.

Provides routes for creating, reading, updating, and deleting folders,
as well as retrieving notes within a specific folder.

All routes require authentication via the @token_required decorator.
"""

import sqlite3

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import token_required
from ..models.folder import (
    create_folder,
    delete_folder,
    get_folder_by_id,
    get_folders_by_user,
    get_notes_in_folder,
    update_folder,
)
from ..validators import FOLDER_SCHEMA, sanitize_string, validate_request

folders_bp = Blueprint("folders", __name__)


def _get_db_connection() -> sqlite3.Connection:
    """Get a database connection using the configured DATABASE_PATH."""
    db_path = current_app.config["DATABASE_PATH"]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _error_response(status_code: int, error_code: str, message: str):
    """Return consistent error JSON structure."""
    return jsonify({
        "status": "error",
        "error": error_code,
        "message": message,
    }), status_code


@folders_bp.route("/folders", methods=["GET"])
@token_required
def get_folders():
    """Get all folders for the authenticated user."""
    try:
        conn = _get_db_connection()
        try:
            folders = get_folders_by_user(conn, g.user_id)
            return jsonify({
                "status": "success",
                "folders": folders,
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders", methods=["POST"])
@token_required
def create_folder_route():
    """Create a new folder for the authenticated user."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, FOLDER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        # Sanitize name
        name = sanitize_string(data["name"])
        parent_id = data.get("parent_id")
        icon = data.get("icon") or None

        conn = _get_db_connection()
        try:
            # If parent_id provided, verify ownership
            if parent_id is not None:
                parent_folder = get_folder_by_id(conn, parent_id, g.user_id)
                if not parent_folder:
                    return _error_response(
                        403, "forbidden", "You do not have access to this resource"
                    )

            folder_id = create_folder(conn, g.user_id, name, parent_id, icon)

            return jsonify({
                "status": "success",
                "message": "Dossier créé avec succès",
                "folder_id": folder_id,
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["GET"])
@token_required
def get_folder_route(folder_id):
    """Get a specific folder by ID for the authenticated user."""
    try:
        conn = _get_db_connection()
        try:
            # Ownership check
            folder = get_folder_by_id(conn, folder_id, g.user_id)
            if not folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

            return jsonify({
                "status": "success",
                "folder": folder,
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["PUT"])
@token_required
def update_folder_route(folder_id):
    """Update an existing folder for the authenticated user."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, FOLDER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        conn = _get_db_connection()
        try:
            # Ownership check
            existing_folder = get_folder_by_id(conn, folder_id, g.user_id)
            if not existing_folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

            # Sanitize name
            name = sanitize_string(data["name"])
            parent_id = data.get("parent_id")
            icon = data.get("icon") or None

            # If parent_id provided, verify ownership of parent folder
            if parent_id is not None:
                parent_folder = get_folder_by_id(conn, parent_id, g.user_id)
                if not parent_folder:
                    return _error_response(
                        403, "forbidden", "You do not have access to this resource"
                    )

            success = update_folder(conn, folder_id, g.user_id, name, parent_id, icon)
            if not success:
                return _error_response(404, "not_found", "Dossier non trouvé")

            return jsonify({
                "status": "success",
                "message": "Dossier mis à jour avec succès",
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["DELETE"])
@token_required
def delete_folder_route(folder_id):
    """Delete a folder and its notes for the authenticated user."""
    try:
        conn = _get_db_connection()
        try:
            # Ownership check
            existing_folder = get_folder_by_id(conn, folder_id, g.user_id)
            if not existing_folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

            success = delete_folder(conn, folder_id, g.user_id)
            if not success:
                return _error_response(404, "not_found", "Dossier non trouvé")

            return jsonify({
                "status": "success",
                "message": "Dossier supprimé avec succès",
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>/notes", methods=["GET"])
@token_required
def get_folder_notes(folder_id):
    """Get all notes in a specific folder for the authenticated user."""
    try:
        conn = _get_db_connection()
        try:
            # Ownership check
            folder = get_folder_by_id(conn, folder_id, g.user_id)
            if not folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

            notes = get_notes_in_folder(conn, folder_id, g.user_id)
            return jsonify({
                "status": "success",
                "notes": notes,
            })
        finally:
            conn.close()
    except Exception as e:
        return _error_response(500, "internal_error", str(e))
