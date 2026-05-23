"""Quick verification tests for rate_limiter module."""
import sys
sys.path.insert(0, "backend")

from flask import Flask
from app.rate_limiter import RateLimiter, init_rate_limiter


def test_disabled_mode():
    """When disabled, no requests are blocked."""
    app = Flask(__name__)
    app.config["RATE_LIMITING_ENABLED"] = False

    rl = RateLimiter()
    rl.init_app(app)

    assert not rl.enabled

    # The limit decorator should be a no-op
    @rl.limit(max_requests=1, window_seconds=60)
    def my_view():
        return "ok"

    # Verify the function is unchanged (no wrapper logic blocks)
    with app.test_request_context():
        assert my_view() == "ok"


def test_enabled_mode_blocks():
    """When enabled, exceeding limits returns 429."""
    app = Flask(__name__)
    app.config["RATE_LIMITING_ENABLED"] = True
    app.config["TESTING"] = True

    rl = RateLimiter()
    rl.init_app(app)

    @app.route("/test")
    @rl.limit(max_requests=2, window_seconds=60)
    def test_route():
        return "ok"

    client = app.test_client()

    # First 2 requests should succeed
    resp1 = client.get("/test")
    assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}"

    resp2 = client.get("/test")
    assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}"

    # Third request should be rate limited
    resp3 = client.get("/test")
    assert resp3.status_code == 429, f"Expected 429, got {resp3.status_code}"
    assert "Retry-After" in resp3.headers

    data = resp3.get_json()
    assert data["error"] == "rate_limit_exceeded"


def test_default_limits_noop_when_disabled():
    """Default limits don't apply when disabled."""
    app = Flask(__name__)
    app.config["RATE_LIMITING_ENABLED"] = False

    rl = RateLimiter()
    rl.init_app(app)

    @app.route("/test")
    def test_route():
        return "ok"

    client = app.test_client()

    # Should never block
    for _ in range(10):
        resp = client.get("/test")
        assert resp.status_code == 200


if __name__ == "__main__":
    test_disabled_mode()
    test_enabled_mode_blocks()
    test_default_limits_noop_when_disabled()
    print("\nAll rate limiter tests passed!")
