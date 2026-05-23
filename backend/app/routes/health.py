"""Health check Blueprint.

Provides a GET /health endpoint that verifies application and database
connectivity. No authentication required. Used by deployment platforms
(Render) and monitoring tools to confirm the application is operational.
"""

import sqlite3

from flask import Blueprint, current_app, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Check application health by verifying database connectivity.

    Returns:
        200 with {"status": "healthy"} when the database is reachable.
        503 with {"status": "unhealthy", "reason": "database_unavailable"}
        when the database cannot be reached.
    """
    try:
        db_path = current_app.config.get("DATABASE_PATH", "")
        if not db_path:
            return jsonify({"status": "unhealthy", "reason": "database_unavailable"}), 503

        conn = sqlite3.connect(db_path, timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()

        return jsonify({"status": "healthy"}), 200

    except Exception:
        return jsonify({"status": "unhealthy", "reason": "database_unavailable"}), 503
