"""Rate limiting middleware for the Flask application.

Provides a simple in-memory rate limiter that can be enabled or disabled
via the RATE_LIMITING_ENABLED configuration setting. When disabled (e.g.,
in testing), all rate limiting is a no-op.

Default limits:
- General endpoints: 200 per day, 50 per hour
- Auth endpoints: 20 per hour (stricter)

Usage in Blueprint routes:
    from backend.app.rate_limiter import limiter

    @auth_bp.route("/login", methods=["POST"])
    @limiter.limit(max_requests=10, window_seconds=60)
    def login():
        ...
"""

import time
import threading
from functools import wraps
from collections import defaultdict

from flask import Flask, request, jsonify, current_app


class RateLimiter:
    """In-memory rate limiter using a sliding window counter approach.

    Tracks request counts per client IP within configurable time windows.
    Thread-safe via a lock on the internal state.
    """

    def __init__(self):
        self._enabled = True
        self._lock = threading.Lock()
        # {key: [timestamp, ...]}
        self._requests: dict[str, list[float]] = defaultdict(list)
        # Default limits: 200 per day, 50 per hour for general endpoints
        self._default_limit = 50  # requests per hour
        self._default_window = 3600  # 1 hour in seconds
        # Stricter limits for auth endpoints: 20 per hour
        self._auth_limit = 20  # requests per hour
        self._auth_window = 3600  # 1 hour in seconds
        self._app = None

    def init_app(self, app: Flask) -> None:
        """Initialize the rate limiter with a Flask application.

        Reads RATE_LIMITING_ENABLED from app config to determine
        whether rate limiting is active.

        Args:
            app: The Flask application instance.
        """
        self._app = app
        self._enabled = app.config.get("RATE_LIMITING_ENABLED", True)

        # Register before_request handler for default rate limiting
        if self._enabled:
            app.before_request(self._check_default_limit)

    @property
    def enabled(self) -> bool:
        """Whether rate limiting is currently active."""
        return self._enabled

    def limit(self, max_requests: int, window_seconds: int = 60):
        """Decorator to apply a custom rate limit to a route.

        When rate limiting is disabled, the decorator is a no-op.

        Args:
            max_requests: Maximum number of requests allowed in the window.
            window_seconds: Time window in seconds.

        Returns:
            A decorator function.
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if not self._enabled:
                    return f(*args, **kwargs)

                client_key = self._get_client_key(request)
                route_key = f"{client_key}:{request.endpoint}"

                if self._is_rate_limited(route_key, max_requests, window_seconds):
                    return self._rate_limit_response(window_seconds)

                return f(*args, **kwargs)
            return decorated_function
        return decorator

    def _check_default_limit(self):
        """Before-request handler that applies default rate limits.

        Auth-related endpoints get a stricter limit (20/hour).
        All other endpoints get the general limit (50/hour).
        Health check endpoints are always exempt.
        """
        if not self._enabled:
            return None

        client_key = self._get_client_key(request)
        endpoint = request.endpoint or ""

        # Always exempt health checks — Render pings every 10s and would
        # exhaust the rate limit bucket within minutes.
        if "health" in endpoint.lower():
            return None

        # Determine limit based on endpoint type
        if self._is_auth_endpoint(endpoint):
            max_requests = self._auth_limit
            window = self._auth_window
        else:
            max_requests = self._default_limit
            window = self._default_window

        rate_key = f"{client_key}:default:{endpoint}"

        if self._is_rate_limited(rate_key, max_requests, window):
            return self._rate_limit_response(window)

        return None

    def _is_auth_endpoint(self, endpoint: str) -> bool:
        """Check if an endpoint is auth-related for stricter limiting."""
        auth_keywords = ("login", "register", "auth", "refresh", "logout", "password")
        endpoint_lower = endpoint.lower()
        return any(kw in endpoint_lower for kw in auth_keywords)

    def _is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """Check if a key has exceeded its rate limit.

        Uses a sliding window: removes expired timestamps, then checks
        if the count exceeds the limit. If not exceeded, records the
        current request.

        Args:
            key: Unique identifier for the rate limit bucket.
            max_requests: Maximum allowed requests in the window.
            window_seconds: Time window in seconds.

        Returns:
            True if the rate limit is exceeded, False otherwise.
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            # Remove expired entries
            self._requests[key] = [
                ts for ts in self._requests[key] if ts > cutoff
            ]

            if len(self._requests[key]) >= max_requests:
                return True

            # Record this request
            self._requests[key].append(now)
            return False

    def _get_client_key(self, req) -> str:
        """Extract a client identifier from the request.

        Uses X-Forwarded-For header if present (for proxied requests),
        otherwise falls back to remote_addr.

        Args:
            req: The Flask request object.

        Returns:
            A string identifying the client.
        """
        forwarded_for = req.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain (original client)
            return forwarded_for.split(",")[0].strip()
        return req.remote_addr or "unknown"

    def _rate_limit_response(self, window_seconds: int):
        """Create a 429 Too Many Requests response.

        Args:
            window_seconds: The rate limit window, used for Retry-After header.

        Returns:
            A Flask response tuple with 429 status.
        """
        response = jsonify({
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
        })
        response.status_code = 429
        response.headers["Retry-After"] = str(window_seconds)
        return response

    def cleanup(self) -> None:
        """Remove expired entries from all buckets.

        Can be called periodically to prevent memory growth in
        long-running applications.
        """
        now = time.time()
        with self._lock:
            keys_to_remove = []
            for key, timestamps in self._requests.items():
                # Keep only timestamps from the last hour (max window)
                self._requests[key] = [
                    ts for ts in timestamps if ts > now - 3600
                ]
                if not self._requests[key]:
                    keys_to_remove.append(key)

            for key in keys_to_remove:
                del self._requests[key]


# Module-level limiter instance for import by Blueprint routes.
# Must be initialized with init_rate_limiter(app) during app creation.
limiter = RateLimiter()


def init_rate_limiter(app: Flask) -> RateLimiter:
    """Initialize rate limiting on the Flask application.

    Initializes the module-level `limiter` instance with the given app.
    When RATE_LIMITING_ENABLED is False in the app config, the
    limiter is initialized but remains inactive (no-op).

    Args:
        app: The Flask application instance.

    Returns:
        The configured RateLimiter instance (same as module-level `limiter`).
    """
    limiter.init_app(app)
    return limiter
