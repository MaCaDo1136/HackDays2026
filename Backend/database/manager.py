import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = "replab.db"
TEMP_DIR = Path("temp")


def init_db() -> None:
    TEMP_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS WorkoutLog (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise       TEXT    NOT NULL,
            target_reps    INTEGER NOT NULL,
            completed_reps INTEGER NOT NULL,
            rir            INTEGER NOT NULL,
            overall_score  REAL,
            created_at     TEXT    NOT NULL,
            comments       TEXT
        )
    """)
    # Safe migration: add the column if the table was created before this field existed
    try:
        conn.execute("ALTER TABLE WorkoutLog ADD COLUMN comments TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.commit()
    conn.close()


def save_workout_log(
    exercise: str,
    target_reps: int,
    completed_reps: int,
    rir: int,
    overall_score: float,
    comments: list | None = None,
) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO WorkoutLog (exercise, target_reps, completed_reps, rir, overall_score, created_at, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            exercise,
            target_reps,
            completed_reps,
            rir,
            overall_score,
            datetime.now(timezone.utc).isoformat(),
            json.dumps(comments) if comments else "[]",
        ),
    )
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()
    return log_id


def get_recent_corrections(exercise: str, limit: int = 5) -> list[dict]:
    """Return correction cards from the last `limit` sessions for this exercise.

    Each entry has 'session' (ISO timestamp) and 'corrections' (list of cards).
    Used to build a personalized history context for the Gemini prompt.
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT created_at, comments FROM WorkoutLog
        WHERE exercise = ? AND comments IS NOT NULL AND comments != '[]'
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (exercise, limit),
    ).fetchall()
    conn.close()

    sessions = []
    for row in rows:
        try:
            cards = json.loads(row["comments"])
            if cards:
                sessions.append(
                    {"session": row["created_at"], "corrections": cards})
        except (json.JSONDecodeError, KeyError):
            pass
    return sessions


def get_all_logs() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM WorkoutLog ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
