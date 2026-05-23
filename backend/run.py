"""Entry point for the Face Recognition Notes application.

This module creates the Flask application instance and runs it when
executed directly. It also exposes the `app` variable at module level
for use with WSGI servers like Gunicorn:

    gunicorn backend.run:app
"""

import os

from app import create_app

# Determine config from environment, defaulting to development
config_name = os.getenv("FLASK_ENV", "development")

# Create the application instance (available for Gunicorn)
app = create_app(config_name)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="localhost", port=port)
