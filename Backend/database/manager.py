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
            created_at     TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_workout_log(
    exercise: str,
    target_reps: int,
    completed_reps: int,
    rir: int,
    overall_score: float,
) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO WorkoutLog (exercise, target_reps, completed_reps, rir, overall_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            exercise,
            target_reps,
            completed_reps,
            rir,
            overall_score,
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()
    return log_id


def get_all_logs() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM WorkoutLog ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
