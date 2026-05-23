"""Faces Blueprint — routes for face addition, recognition, and face_id lookup.

Provides the faces_bp Blueprint handling /add_face, /recognize, and /get_face_id
endpoints. Calls FaceService directly (no HTTP to separate services).
"""

import logging

from flask import Blueprint, current_app, jsonify, request

from ..services.face_service import (
    FaceNotFoundError,
    FaceProcessingError,
    FaceService,
)

logger = logging.getLogger(__name__)

faces_bp = Blueprint("faces", __name__)


def _get_face_service() -> FaceService:
    """Get or create the FaceService instance from the current app.

    Lazily creates a FaceService using current_app.embedding_store
    and caches it on the app instance.

    Returns:
        The shared FaceService instance.

    Raises:
        RuntimeError: If the embedding store is not available.
    """
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


@faces_bp.route("/add_face", methods=["POST"])
def add_face():
    """Add a new face with images.

    Expects JSON body:
        {
            "name": str,
            "images": list[str]  (base64-encoded image strings)
        }

    Returns:
        200: {"status": "success", "face_id": str, "name": str}
        400: {"status": "error", "message": str} on processing failure
        500: {"status": "error", "message": str} on internal error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body is required"}), 400

        name = data.get("name")
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
        return jsonify({"status": "error", "message": str(e)}), 500
    except Exception as e:
        logger.error("Unexpected error in /add_face: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


@faces_bp.route("/recognize", methods=["POST"])
def recognize():
    """Recognize a face from an image.

    Expects JSON body:
        {
            "image": str  (base64-encoded image string)
        }

    Returns:
        200: {"status": "success", "face_id": str, "distance": float}
        400: {"status": "error", "message": str} on processing failure
        401: {"status": "error", "message": str} if no match found
        500: {"status": "error", "message": str} on internal error
    """
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
        return jsonify({"status": "error", "message": str(e)}), 500
    except Exception as e:
        logger.error("Unexpected error in /recognize: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


@faces_bp.route("/get_face_id", methods=["POST"])
def get_face_id():
    """Get face_id for a user by name.

    Expects JSON body:
        {
            "name": str
        }

    Returns:
        200: {"status": "success", "face_id": str}
        400: {"status": "error", "message": str} if name missing
        401: {"status": "error", "message": str} if user not found
        500: {"status": "error", "message": str} on internal error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body is required"}), 400

        name = data.get("name")
        if not name:
            return jsonify({"status": "error", "message": "Name is required"}), 400

        # Look up user by name in the database
        from ..models.user import get_user_by_name

        db_path = current_app.config.get("DATABASE_PATH", "")
        user = get_user_by_name(db_path, name)

        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 401

        return jsonify({
            "status": "success",
            "face_id": user["face_id"],
        })

    except Exception as e:
        logger.error("Unexpected error in /get_face_id: %s", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500
