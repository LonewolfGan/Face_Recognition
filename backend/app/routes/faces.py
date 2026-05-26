"""Faces Blueprint — face addition, recognition, and face_id lookup."""

import logging

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import token_required
from ..db import open_connection
from ..services.face_service import (
    FaceNotFoundError,
    FaceProcessingError,
    FaceService,
)
from ..validators import sanitize_string

logger = logging.getLogger(__name__)
faces_bp = Blueprint("faces", __name__)


def _get_face_service() -> FaceService:
    if not hasattr(current_app, "_face_service") or current_app._face_service is None:
        embedding_store = getattr(current_app, "embedding_store", None)
        if embedding_store is None:
            raise RuntimeError("Embedding store is not available")
        model_name = current_app.config.get("MODEL_NAME", "ArcFace")
        detector_backend = current_app.config.get("DETECTOR_BACKEND", "ssd")
        current_app._face_service = FaceService(
            embedding_store, model_name=model_name, detector_backend=detector_backend
        )
    return current_app._face_service


def _get_db():
    """Get or create a request-scoped database connection."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = open_connection(current_app.config)
    return db


@faces_bp.route("/add_face", methods=["POST"])
@token_required
def add_face():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body is required"}), 400

        name = sanitize_string(str(data.get("name", "")).strip())
        images = data.get("images")

        if not name:
            return jsonify({"status": "error", "message": "Name is required"}), 400
        if not images or not isinstance(images, list):
            return jsonify({"status": "error", "message": "Images list is required"}), 400

        face_service = _get_face_service()
        face_id, returned_name = face_service.add_face(name, images)

        return jsonify({
            "status": "success",
            "message": f"Visage de {returned_name} ajouté avec succès",
            "face_id": face_id,
            "name": returned_name,
        })

    except FaceProcessingError as e:
        logger.warning("Face processing error in /add_face: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 400
    except RuntimeError as e:
        logger.error("Runtime error in /add_face: %s", str(e))
        return jsonify({"status": "error", "message": "Face service unavailable"}), 500
    except Exception as e:
        logger.error("Unexpected error in /add_face: %s", str(e))
        return jsonify({"status": "error", "message": "Une erreur interne est survenue"}), 500


@faces_bp.route("/recognize", methods=["POST"])
@token_required
def recognize():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body is required"}), 400

        image = data.get("image")
        if not image:
            return jsonify({"status": "error", "message": "Image is required"}), 400

        face_service = _get_face_service()
        face_id, distance = face_service.recognize(image)

        return jsonify({
            "status": "success",
            "message": f"Visage reconnu avec ID: {face_id}",
            "face_id": face_id,
            "distance": float(distance),
        })

    except FaceProcessingError as e:
        logger.warning("Face processing error in /recognize: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 400
    except FaceNotFoundError as e:
        logger.info("Face not found in /recognize: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 401
    except RuntimeError as e:
        logger.error("Runtime error in /recognize: %s", str(e))
        return jsonify({"status": "error", "message": "Face service unavailable"}), 500
    except Exception as e:
        logger.error("Unexpected error in /recognize: %s", str(e))
        return jsonify({"status": "error", "message": "Une erreur interne est survenue"}), 500


@faces_bp.route("/get_face_id", methods=["GET"])
@token_required
def get_face_id():
    try:
        db = _get_db()
        cursor = db.cursor()
        cursor.execute("SELECT face_id FROM users WHERE user_id = ?", (g.user_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"status": "error", "message": "User not found"}), 404

        return jsonify({"status": "success", "face_id": row["face_id"]})

    except Exception as e:
        logger.error("Unexpected error in /get_face_id: %s", str(e))
        return jsonify({"status": "error", "message": "Une erreur interne est survenue"}), 500
