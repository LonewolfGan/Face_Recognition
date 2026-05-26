"""
Database abstraction layer — supports SQLite (dev) and PostgreSQL (production).

All SQL should use ? placeholders; they are auto-translated to %s for psycopg2.
Use open_connection(app.config) to get a UnifiedConnection.

Typical usage in a Flask route:
    db = get_db()                  # returns request-scoped UnifiedConnection
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()        # always a plain dict or None
"""

import sqlite3
from typing import Optional


class UnifiedCursor:
    """Wraps sqlite3 / psycopg2 cursors with a common interface.

    - execute() translates ? → %s for PostgreSQL automatically.
    - fetchone() / fetchall() always return plain dicts (never Row objects).
    - rowcount is always available.
    - lastrowid works for SQLite only; use conn.insert_returning_id() for PostgreSQL.
    """

    def __init__(self, raw_cursor, backend: str):
        self._c = raw_cursor
        self._backend = backend

    def execute(self, sql: str, params=None):
        if self._backend == "postgresql":
            sql = sql.replace("?", "%s")
        if params is not None:
            self._c.execute(sql, list(params))
        else:
            self._c.execute(sql)
        return self

    def fetchone(self) -> Optional[dict]:
        row = self._c.fetchone()
        return dict(row) if row is not None else None

    def fetchall(self) -> list:
        return [dict(row) for row in self._c.fetchall()]

    @property
    def rowcount(self) -> int:
        return self._c.rowcount

    @property
    def lastrowid(self):
        return self._c.lastrowid if self._backend == "sqlite" else None


class UnifiedConnection:
    """Wraps a database connection (SQLite or PostgreSQL) with a uniform API."""

    def __init__(self, backend: str, raw_conn):
        self._backend = backend
        self._conn = raw_conn

    @property
    def backend(self) -> str:
        return self._backend

    def cursor(self) -> UnifiedCursor:
        if self._backend == "postgresql":
            import psycopg2.extras
            raw = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            self._conn.row_factory = sqlite3.Row
            raw = self._conn.cursor()
        return UnifiedCursor(raw, self._backend)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        if hasattr(self._conn, "rollback"):
            self._conn.rollback()

    def close(self):
        self._conn.close()

    def insert_returning_id(self, sql: str, params, id_column: str) -> int:
        """Execute an INSERT and return the generated integer primary key.

        PostgreSQL: appends RETURNING {id_column} to leverage server-side sequences.
        SQLite:     uses cursor.lastrowid after the insert.
        """
        if self._backend == "postgresql":
            import psycopg2.extras
            raw = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            pg_sql = sql.replace("?", "%s").rstrip(";") + f" RETURNING {id_column}"
            raw.execute(pg_sql, list(params))
            row = raw.fetchone()
            self._conn.commit()
            return row[id_column]
        else:
            self._conn.row_factory = sqlite3.Row
            raw = self._conn.cursor()
            raw.execute(sql, params)
            self._conn.commit()
            return raw.lastrowid

    def add_column_if_missing(self, table: str, column: str, definition: str) -> None:
        """Add a column to a table only if it does not already exist.

        Handles the difference between SQLite (catch exception) and
        PostgreSQL (query information_schema, rollback on error).
        """
        if self._backend == "postgresql":
            import psycopg2.extras
            check_cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            check_cur.execute(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = %s AND column_name = %s",
                (table, column),
            )
            if check_cur.fetchone():
                return
            check_cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            self._conn.commit()
        else:
            try:
                cur = self._conn.cursor()
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                self._conn.commit()
            except Exception:
                pass


def open_connection(app_config: dict) -> UnifiedConnection:
    """Open a database connection from Flask app config.

    Priority:
      1. DATABASE_URL — PostgreSQL (Neon, Render Postgres, etc.)
      2. DATABASE_PATH — SQLite file path (local development default)
    """
    url: str = app_config.get("DATABASE_URL", "") or ""
    if url and ("postgresql://" in url or "postgres://" in url):
        import psycopg2
        conn = psycopg2.connect(url)
        return UnifiedConnection("postgresql", conn)

    path: str = app_config.get("DATABASE_PATH", "data/users.db") or "data/users.db"
    conn = sqlite3.connect(path)
    return UnifiedConnection("sqlite", conn)
