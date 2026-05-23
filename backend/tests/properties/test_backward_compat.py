# Feature: project-restructure, Property 6: API backward compatibility
"""Property-based tests for API backward compatibility.

**Validates: Requirements 11.1**

Verifies that all existing API endpoint paths and HTTP methods are preserved
in the restructured application. The restructured app should respond to the
same paths and method without returning 404, ensuring the frontend requires
no route changes.
"""

import os
import sys
import tempfile
from unittest.mock import MagicMock

from hypothesis import given, settings
from hypothesis import strategies as st

# Mock heavy dependencies that may not be installed in the test environment
# (cv2, deepface) so that the faces blueprint can register its routes.
_modules_to_mock = ["cv2", "deepface", "deepface.DeepFace"]
_original_modules = {}
for mod_name in _modules_to_mock:
    if mod_name not in sys.modules:
        _original_modules[mod_name] = None
        sys.modules[mod_name] = MagicMock()
    else:
        _original_modules[mod_name] = sys.modules[mod_name]

from app import create_app  # noqa: E402


# All expected endpoint/method pairs that must remain accessible
ENDPOINTS = [
    ("POST", "/register"),
    ("POST", "/login"),
    ("POST", "/refresh-token"),
    ("POST", "/logout"),
    ("POST", "/change_password"),
    ("GET", "/notes"),
    ("POST", "/notes"),
    ("GET", "/notes/1"),
    ("PUT", "/notes/1"),
    ("DELETE", "/notes/1"),
    ("GET", "/folders"),
    ("POST", "/folders"),
    ("GET", "/folders/1"),
    ("PUT", "/folders/1"),
    ("DELETE", "/folders/1"),
    ("GET", "/folders/1/notes"),
    ("POST", "/add_face"),
    ("POST", "/recognize"),
    ("POST", "/get_face_id"),
    ("GET", "/health"),
]


class TestAPIBackwardCompatibility:
    """Property 6: API backward compatibility.

    *For any* endpoint path and HTTP method that exists in the current
    application (e.g., POST /register, GET /notes, POST /login), the
    restructured application should respond to the same path and method
    without returning 404, maintaining the same response structure.

    **Validates: Requirements 11.1**
    """

    @given(endpoint=st.sampled_from(ENDPOINTS))
    @settings(max_examples=100, deadline=None)
    def test_all_endpoints_are_not_404(self, endpoint):
        """For any known endpoint, the app responds with a status != 404."""
        method, path = endpoint

        # Create a fresh test app for each example
        old_data_dir = os.environ.get("DATA_DIR")
        with tempfile.TemporaryDirectory() as tmp_dir:
            os.environ["DATA_DIR"] = tmp_dir
            app = create_app("testing")
            client = app.test_client()

            try:
                # Make the request using the appropriate HTTP method
                if method == "GET":
                    response = client.get(path)
                elif method == "POST":
                    response = client.post(
                        path,
                        json={},
                        content_type="application/json",
                    )
                elif method == "PUT":
                    response = client.put(
                        path,
                        json={},
                        content_type="application/json",
                    )
                elif method == "DELETE":
                    response = client.delete(path)
                else:
                    raise ValueError(f"Unexpected HTTP method: {method}")

                # The route must exist (not 404). Other status codes like
                # 401 (unauthorized), 400 (bad request), 422 (validation error)
                # are acceptable — they indicate the route is registered.
                assert response.status_code != 404, (
                    f"Endpoint {method} {path} returned 404 — "
                    f"route is not registered in the restructured application."
                )
            finally:
                # Restore original DATA_DIR
                if old_data_dir is None:
                    os.environ.pop("DATA_DIR", None)
                else:
                    os.environ["DATA_DIR"] = old_data_dir
