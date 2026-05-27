"""Health check Blueprint.

Provides GET /health — used by Render and monitoring tools.
No authentication required. Exempt from rate limiting.
"""

from flask import Blueprint, current_app, jsonify

from ..db import open_connection

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Check application health by verifying database connectivity.

    Returns 200 {"status": "healthy"} when the database is reachable,
    503 {"status": "unhealthy"} otherwise.
    Includes face model readiness so callers know when inference is available.
    """
    try:
        conn = open_connection(current_app.config)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()

        face_service = current_app.config.get("FACE_SERVICE") or getattr(current_app, "face_service", None)
        model_state = "ready" if (face_service and face_service._models_ready) else "unavailable"

        return jsonify({
            "status": "healthy",
            "db": conn.backend,
            "model": model_state,
        }), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "reason": str(e)}), 503
