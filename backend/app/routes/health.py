"""Health check Blueprint.

Provides GET /health — used by Render and monitoring tools.
No authentication required. Exempt from rate limiting.
"""

from flask import Blueprint, current_app, jsonify

from ..db import open_connection
from .. import _warmup_status, _warmup_lock

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Check application health by verifying database connectivity.

    Returns 200 {"status": "healthy"} when the database is reachable,
    503 {"status": "unhealthy"} otherwise.
    Includes DeepFace warmup state so callers know when the model is hot.
    """
    try:
        conn = open_connection(current_app.config)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()

        with _warmup_lock:
            warmup = dict(_warmup_status)

        return jsonify({
            "status": "healthy",
            "db": conn.backend,
            "model": warmup["state"],
        }), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "reason": str(e)}), 503
