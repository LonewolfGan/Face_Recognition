"""Application factory for the Face Recognition Notes application."""

import os
import sqlite3
import threading

from flask import Flask, g

from .config import config


VALID_CONFIG_NAMES = {"testing", "development", "production"}

# Module-level warmup state — shared across all threads in the worker process
_warmup_status = {
    "state": "pending",   # pending | warming | ready | failed
    "error": None,
}
_warmup_lock = threading.Lock()


def _validate_security_config(app: Flask) -> None:
    """Validate that required security settings are configured."""
    if app.config.get("FLASK_ENV") == "production":
        # Require explicit secret keys in production
        if not app.config.get("SECRET_KEY") or app.config["SECRET_KEY"] == "dev-secret-key-change-in-production":
            raise RuntimeError(
                "SECRET_KEY must be set to a strong, unique value in production. "
                "Set the SECRET_KEY environment variable."
            )
        if not app.config.get("JWT_SECRET_KEY") or app.config["JWT_SECRET_KEY"] == "dev-jwt-secret-key-change-in-production":
            raise RuntimeError(
                "JWT_SECRET_KEY must be set to a strong, unique value in production. "
                "Set the JWT_SECRET_KEY environment variable."
            )

        # Require explicit CORS origins in production
        cors_origins = app.config.get("CORS_ORIGINS", [])
        if not cors_origins or cors_origins == ["*"]:
            raise RuntimeError(
                "CORS_ORIGINS must be explicitly configured in production. "
                "Set CORS_ORIGINS to your frontend URL(s), e.g.: https://your-app.vercel.app"
            )


def create_app(config_name: str | None = None) -> Flask:
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    if config_name not in VALID_CONFIG_NAMES:
        raise ValueError(
            f"Unrecognized configuration name: '{config_name}'. "
            f"Must be one of: {', '.join(sorted(VALID_CONFIG_NAMES))}"
        )

    app = Flask(__name__)

    config_class = config[config_name]
    config_instance = config_class()

    for key in dir(config_instance):
        if key.isupper():
            app.config[key] = getattr(config_instance, key)

    # Validate security configuration
    _validate_security_config(app)

    # Ensure DATA_DIR exists
    data_dir = app.config.get("DATA_DIR", "backend/data/")
    os.makedirs(data_dir, exist_ok=True)

    # Set DATABASE_PATH default if not using PostgreSQL and not explicitly set
    if not app.config.get("DATABASE_URL") and not app.config.get("DATABASE_PATH"):
        app.config["DATABASE_PATH"] = os.path.join(data_dir, "users.db")

    _init_cors(app)
    _init_csrf(app)
    _init_rate_limiter(app)
    _init_security_headers(app)
    _init_database(app)
    _init_embedding_store(app)
    _register_blueprints(app)

    app.teardown_appcontext(_close_db)

    return app


def _init_csrf(app: Flask) -> None:
    """Initialize CSRF protection for the application."""
    try:
        from flask_wtf.csrf import CSRFProtect
        csrf = CSRFProtect()
        csrf.init_app(app)
        app.logger.info("CSRF protection enabled")
    except ImportError:
        app.logger.warning("CSRF protection not available - flask-wtf not installed")


def _init_cors(app: Flask) -> None:
    try:
        from .cors import init_cors
        init_cors(app)
    except ImportError:
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
    try:
        from .rate_limiter import init_rate_limiter
        rate_limiter = init_rate_limiter(app)
        app.config["RATE_LIMITER"] = rate_limiter
    except ImportError:
        app.config["RATE_LIMITER"] = None


def _init_security_headers(app: Flask) -> None:
    """Configure security headers using Flask-Talisman."""
    try:
        from flask_talisman import Talisman

        # Base security policy
        talisman_config = {
            'force_https': app.config.get('FLASK_ENV') == 'production',
            'strict_transport_security': app.config.get('FLASK_ENV') == 'production',
            'session_cookie_secure': app.config.get('FLASK_ENV') == 'production',
            'content_security_policy': {
                'default-src': "'self'",
                'script-src': ["'self'", "'unsafe-inline'"],
                'style-src': ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
                'img-src': ["'self'", "data:", "cdn.jsdelivr.net"],
                'font-src': ["'self'", "fonts.gstatic.com"],
                'object-src': "'none'",
                'frame-ancestors': "'none'"
            },
            'feature_policy': {
                'geolocation': "'none'",
                'midi': "'none'",
                'notifications': "'none'",
                'push': "'none'",
                'sync-xhr': "'none'",
                'microphone': "'none'",
                'camera': "'none'",
                'magnetometer': "'none'",
                'gyroscope': "'none'",
                'speaker': "'none'",
                'vibrate': "'none'",
                'fullscreen': "'self'",
                'payment': "'none'"
            }
        }

        # Only apply CSP in production to avoid breaking development
        if app.config.get('FLASK_ENV') == 'production':
            Talisman(app, **talisman_config)
        else:
            # In development, only apply basic security headers
            basic_talisman_config = talisman_config.copy()
            basic_talisman_config['content_security_policy'] = None
            Talisman(app, **basic_talisman_config)

        app.logger.info("Security headers configured")
    except ImportError:
        app.logger.warning("Security headers not configured - flask-talisman not installed")


