"""Notes Blueprint — CRUD routes for user notes."""

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import token_required
from ..db import open_connection
from ..models.note import (
    create_note,
    delete_note,
    get_note_by_id,
    get_notes_by_user,
    update_note,
)
from ..models.folder import get_folder_by_id
from ..validators import NOTE_SCHEMA, sanitize_string, validate_request

notes_bp = Blueprint("notes", __name__)


def _get_db():
    """Get or create a request-scoped database connection."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = open_connection(current_app.config)
    return db


def _error_response(status_code, error_code, message):
    return jsonify({"status": "error", "error": error_code, "message": message}), status_code


@notes_bp.route("/notes", methods=["GET"])
@token_required
def get_notes():
    try:
        notes = get_notes_by_user(_get_db(), g.user_id)
        return jsonify({"status": "success", "notes": notes})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes", methods=["POST"])
@token_required
def add_note():
    try:
        data = request.json
        valid, errors = validate_request(data, NOTE_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        title = sanitize_string(data["title"])
        content = data.get("content", "")
        folder_id = data.get("folder_id")
        db = _get_db()

        if folder_id is not None:
            folder = get_folder_by_id(db, folder_id, g.user_id)
            if not folder:
                return _error_response(404, "not_found", "Folder not found")

        note_id = create_note(db, g.user_id, title, content, folder_id)
        return jsonify({
            "status": "success",
            "message": "Note créée avec succès",
            "note_id": note_id,
        })
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["GET"])
@token_required
def get_note(note_id):
    try:
        note = get_note_by_id(_get_db(), note_id, g.user_id)
        if not note:
            return _error_response(403, "forbidden", "You do not have access to this resource")
        return jsonify({"status": "success", "note": note})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["PUT"])
@token_required
def update_note_route(note_id):
    try:
        data = request.json
        valid, errors = validate_request(data, NOTE_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        db = _get_db()
        existing_note = get_note_by_id(db, note_id, g.user_id)
        if not existing_note:
            return _error_response(403, "forbidden", "You do not have access to this resource")

        title = sanitize_string(data["title"])
        content = data.get("content", "")

        if "folder_id" in data:
            folder_id = data["folder_id"]
        else:
            folder_id = existing_note.get("folder_id")

        if folder_id is not None:
            folder = get_folder_by_id(db, folder_id, g.user_id)
            if not folder:
                return _error_response(404, "not_found", "Folder not found")

        success = update_note(db, note_id, g.user_id, title, content, folder_id)
        if not success:
            return _error_response(404, "not_found", "Note non trouvée")

        return jsonify({"status": "success", "message": "Note mise à jour avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["DELETE"])
@token_required
def delete_note_route(note_id):
    try:
        db = _get_db()
        existing_note = get_note_by_id(db, note_id, g.user_id)
        if not existing_note:
            return _error_response(403, "forbidden", "You do not have access to this resource")

        success = delete_note(db, note_id, g.user_id)
        if not success:
            return _error_response(404, "not_found", "Note non trouvée")

        return jsonify({"status": "success", "message": "Note supprimée avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))
