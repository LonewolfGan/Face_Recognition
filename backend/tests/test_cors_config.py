"""Property-based tests for the CORS configuration module (P12).

Tests cover comma-separated parsing, whitespace trimming, and max 20 entries.
"""
from flask import Flask

from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# P12: CORS origins parsing — comma-separated, trimmed, max 20 entries
# **Validates: Requirements 5.2**
# ---------------------------------------------------------------------------

# Strategy for generating origin-like strings (simplified URLs)
origin_strategy = st.from_regex(
    r'https?://[a-z][a-z0-9]{0,10}\.[a-z]{2,4}(:[0-9]{2,5})?',
    fullmatch=True
)


def _make_app_with_origins(cors_origins):
    """Create a minimal Flask app with given CORS_ORIGINS config."""
    app = Flask(__name__)
    app.config["CORS_ORIGINS"] = cors_origins
    app.config["DEBUG"] = False
    return app


@given(origins=st.lists(origin_strategy, min_size=1, max_size=30))
def test_cors_origins_comma_separated_parsing(origins):
    """Comma-separated origins are parsed into a list."""
    from app.cors import _get_allowed_origins

    cors_value = ','.join(origins)
    app = _make_app_with_origins(cors_value)

    result = _get_allowed_origins(app)

    # All results should be trimmed
    for origin in result:
        assert origin == origin.strip()

    # Max 20 entries enforced
    assert len(result) <= 20


@given(origins=st.lists(
    st.tuples(
        st.text(min_size=0, max_size=5, alphabet=st.sampled_from(' \t')),
        origin_strategy,
        st.text(min_size=0, max_size=5, alphabet=st.sampled_from(' \t')),
    ),
    min_size=1,
    max_size=10,
))
def test_cors_origins_whitespace_trimmed(origins):
    """Whitespace around each origin entry is trimmed."""
    from app.cors import _get_allowed_origins

    # Build comma-separated string with whitespace padding
    entries = [f"{ws_before}{origin}{ws_after}" for ws_before, origin, ws_after in origins]
    cors_value = ','.join(entries)

    app = _make_app_with_origins(cors_value)
    result = _get_allowed_origins(app)

    # Every entry should be trimmed (no leading/trailing whitespace)
    for origin in result:
        assert origin == origin.strip()
        assert len(origin) > 0


@given(origins=st.lists(origin_strategy, min_size=21, max_size=30))
def test_cors_origins_max_20_entries(origins):
    """At most 20 entries are returned regardless of input count."""
    from app.cors import _get_allowed_origins

    cors_value = ','.join(origins)
    app = _make_app_with_origins(cors_value)

    result = _get_allowed_origins(app)
    assert len(result) <= 20