def _init_database(app: Flask) -> None:
    """Create database schema on startup (both SQLite and PostgreSQL)."""
    from .db import open_connection

    # For in-memory SQLite (testing), handle via legacy path
    db_path = app.config.get("DATABASE_PATH", "")
    if db_path == ":memory:":
        with app.app_context():
            conn = sqlite3.connect(db_path)
            _create_schema_sqlite(conn.cursor())
            conn.commit()
            conn.close()
        return

    conn = open_connection(app.config)
    try:
        if conn.backend == "postgresql":
            _create_schema_postgresql(conn)
        else:
            # Ensure the directory for the SQLite file exists
            if db_path:
                db_dir = os.path.dirname(db_path)
                if db_dir:
                    os.makedirs(db_dir, exist_ok=True)
            raw_cursor = conn.cursor()._c
            _create_schema_sqlite(raw_cursor)
            conn.commit()
    finally:
        conn.close()


def _create_schema_sqlite(cursor) -> None:
    """Create all tables for SQLite."""
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        face_id TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        avatar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS folders (
        folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT DEFAULT NULL,
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)"
    )

    # Migrations for existing databases
    try:
        cursor.execute("ALTER TABLE folders ADD COLUMN icon TEXT DEFAULT NULL")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL")
    except Exception:
        pass


def _create_schema_postgresql(conn) -> None:
    """Create all tables for PostgreSQL."""
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        face_id TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        avatar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS folders (
        folder_id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT DEFAULT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (parent_id) REFERENCES folders(folder_id)
    )
    """)
    conn.commit()

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
    conn.commit()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        token_hash TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invalidated INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
    """)
    conn.commit()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    conn.commit()

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)"
    )
    conn.commit()

    # Migrations: add columns if missing
    conn.add_column_if_missing("folders", "icon", "TEXT DEFAULT NULL")
    conn.add_column_if_missing("users", "avatar", "TEXT DEFAULT NULL")


def _configure_tensorflow() -> None:
    """Limit TensorFlow's memory and thread usage on constrained hosts.

    Called once at import time. Safe to call on machines without a GPU.
    Reducing parallelism threads cuts per-process RAM by ~50-80MB.
    """
    try:
        import tensorflow as tf
        # Use only 1 thread per operation — reduces thread-pool overhead
        tf.config.threading.set_inter_op_parallelism_threads(1)
        tf.config.threading.set_intra_op_parallelism_threads(1)
        # Allow memory growth on any visible GPUs (no-op on CPU-only hosts)
        for gpu in tf.config.list_physical_devices("GPU"):
            tf.config.experimental.set_memory_growth(gpu, True)
    except Exception:
        pass  # TF not available or already configured — silently skip


def _warmup_deepface(model_name: str, detector_backend: str, logger) -> None:
    """No-op: kept for backward compatibility. Models are now loaded synchronously
    at startup via FaceService.__init__ using OpenCV DNN (no TensorFlow)."""
    pass


def _init_embedding_store(app: Flask) -> None:
    try:
        from .services.embedding_service import EmbeddingStore
        from .services.face_service import FaceService

        data_dir = app.config.get("DATA_DIR", "data/")
        os.makedirs(data_dir, exist_ok=True)
        app.logger.info(
            "EmbeddingStore data_dir: %s (cwd: %s)",
            os.path.abspath(data_dir),
            os.getcwd(),
        )

        embedding_store = EmbeddingStore(data_dir)
        app.embedding_store = embedding_store

        model_name = app.config.get("MODEL_NAME", "SFace")
        detector_backend = app.config.get("DETECTOR_BACKEND", "opencv")

        face_service = FaceService(
            embedding_store,
            model_name=model_name,
            detector_backend=detector_backend,
            data_dir=data_dir,
        )
        app.config["FACE_SERVICE"] = face_service
        app.face_service = face_service
        app.logger.info("FaceService initialized (OpenCV DNN, TensorFlow-free).")

    except ImportError as e:
        app.logger.warning("FaceService import error (faiss/opencv missing?): %s", e)
        app.embedding_store = None
        app.config["FACE_SERVICE"] = None
    except Exception as e:
        app.logger.error("Failed to initialize FaceService: %s", e, exc_info=True)
        app.embedding_store = None
        app.config["FACE_SERVICE"] = None


def _register_blueprints(app: Flask) -> None:
    try:
        from .routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.notes import notes_bp
        app.register_blueprint(notes_bp, url_prefix="/api")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.folders import folders_bp
        app.register_blueprint(folders_bp, url_prefix="/api")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.faces import faces_bp
        app.register_blueprint(faces_bp, url_prefix="/api")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.health import health_bp
        app.register_blueprint(health_bp, url_prefix="/api")
    except (ImportError, AttributeError):
        pass


def _close_db(exception=None) -> None:
    """Close database connection at end of request."""
    db = g.pop("_database", None)
    if db is not None:
        db.close()
