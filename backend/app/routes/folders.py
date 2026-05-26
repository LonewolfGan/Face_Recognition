"""Folders Blueprint — CRUD operations for user folders."""

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import token_required
from ..db import open_connection
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


def _get_db():
    """Get or create a request-scoped database connection."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = open_connection(current_app.config)
    return db


def _error_response(status_code: int, error_code: str, message: str):
    return jsonify({"status": "error", "error": error_code, "message": message}), status_code


@folders_bp.route("/folders", methods=["GET"])
@token_required
def get_folders():
    try:
        folders = get_folders_by_user(_get_db(), g.user_id)
        return jsonify({"status": "success", "folders": folders})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders", methods=["POST"])
@token_required
def create_folder_route():
    try:
        data = request.json
        valid, errors = validate_request(data, FOLDER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        name = sanitize_string(data["name"])
        parent_id = data.get("parent_id")
        icon = data.get("icon") or None
        db = _get_db()

        if parent_id is not None:
            parent_folder = get_folder_by_id(db, parent_id, g.user_id)
            if not parent_folder:
                return _error_response(403, "forbidden", "You do not have access to this resource")

        folder_id = create_folder(db, g.user_id, name, parent_id, icon)
        return jsonify({
            "status": "success",
            "message": "Dossier créé avec succès",
            "folder_id": folder_id,
        })
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["GET"])
@token_required
def get_folder_route(folder_id):
    try:
        folder = get_folder_by_id(_get_db(), folder_id, g.user_id)
        if not folder:
            return _error_response(403, "forbidden", "You do not have access to this resource")
        return jsonify({"status": "success", "folder": folder})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["PUT"])
@token_required
def update_folder_route(folder_id):
    try:
        data = request.json
        valid, errors = validate_request(data, FOLDER_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        db = _get_db()
        existing_folder = get_folder_by_id(db, folder_id, g.user_id)
        if not existing_folder:
            return _error_response(403, "forbidden", "You do not have access to this resource")

        name = sanitize_string(data["name"])
        parent_id = data.get("parent_id")
        icon = data.get("icon") or None

        if parent_id is not None:
            parent_folder = get_folder_by_id(db, parent_id, g.user_id)
            if not parent_folder:
                return _error_response(403, "forbidden", "You do not have access to this resource")

        success = update_folder(db, folder_id, g.user_id, name, parent_id, icon)
        if not success:
            return _error_response(404, "not_found", "Dossier non trouvé")

        return jsonify({"status": "success", "message": "Dossier mis à jour avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>", methods=["DELETE"])
@token_required
def delete_folder_route(folder_id):
    try:
        db = _get_db()
        existing_folder = get_folder_by_id(db, folder_id, g.user_id)
        if not existing_folder:
            return _error_response(403, "forbidden", "You do not have access to this resource")

        success = delete_folder(db, folder_id, g.user_id)
        if not success:
            return _error_response(404, "not_found", "Dossier non trouvé")

        return jsonify({"status": "success", "message": "Dossier supprimé avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@folders_bp.route("/folders/<folder_id>/notes", methods=["GET"])
@token_required
def get_folder_notes(folder_id):
    try:
        db = _get_db()
        folder = get_folder_by_id(db, folder_id, g.user_id)
        if not folder:
            return _error_response(403, "forbidden", "You do not have access to this resource")

        notes = get_notes_in_folder(db, folder_id, g.user_id)
        return jsonify({"status": "success", "notes": notes})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))
