"""
One-time migration: add notes column to Sessions.

Usage:
    cd backend
    python -m scripts.migrate_add_session_notes
"""

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        conn.execute(text(
            """
            ALTER TABLE "Sessions"
            ADD COLUMN IF NOT EXISTS notes TEXT
            """
        ))
        conn.commit()
        print("Column 'notes' ensured on Sessions.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
