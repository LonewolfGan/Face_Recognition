# Feature: project-restructure, Property 3: Application factory configuration correctness
# Feature: project-restructure, Property 4: Environment variable override precedence
# Feature: project-restructure, Property 5: Invalid config_name rejection
"""Property-based tests for application factory configuration.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6, 8.7**
"""

import os
import tempfile

import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st

from app import create_app


# --- Strategies ---

# Strategy for valid config names (including None for Property 3)
config_names_with_none = st.sampled_from(["testing", "development", "production", None])

# Strategy for valid config names (without None for Property 4)
config_names = st.sampled_from(["testing", "development", "production"])

# Strategy for database paths (non-empty text that could be a file path)
# Use :memory: or paths relative to a temp dir to avoid filesystem errors
database_paths = st.one_of(
    st.just(":memory:"),
    st.text(
        alphabet=st.characters(
            whitelist_categories=("L", "N"),
            whitelist_characters="_-.",
        ),
        min_size=1,
        max_size=20,
    ).filter(lambda s: s.strip() != "" and not s.isspace()).map(lambda s: s + ".db"),
)

# Strategy for CORS origins (comma-separated URLs)
cors_origin_single = st.from_regex(
    r"https?://[a-z]{1,10}\.[a-z]{2,4}(:[0-9]{2,5})?",
    fullmatch=True,
)

cors_origins = st.lists(
    cors_origin_single,
    min_size=1,
    max_size=3,
).map(lambda origins: ",".join(origins))

# Strategy for FLASK_DEBUG values
flask_debug_values = st.sampled_from(["true", "false", "1", "0", "t", "yes"])

# Valid configuration names that should NOT raise ValueError
VALID_CONFIG_NAMES = {"testing", "development", "production"}


# --- Property 3 Tests ---


class TestAppFactoryConfigurationCorrectness:
    """Property 3: Application factory configuration correctness.

    *For any* valid config_name in {"testing", "development", "production", None},
    create_app(config_name) should return a Flask application instance where the
    configuration attributes match the expected values for that config (DEBUG mode,
    database path, CORS origins, rate limiting enabled/disabled).

    **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    """

    @given(config_name=config_names_with_none)
    @settings(max_examples=100, deadline=None)
    def test_app_factory_configuration_matches_expected(self, config_name):
        """For any valid config_name, the app configuration matches expected values."""
        # Clear environment variables that could interfere with config defaults
        env_vars_to_clear = ["FLASK_ENV", "DATABASE_PATH", "CORS_ORIGINS", "FLASK_DEBUG"]
        original_env = {}
        for var in env_vars_to_clear:
            original_env[var] = os.environ.pop(var, None)

        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                # Set DATA_DIR to a temp directory to avoid side effects
                os.environ["DATA_DIR"] = tmp_dir

                app = create_app(config_name)

                if config_name == "testing":
                    # Requirement 8.2: testing config uses in-memory DB,
                    # disables rate limiting
                    assert app.config["TESTING"] is True
                    assert app.config["DATABASE_PATH"] == ":memory:"
                    assert app.config["RATE_LIMITING_ENABLED"] is False

                elif config_name == "development":
                    # Requirement 8.4: development config enables debug,
                    # configures CORS for localhost:5173
                    assert app.config["DEBUG"] is True
                    assert "http://localhost:5173" in app.config["CORS_ORIGINS"]

                elif config_name == "production":
                    # Requirement 8.3: production config disables debug,
                    # enables rate limiting
                    assert app.config["DEBUG"] is False
                    assert app.config["RATE_LIMITING_ENABLED"] is True

                elif config_name is None:
                    # None defaults to "development" behavior
                    # (when FLASK_ENV is not set, defaults to development)
                    assert app.config["DEBUG"] is True
                    assert "http://localhost:5173" in app.config["CORS_ORIGINS"]

        finally:
            # Restore original environment
            for var, value in original_env.items():
                if value is None:
                    os.environ.pop(var, None)
                else:
                    os.environ[var] = value


# --- Property 4 Tests ---


class TestEnvVarOverridePrecedence:
    """Property 4: Environment variable override precedence.

    *For any* valid value of DATABASE_PATH, CORS_ORIGINS, or FLASK_DEBUG
    environment variables, when set before calling create_app, the resulting
    application configuration should reflect the environment variable value
    regardless of the config_name provided.

    **Validates: Requirements 8.6**
    """

    @given(
        config_name=config_names,
        db_path=database_paths,
    )
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_database_path_env_overrides_config(self, config_name, db_path, monkeypatch):
        """DATABASE_PATH env var overrides the default for any config_name."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            # If db_path is not :memory:, make it a full path inside tmp_dir
            if db_path != ":memory:":
                actual_db_path = os.path.join(tmp_dir, db_path)
            else:
                actual_db_path = db_path
            monkeypatch.setenv("DATABASE_PATH", actual_db_path)
            monkeypatch.setenv("DATA_DIR", tmp_dir)
            app = create_app(config_name)
            assert app.config["DATABASE_PATH"] == actual_db_path, (
                f"Expected DATABASE_PATH='{actual_db_path}' from env var, "
                f"but got '{app.config['DATABASE_PATH']}' for config_name='{config_name}'"
            )

    @given(
        config_name=config_names,
        origins=cors_origins,
    )
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_cors_origins_env_overrides_config(self, config_name, origins, monkeypatch):
        """CORS_ORIGINS env var overrides the default for any config_name."""
        monkeypatch.setenv("CORS_ORIGINS", origins)
        with tempfile.TemporaryDirectory() as tmp_dir:
            monkeypatch.setenv("DATA_DIR", tmp_dir)
            app = create_app(config_name)
            expected_origins = [o.strip() for o in origins.split(",") if o.strip()]
            assert app.config["CORS_ORIGINS"] == expected_origins, (
                f"Expected CORS_ORIGINS={expected_origins} from env var, "
                f"but got '{app.config['CORS_ORIGINS']}' for config_name='{config_name}'"
            )

    @given(
        config_name=config_names,
        debug_val=flask_debug_values,
    )
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_flask_debug_env_overrides_config(self, config_name, debug_val, monkeypatch):
        """FLASK_DEBUG env var overrides the default for any config_name."""
        monkeypatch.setenv("FLASK_DEBUG", debug_val)
        with tempfile.TemporaryDirectory() as tmp_dir:
            monkeypatch.setenv("DATA_DIR", tmp_dir)
            app = create_app(config_name)
            expected_debug = debug_val.lower() in ("true", "1", "t", "yes")
            assert app.config["DEBUG"] == expected_debug, (
                f"Expected DEBUG={expected_debug} from FLASK_DEBUG='{debug_val}', "
                f"but got '{app.config['DEBUG']}' for config_name='{config_name}'"
            )


# --- Property 5 Tests ---


class TestInvalidConfigNameRejection:
    """Property 5: Invalid config_name rejection.

    *For any* string that is not one of {"testing", "development", "production"}
    and is not None, calling create_app with that string should raise a ValueError.

    **Validates: Requirements 8.7**
    """

    @given(config_name=st.text())
    @settings(max_examples=100, deadline=None)
    def test_invalid_config_name_raises_value_error(self, config_name):
        """Any string not in the valid set raises ValueError."""
        assume(config_name not in VALID_CONFIG_NAMES)

        with pytest.raises(ValueError):
            create_app(config_name)
