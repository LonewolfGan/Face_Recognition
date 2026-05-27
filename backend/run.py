"""Entry point for the Face Recognition Notes application."""

import os

from flask import jsonify

from app import create_app

config_name = os.getenv("FLASK_ENV", "development")
app = create_app(config_name)


@app.route("/", methods=["GET"])
def root_health():
    """Root health check — required by Render to validate the deployment."""
    return jsonify({"status": "online"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
