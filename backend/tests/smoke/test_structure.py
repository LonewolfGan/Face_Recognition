"""Smoke tests for project directory structure.

Verifies that the restructured project has all expected directories,
files, and configurations in place.

Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
"""

import json
import os

import yaml
import pytest


# Determine project root relative to this test file location
# This file is at: backend/tests/smoke/test_structure.py
# Project root is 3 levels up
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_TESTS_DIR = os.path.dirname(TEST_DIR)
BACKEND_DIR = os.path.dirname(BACKEND_TESTS_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


class TestDirectoryStructure:
    """Verify all expected directories and __init__.py files exist."""

    @pytest.mark.parametrize("package_path", [
        os.path.join("backend", "app"),
        os.path.join("backend", "app", "routes"),
        os.path.join("backend", "app", "services"),
        os.path.join("backend", "app", "models"),
        os.path.join("backend", "tests"),
        os.path.join("backend", "tests", "routes"),
        os.path.join("backend", "tests", "services"),
        os.path.join("backend", "tests", "models"),
        os.path.join("backend", "tests", "properties"),
        os.path.join("backend", "tests", "smoke"),
    ])
    def test_package_directory_exists(self, package_path):
        """Each package directory should exist."""
        full_path = os.path.join(PROJECT_ROOT, package_path)
        assert os.path.isdir(full_path), f"Directory missing: {package_path}"

    @pytest.mark.parametrize("package_path", [
        os.path.join("backend", "app"),
        os.path.join("backend", "app", "routes"),
        os.path.join("backend", "app", "services"),
        os.path.join("backend", "app", "models"),
        os.path.join("backend", "tests"),
        os.path.join("backend", "tests", "routes"),
        os.path.join("backend", "tests", "services"),
        os.path.join("backend", "tests", "models"),
        os.path.join("backend", "tests", "properties"),
        os.path.join("backend", "tests", "smoke"),
    ])
    def test_init_py_exists(self, package_path):
        """Each package directory should have an __init__.py."""
        init_path = os.path.join(PROJECT_ROOT, package_path, "__init__.py")
        assert os.path.isfile(init_path), f"__init__.py missing in: {package_path}"


class TestKeyFilesExist:
    """Verify key application files exist."""

    @pytest.mark.parametrize("file_path", [
        os.path.join("backend", "app", "config.py"),
        os.path.join("backend", "app", "auth.py"),
        os.path.join("backend", "app", "validators.py"),
        os.path.join("backend", "app", "rate_limiter.py"),
        os.path.join("backend", "app", "cors.py"),
        os.path.join("backend", "app", "routes", "auth.py"),
        os.path.join("backend", "app", "routes", "notes.py"),
        os.path.join("backend", "app", "routes", "folders.py"),
        os.path.join("backend", "app", "routes", "faces.py"),
        os.path.join("backend", "app", "routes", "health.py"),
        os.path.join("backend", "app", "services", "face_service.py"),
        os.path.join("backend", "app", "services", "embedding_service.py"),
        os.path.join("backend", "app", "models", "user.py"),
        os.path.join("backend", "app", "models", "note.py"),
        os.path.join("backend", "app", "models", "folder.py"),
    ])
    def test_application_file_exists(self, file_path):
        """Each key application file should exist."""
        full_path = os.path.join(PROJECT_ROOT, file_path)
        assert os.path.isfile(full_path), f"File missing: {file_path}"


class TestRunPyImportsCreateApp:
    """Verify backend/run.py imports create_app."""

    def test_run_py_exists(self):
        """run.py should exist in the backend directory."""
        run_path = os.path.join(PROJECT_ROOT, "backend", "run.py")
        assert os.path.isfile(run_path), "backend/run.py is missing"

    def test_run_py_imports_create_app(self):
        """run.py should import create_app from the app package."""
        run_path = os.path.join(PROJECT_ROOT, "backend", "run.py")
        with open(run_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "from app import create_app" in content or \
               "from app import create_app" in content.replace("  ", " "), \
               "run.py does not import create_app from app package"


class TestDevScriptsExist:
    """Verify dev scripts exist at project root."""

    def test_dev_bat_exists(self):
        """dev.bat should exist at project root."""
        path = os.path.join(PROJECT_ROOT, "dev.bat")
        assert os.path.isfile(path), "dev.bat is missing from project root"

    def test_dev_sh_exists(self):
        """dev.sh should exist at project root."""
        path = os.path.join(PROJECT_ROOT, "dev.sh")
        assert os.path.isfile(path), "dev.sh is missing from project root"


class TestVercelJson:
    """Verify frontend/vercel.json exists and has valid structure."""

    def test_vercel_json_exists(self):
        """vercel.json should exist in the frontend directory."""
        path = os.path.join(PROJECT_ROOT, "frontend", "vercel.json")
        assert os.path.isfile(path), "frontend/vercel.json is missing"

    def test_vercel_json_is_valid_json(self):
        """vercel.json should be valid JSON."""
        path = os.path.join(PROJECT_ROOT, "frontend", "vercel.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, dict), "vercel.json should be a JSON object"

    def test_vercel_json_has_framework_key(self):
        """vercel.json should contain a 'framework' key."""
        path = os.path.join(PROJECT_ROOT, "frontend", "vercel.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "framework" in data, "vercel.json missing 'framework' key"


class TestRenderYaml:
    """Verify render.yaml exists and has valid structure."""

    def test_render_yaml_exists(self):
        """render.yaml should exist at project root."""
        path = os.path.join(PROJECT_ROOT, "render.yaml")
        assert os.path.isfile(path), "render.yaml is missing from project root"

    def test_render_yaml_is_valid_yaml(self):
        """render.yaml should be valid YAML."""
        path = os.path.join(PROJECT_ROOT, "render.yaml")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        assert isinstance(data, dict), "render.yaml should be a YAML mapping"

    def test_render_yaml_has_services_key(self):
        """render.yaml should contain a 'services' key."""
        path = os.path.join(PROJECT_ROOT, "render.yaml")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        assert "services" in data, "render.yaml missing 'services' key"


class TestGitignore:
    """Verify .gitignore covers Python and Node artifacts."""

    def test_gitignore_exists(self):
        """.gitignore should exist at project root."""
        path = os.path.join(PROJECT_ROOT, ".gitignore")
        assert os.path.isfile(path), ".gitignore is missing from project root"

    def test_gitignore_covers_pycache(self):
        """.gitignore should include __pycache__/."""
        path = os.path.join(PROJECT_ROOT, ".gitignore")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "__pycache__/" in content, \
            ".gitignore does not cover __pycache__/"

    def test_gitignore_covers_node_modules(self):
        """.gitignore should include node_modules/."""
        path = os.path.join(PROJECT_ROOT, ".gitignore")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "node_modules/" in content, \
            ".gitignore does not cover node_modules/"


class TestDataDirectory:
    """Verify backend/data/.gitkeep exists."""

    def test_gitkeep_exists(self):
        """backend/data/.gitkeep should exist."""
        path = os.path.join(PROJECT_ROOT, "backend", "data", ".gitkeep")
        assert os.path.isfile(path), "backend/data/.gitkeep is missing"
