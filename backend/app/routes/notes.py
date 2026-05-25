"""Notes Blueprint - CRUD routes for user notes.

Provides endpoints for creating, reading, updating, and deleting notes.
All routes require authentication via the @token_required decorator.
"""

import sqlite3

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import token_required
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


def _error_response(status_code, error_code, message):
    """Return consistent error JSON structure."""
    return (
        jsonify({"status": "error", "error": error_code, "message": message}),
        status_code,
    )


def _get_db_path():
    """Get the database path from app config."""
    return current_app.config["DATABASE_PATH"]


def _get_folder_conn(db_path):
    """Create a connection suitable for the folder model (requires Connection)."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@notes_bp.route("/notes", methods=["GET"])
@token_required
def get_notes():
    """Get all notes for the authenticated user."""
    try:
        db_path = _get_db_path()
        notes = get_notes_by_user(db_path, g.user_id)
        return jsonify({"status": "success", "notes": notes})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes", methods=["POST"])
@token_required
def add_note():
    """Create a new note for the authenticated user."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, NOTE_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        # Sanitize string fields
        title = sanitize_string(data["title"])
        content = sanitize_string(data.get("content", ""))
        folder_id = data.get("folder_id")

        db_path = _get_db_path()

        # If folder_id provided, verify ownership
        if folder_id is not None:
            conn = _get_folder_conn(db_path)
            try:
                folder = get_folder_by_id(conn, folder_id, g.user_id)
            finally:
                conn.close()
            if not folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

        note_id = create_note(db_path, g.user_id, title, content, folder_id)
        return jsonify(
            {
                "status": "success",
                "message": "Note créée avec succès",
                "note_id": note_id,
            }
        )
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["GET"])
@token_required
def get_note(note_id):
    """Get a specific note by ID for the authenticated user."""
    try:
        db_path = _get_db_path()
        note = get_note_by_id(db_path, note_id, g.user_id)
        if not note:
            return _error_response(
                403, "forbidden", "You do not have access to this resource"
            )
        return jsonify({"status": "success", "note": note})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["PUT"])
@token_required
def update_note_route(note_id):
    """Update an existing note for the authenticated user."""
    try:
        data = request.json

        # Input validation
        valid, errors = validate_request(data, NOTE_SCHEMA)
        if not valid:
            return _error_response(400, "validation_error", errors)

        db_path = _get_db_path()

        # Ownership check - verify note belongs to user
        existing_note = get_note_by_id(db_path, note_id, g.user_id)
        if not existing_note:
            return _error_response(
                403, "forbidden", "You do not have access to this resource"
            )

        # Sanitize string fields
        title = sanitize_string(data["title"])
        content = sanitize_string(data.get("content", ""))

        # Only update folder_id if explicitly included in the request body.
        # If absent, preserve the note's current folder assignment.
        if "folder_id" in data:
            folder_id = data["folder_id"]
        else:
            folder_id = existing_note.get("folder_id")

        # If folder_id provided, verify ownership of folder
        if folder_id is not None:
            conn = _get_folder_conn(db_path)
            try:
                folder = get_folder_by_id(conn, folder_id, g.user_id)
            finally:
                conn.close()
            if not folder:
                return _error_response(
                    403, "forbidden", "You do not have access to this resource"
                )

        success = update_note(db_path, note_id, g.user_id, title, content, folder_id)
        if not success:
            return _error_response(404, "not_found", "Note non trouvée")

        return jsonify({"status": "success", "message": "Note mise à jour avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))


@notes_bp.route("/notes/<note_id>", methods=["DELETE"])
@token_required
def delete_note_route(note_id):
    """Delete a note for the authenticated user."""
    try:
        db_path = _get_db_path()

        # Ownership check
        existing_note = get_note_by_id(db_path, note_id, g.user_id)
        if not existing_note:
            return _error_response(
                403, "forbidden", "You do not have access to this resource"
            )

        success = delete_note(db_path, note_id, g.user_id)
        if not success:
            return _error_response(404, "not_found", "Note non trouvée")

        return jsonify({"status": "success", "message": "Note supprimée avec succès"})
    except Exception as e:
        return _error_response(500, "internal_error", str(e))
