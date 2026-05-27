"""Database migration entry point for Render preDeployCommand.

Render runs this script before the new web-service instance starts.
If this script exits with a non-zero code the deploy is cancelled and
the currently-running instance stays live — zero downtime on failure.

What it does:
  - Calls create_app(), which internally runs _init_database().
  - _init_database() executes all CREATE TABLE IF NOT EXISTS statements
    and all add_column_if_missing() calls (schema migrations).
  - Prints a clear success/failure line for the Render deploy log.
"""

import os
import sys

# Ensure imports resolve relative to this file's directory (backend/)
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

def main() -> int:
    env = os.getenv("FLASK_ENV", "production")
    print(f"[migrate] FLASK_ENV={env}")
    print("[migrate] Connecting to database and applying schema…")

    try:
        app = create_app(env)
        with app.app_context():
            pass  # schema already applied inside create_app → _init_database
        print("[migrate] Schema up-to-date. Migration complete.")
        return 0
    except Exception as exc:
        print(f"[migrate] FAILED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
