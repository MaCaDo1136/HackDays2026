import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = "replab.db"
TEMP_DIR = Path("temp")


def init_db() -> None:
    TEMP_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS WorkoutLog (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise         TEXT    NOT NULL,
            target_reps      INTEGER NOT NULL,
            completed_reps   INTEGER NOT NULL,
            rir              INTEGER NOT NULL,
            overall_score    REAL,
            gemini_analysis  TEXT,   -- NUEVA COLUMNA PARA LA IA
            created_at       TEXT    NOT NULL
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
    gemini_analysis: dict,
) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    gemini_json_str = json.dumps(gemini_analysis) if gemini_analysis else None

    cursor.execute(
        """
        INSERT INTO WorkoutLog (exercise, target_reps, completed_reps, rir, overall_score, gemini_analysis, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            exercise,
            target_reps,
            completed_reps,
            rir,
            overall_score,
            gemini_json_str,
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

    logs = []
    for r in rows:
        row_dict = dict(r)
        if row_dict.get("gemini_analysis"):
            try:
                row_dict["gemini_analysis"] = json.loads(
                    row_dict["gemini_analysis"])
            except json.JSONDecodeError:
                pass
        logs.append(row_dict)

    return logs
