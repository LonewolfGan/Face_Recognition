"""CORS configuration module.

Configures Flask-CORS using origins from the application config.
Supports configurable origins per environment (development, testing, production).
"""

from flask import Flask
from flask_cors import CORS


def init_cors(app: Flask) -> None:
    """Configure Flask-CORS on the application using config-defined origins.

    Reads CORS_ORIGINS from the app's configuration (set by config.py classes).
    In debug mode, ensures common development origins are included.

    NOTE: browsers forbid Access-Control-Allow-Credentials: true when the
    origin is '*', so we disable credentials for wildcard mode.

    Args:
        app: The Flask application instance to configure CORS on.
    """
    origins = _get_allowed_origins(app)
    wildcard = origins == ["*"]

    CORS(
        app,
        origins=origins,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=not wildcard,
    )


def _get_allowed_origins(app: Flask) -> list:
    """Resolve the list of allowed CORS origins from app config.

    Reads CORS_ORIGINS from app.config. If the config value is a list,
    uses it directly. If it's a string, parses it as comma-separated values.
    Caps the list at 20 entries.

    In debug mode, ensures localhost dev origins are always included.

    Args:
        app: The Flask application instance.

    Returns:
        A list of allowed origin strings.
    """
    raw_origins = app.config.get("CORS_ORIGINS", ["http://localhost:5173"])

    # Handle both list and string formats
    if isinstance(raw_origins, list):
        origins = [o.strip() for o in raw_origins if isinstance(o, str) and o.strip()]
    elif isinstance(raw_origins, str):
        # Parse comma-separated string (e.g., from env var)
        if not raw_origins or raw_origins.strip() == "":
            origins = ["http://localhost:5173"]
        elif raw_origins.strip() == "*":
            origins = ["*"]
        else:
            origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    else:
        origins = ["http://localhost:5173"]

    # Cap at 20 entries
    origins = origins[:20]

    # In debug mode, ensure dev origins are included
    if app.config.get("DEBUG", False):
        dev_origins = ["http://localhost:5173", "http://localhost:3000"]
        for origin in dev_origins:
            if origin not in origins:
                origins.append(origin)

    return origins
