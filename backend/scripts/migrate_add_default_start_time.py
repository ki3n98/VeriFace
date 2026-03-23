"""
One-time migration: add default_start_time column to Events.

Usage:
    cd backend
    python -m scripts.migrate_add_default_start_time
"""

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        conn.execute(text(
            """
            ALTER TABLE "Events"
            ADD COLUMN IF NOT EXISTS default_start_time TIME
            """
        ))
        conn.commit()
        print("Column 'default_start_time' ensured on Events.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
