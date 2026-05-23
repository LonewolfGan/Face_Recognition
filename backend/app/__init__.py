"""Application factory for the Face Recognition Notes application.

Provides the create_app factory function that creates and configures
a Flask application instance based on the specified environment.
"""

import os
import sqlite3

from flask import Flask, g

from .config import config


# Valid configuration names
VALID_CONFIG_NAMES = {"testing", "development", "production"}


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application.

    Args:
        config_name: One of "testing", "development", "production", or None.
            If None, defaults to the FLASK_ENV environment variable or "development".

    Returns:
        Configured Flask application instance.

    Raises:
        ValueError: If config_name is not recognized.
    """
    # Resolve config_name
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    if config_name not in VALID_CONFIG_NAMES:
        raise ValueError(
            f"Unrecognized configuration name: '{config_name}'. "
            f"Must be one of: {', '.join(sorted(VALID_CONFIG_NAMES))}"
        )

    # Create Flask app
    app = Flask(__name__)

    # Load configuration from config class instance
    config_class = config[config_name]
    config_instance = config_class()

    # Apply config attributes to app.config
    for key in dir(config_instance):
        if key.isupper():
            app.config[key] = getattr(config_instance, key)

    # Ensure DATA_DIR exists
    data_dir = app.config.get("DATA_DIR", "backend/data/")
    os.makedirs(data_dir, exist_ok=True)

    # Set DATABASE_PATH default if not explicitly set
    if not app.config.get("DATABASE_PATH"):
        app.config["DATABASE_PATH"] = os.path.join(data_dir, "users.db")

    # Initialize CORS
    _init_cors(app)

    # Initialize rate limiter
    _init_rate_limiter(app)

    # Initialize database schema
    _init_database(app)

    # Initialize EmbeddingStore
    _init_embedding_store(app)

    # Register Blueprints
    _register_blueprints(app)

    # Register teardown handlers
    app.teardown_appcontext(_close_db)

    return app


def _init_cors(app: Flask) -> None:
    """Initialize CORS with configured origins."""
    try:
        from .cors import init_cors

        init_cors(app)
    except ImportError:
        # Fallback: use flask_cors directly if cors module not available
        from flask_cors import CORS

        origins = app.config.get("CORS_ORIGINS", ["*"])
        CORS(
            app,
            origins=origins,
            methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization"],
            supports_credentials=True,
        )


def _init_rate_limiter(app: Flask) -> None:
    """Initialize rate limiter if enabled in config."""
    try:
        from .rate_limiter import init_rate_limiter

        rate_limiter = init_rate_limiter(app)
        app.config["RATE_LIMITER"] = rate_limiter
    except ImportError:
        # rate_limiter module not yet implemented; skip
        app.config["RATE_LIMITER"] = None


def _init_database(app: Flask) -> None:
    """Initialize the database schema."""
    db_path = app.config.get("DATABASE_PATH", "")
    if not db_path:
        return

    # For in-memory databases, defer schema init to request context
    if db_path == ":memory:":
        # Create schema in app context for testing
        with app.app_context():
            conn = sqlite3.connect(db_path)
            _create_schema(conn)
            conn.close()
        return

    # Ensure the directory for the database file exists
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    # Create schema if database doesn't exist or is new
    conn = sqlite3.connect(db_path)
    _create_schema(conn)
    conn.close()


def _create_schema(conn: sqlite3.Connection) -> None:
    """Create database tables if they don't exist."""
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        face_id TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS folders (
        folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (parent_id) REFERENCES folders(folder_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        note_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id INTEGER REFERENCES folders(folder_id),
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invalidated INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)"
    )

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.commit()


def _init_embedding_store(app: Flask) -> None:
    """Initialize the EmbeddingStore and FaceService, creating empty files if needed.

    Stores the EmbeddingStore instance on app.embedding_store and the
    FaceService on app.config["FACE_SERVICE"] for access by route handlers.
    If FAISS or DeepFace is not available, both are set to None and startup
    continues without error.
    """
    try:
        from .services.embedding_service import EmbeddingStore
        from .services.face_service import FaceService

        data_dir = app.config.get("DATA_DIR", "data/")
        os.makedirs(data_dir, exist_ok=True)
        app.logger.info("EmbeddingStore data_dir: %s (cwd: %s)", os.path.abspath(data_dir), os.getcwd())

        embedding_store = EmbeddingStore(data_dir)
        app.embedding_store = embedding_store

        face_service = FaceService(
            embedding_store,
            model_name=app.config.get("MODEL_NAME", "ArcFace"),
            detector_backend=app.config.get("DETECTOR_BACKEND", "ssd"),
        )
        app.config["FACE_SERVICE"] = face_service
        app.face_service = face_service
        app.logger.info("FaceService initialized successfully.")

    except ImportError as e:
        app.logger.warning("FaceService import error (faiss/deepface missing?): %s", e)
        app.embedding_store = None
        app.config["FACE_SERVICE"] = None
    except Exception as e:
        app.logger.error("Failed to initialize FaceService: %s", e, exc_info=True)
        app.embedding_store = None
        app.config["FACE_SERVICE"] = None


def _register_blueprints(app: Flask) -> None:
    """Register all application Blueprints."""
    # Each blueprint is imported inside try/except so the app can still
    # start even if route modules aren't implemented yet.

    try:
        from .routes.auth import auth_bp

        app.register_blueprint(auth_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.notes import notes_bp

        app.register_blueprint(notes_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.folders import folders_bp

        app.register_blueprint(folders_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.faces import faces_bp

        app.register_blueprint(faces_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.health import health_bp

        app.register_blueprint(health_bp)
    except (ImportError, AttributeError):
        pass


def _close_db(exception=None) -> None:
    """Close database connection at end of request."""
    db = g.pop("_database", None)
    if db is not None:
        db.close()
