"""
One-time migration: add `role` column to EventsUsers and back-fill owner rows.

Usage:
    cd backend
    python -m scripts.migrate_add_roles
"""

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        # 1. Add column if it doesn't exist
        conn.execute(text(
            """
            ALTER TABLE "EventsUsers"
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member'
            """
        ))
        conn.commit()
        print("Column 'role' ensured on EventsUsers.")

        # 2. Insert missing owner rows (event creators without an EventUser row)
        conn.execute(text(
            """
            INSERT INTO "EventsUsers" (user_id, event_id, role)
            SELECT e.user_id, e.id, 'owner'
            FROM "Events" e
            WHERE NOT EXISTS (
                SELECT 1 FROM "EventsUsers" eu
                WHERE eu.user_id = e.user_id AND eu.event_id = e.id
            )
            """
        ))
        conn.commit()
        print("Inserted missing owner rows.")

        # 3. Set role='owner' on existing creator rows that are still 'member'
        conn.execute(text(
            """
            UPDATE "EventsUsers" eu
            SET role = 'owner'
            FROM "Events" e
            WHERE eu.user_id = e.user_id
              AND eu.event_id = e.id
              AND eu.role != 'owner'
            """
        ))
        conn.commit()
        print("Updated existing owner rows to role='owner'.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
