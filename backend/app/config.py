"""Application configuration classes.

Provides environment-specific configuration for development, testing,
and production. Environment variables override defaults when set.
"""

import os


class BaseConfig:
    """Shared configuration defaults across all environments."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", os.getenv("SESSION_SECRET", "dev-secret-key-change-in-production"))
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SESSION_SECRET", "dev-jwt-secret-key-change-in-production"))
    JWT_ACCESS_TOKEN_EXPIRES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    JWT_REFRESH_TOKEN_EXPIRES: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "604800"))

    MODEL_NAME: str = os.getenv("MODEL_NAME", "ArcFace")
    DETECTOR_BACKEND: str = os.getenv("DETECTOR_BACKEND", "ssd")

    DATA_DIR: str = os.getenv("DATA_DIR", "data/")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "")
    RATE_LIMITING_ENABLED: bool = True
    CORS_ORIGINS: list = ["*"]


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG: bool = True
    DATA_DIR: str = os.getenv("DATA_DIR", "data/")
    CORS_ORIGINS: list = ["*"]
    RATE_LIMITING_ENABLED: bool = True

    def __init__(self):
        super().__init__()
        # Environment variable overrides
        env_cors = os.getenv("CORS_ORIGINS")
        if env_cors:
            self.CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]

        env_db_path = os.getenv("DATABASE_PATH")
        if env_db_path:
            self.DATABASE_PATH = env_db_path

        env_debug = os.getenv("FLASK_DEBUG")
        if env_debug is not None:
            self.DEBUG = env_debug.lower() in ("true", "1", "t", "yes")


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    TESTING: bool = True
    DEBUG: bool = False
    DATABASE_PATH: str = ":memory:"
    RATE_LIMITING_ENABLED: bool = False
    CSRF_ENABLED: bool = False
    DATA_DIR: str = "data/"

    def __init__(self):
        super().__init__()
        # Environment variable overrides
        env_db_path = os.getenv("DATABASE_PATH")
        if env_db_path:
            self.DATABASE_PATH = env_db_path

        env_cors = os.getenv("CORS_ORIGINS")
        if env_cors:
            self.CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]

        env_debug = os.getenv("FLASK_DEBUG")
        if env_debug is not None:
            self.DEBUG = env_debug.lower() in ("true", "1", "t", "yes")


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    DEBUG: bool = False
    RATE_LIMITING_ENABLED: bool = True

    def __init__(self):
        super().__init__()
        # In production, CORS_ORIGINS must come from environment
        env_cors = os.getenv("CORS_ORIGINS", "")
        self.CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]

        env_db_path = os.getenv("DATABASE_PATH")
        if env_db_path:
            self.DATABASE_PATH = env_db_path

        env_debug = os.getenv("FLASK_DEBUG")
        if env_debug is not None:
            self.DEBUG = env_debug.lower() in ("true", "1", "t", "yes")


# Configuration dictionary mapping config names to classes
config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
