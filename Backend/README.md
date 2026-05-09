# Rep Lab — Backend

FastAPI service that turns a workout video into a quantitative form score, qualitative coaching feedback, and a load-progression recommendation. The pipeline is hybrid: deterministic computer vision (MediaPipe + OpenCV) handles geometry and rep segmentation, and a multimodal LLM (Gemini 2.5 Flash) handles qualitative critique on the extracted keyframes.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Layout](#project-layout)
3. [Setup & Run](#setup--run)
4. [Environment Variables](#environment-variables)
5. [Vision Pipeline](#vision-pipeline)
6. [Exercise Configuration](#exercise-configuration)
7. [API Reference](#api-reference)
8. [Database](#database)
9. [Progression Logic](#progression-logic)

---

## Architecture

```
   Client (multipart video)
            │
            ▼
   ┌──────────────────────┐
   │  FastAPI (main.py)   │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │  cv/pipeline.py                      │
   │   • MediaPipe pose landmarks         │
   │   • Joint-angle computation          │
   │   • Peak/valley rep segmentation     │
   │   • Keyframe extraction (start/      │
   │     bottom/end, tagged good|bad_rom) │
   │   • form_score (0–100)               │
   └──────────┬───────────────────────────┘
              │ keyframes + form_score
              ▼
   ┌──────────────────────────────────────┐
   │  services/gemini_client.py           │
   │   • Sends keyframes to Gemini 2.5    │
   │     Flash with structured-JSON       │
   │     output                           │
   │   • Injects past-corrections history │
   │     for recurring-pattern detection  │
   └──────────┬───────────────────────────┘
              │ rep_scores + correction_cards
              ▼
   ┌──────────────────────────────────────┐
   │  services/progression.py             │
   │   • Heuristic load recommendation    │
   └──────────┬───────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │  database/manager.py (SQLite)        │
   │   • Persists WorkoutLog row          │
   └──────────────────────────────────────┘
```

---

## Project Layout

```
Backend/
├── main.py                  FastAPI app, CORS, lifespan, static mount
├── api/
│   └── routes.py            Endpoints (/api/analyze_set, /api/logs, /health)
├── cv/
│   ├── pipeline.py          extract_keyframes() + EXERCISE_CONFIGS
│   └── pose_detector.py     MediaPipe wrapper (find_pose / find_angle)
├── services/
│   ├── gemini_client.py     call_gemini_multimodal() + stub fallback
│   └── progression.py       calculate_progression()
├── database/
│   └── manager.py           init_db / save_workout_log / get_recent_corrections
├── temp/                    Uploaded videos + extracted keyframes (auto-purged)
├── replab.db                SQLite database file
├── requirements.txt
└── .env                     GEMINI_API_KEY=...
```

---

## Setup & Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then add your GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

The server boots on `http://localhost:8000`. Static keyframes are exposed at `/temp/<filename>.jpg` so the frontend can render the annotated frames returned in `keyframe_paths`.

> **Note:** `python-multipart`, `python-dotenv`, `google-genai`, and `Pillow` are imported by the runtime but missing from `requirements.txt`. Install them explicitly until the file is updated:
>
> ```bash
> pip install python-dotenv google-genai pillow
> ```

---

## Environment Variables

| Name             | Required | Description                                                            |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| `GEMINI_API_KEY` | Yes      | Google AI Studio key for Gemini 2.5 Flash. Read in `services/gemini_client.py`. If absent or set to `your_key_here`, the service gracefully degrades to a stub response so the rest of the pipeline remains testable. |

`.env` example:

```env
GEMINI_API_KEY=AIza...your_key_here
```

---

## Vision Pipeline

The vision pipeline is in `cv/pipeline.py::extract_keyframes()` and is built on top of `cv/pose_detector.py` (a thin MediaPipe wrapper).

### 1. Pose detection (MediaPipe)

`PoseDetector.find_pose()` runs MediaPipe Pose on every video frame and returns the 33 body landmarks. `find_angle(p1, p2, p3)` computes the angle at vertex `p2` formed by `p1→p2→p3` using `atan2`, normalised to `[0, 180]°`.

For each exercise, **one primary angle** drives rep segmentation (e.g. elbow angle for push-ups, knee angle for squats) and zero or more **auxiliary angles** validate full-body form (e.g. hip angle to penalise sagging hips during push-ups).

### 2. Per-frame ROM percentage

The primary angle is mapped onto a 0–100 ROM percentage (`per`) using `np.interp(angle, per_range, (0, 100))`. `per=0` is the bottom of the rep, `per=100` is the top.

### 3. Rep segmentation via direction change

Rather than fixed thresholds (which break on partial reps and atypical body proportions), the pipeline tracks the **trend of `per` over a 5-frame smoothing window**:

* **Valley** detected (down → up): mark the bottom of the current rep.
* **Peak** detected (up → down): close the previous rep and begin the next.

A minimum change of `_MIN_CHANGE = 2.0` percentage points is required across the window to register a direction change — this filters out micro-jitters from the pose estimator.

### 4. Keyframe extraction (`good` vs `bad_rom`)

Three frames are saved per completed rep — **start**, **bottom**, **end** — labelled by quality:

| Quality   | Criteria                                                       |
| --------- | -------------------------------------------------------------- |
| `good`    | `per_min ≤ 5` (full depth) **AND** `per_max ≥ 95` (full lockout) |
| `bad_rom` | Either depth or lockout missed                                 |

Filenames encode rep number and quality:

```
rep1_good_start.jpg     rep1_good_bottom.jpg     rep1_good_end.jpg
rep2_bad_rom_start.jpg  rep2_bad_rom_bottom.jpg  rep2_bad_rom_end.jpg
```

A rep that ends mid-way (video stops before the lockout) is still saved with whatever frames are available, marked `bad_rom`.

### 5. `form_score` (0–100)

Per-rep raw score: `((100 - bottom_per) + top_per) / 2`. `bad_rom` reps are **capped at 50** so a set of shallow reps lands in the 40–50 range instead of inflating the average. The final `form_score` is the mean of per-rep scores, rounded to 1 decimal.

### 6. Handoff to Gemini

The keyframe paths are passed to `services/gemini_client.py::call_gemini_multimodal()`. The prompt:

* Describes that 3 frames per rep are sent in order (start → bottom → end).
* Optionally injects a **history block** built from `get_recent_corrections()` so Gemini can flag recurring issues with `[Recurring]` and celebrate improvements.
* Forces a strict JSON schema via `response_mime_type="application/json"`.
* Constrains language: simple, beginner-friendly English (no jargon, no Spanish).

---

## Exercise Configuration

New exercises are added by extending `EXERCISE_CONFIGS` in `cv/pipeline.py`. Each entry is fully data-driven — no other code changes are required.

```python
EXERCISE_CONFIGS: dict[str, dict] = {
    "push_up": {
        # Primary angle: shoulder(11) → elbow(13) → wrist(15)
        "angle_points": (11, 13, 15),
        # Aux[0]: shoulder angle  Aux[1]: hip angle (anti-sag)
        "aux_points": [(13, 11, 23), (11, 23, 25)],
        # elbow ~90° → 0% (bottom); ~160° → 100% (top)
        "per_range": (90, 160),
        "form_check":   lambda a, aux: a > 160 and len(aux) >= 2 and aux[0] > 40 and aux[1] > 160,
        "bottom_check": lambda a, aux: a <= 90 and (not aux or aux[-1] > 160),
        "top_check":    lambda a, aux: a > 160 and len(aux) >= 2 and aux[0] > 40 and aux[1] > 160,
    },
    ...
}
```

| Field           | Purpose                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `angle_points`  | `(p1, p2, p3)` MediaPipe landmark IDs — `p2` is the vertex.                                      |
| `aux_points`    | List of secondary `(p1, p2, p3)` triples used by form checks (e.g. hip alignment).               |
| `per_range`     | `(angle_at_bottom, angle_at_top)` mapped to `(0%, 100%)`.                                        |
| `form_check`    | `(primary_angle, aux_angles) -> bool` — must be `True` to start tracking (athlete is at the top). |
| `bottom_check`  | Strict geometric standard for a clean bottom — used as documentation/diagnostic.                 |
| `top_check`     | Strict geometric standard for a clean top — used as documentation/diagnostic.                    |

> **Adding a new exercise — checklist**
>
> 1. Pick the joint that drives the rep (e.g. for a deadlift: hip).
> 2. Identify the MediaPipe landmark IDs (see [MediaPipe Pose docs](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)).
> 3. Record a clean rep, log `primary_angle` at the top and bottom, and use those for `per_range`.
> 4. Add aux angles for any form fault you want the rep-quality classifier to penalise.
> 5. Add a string for the new exercise to the frontend selector and the `exercise` form field validation.

The 33 MediaPipe landmark IDs used most often:

```
11 left_shoulder    13 left_elbow    15 left_wrist
12 right_shoulder   14 right_elbow   16 right_wrist
23 left_hip         25 left_knee     27 left_ankle
24 right_hip        26 right_knee    28 right_ankle
```

---

## API Reference

Base URL: `http://localhost:8000`

### `POST /api/analyze_set`

Runs the full pipeline: keyframe extraction → Gemini analysis → progression heuristic → DB log.

**Content-Type:** `multipart/form-data`

| Field            | Type    | Required | Description                                                  |
| ---------------- | ------- | -------- | ------------------------------------------------------------ |
| `video`          | File    | Yes      | Workout video (`.mp4`, `.mov`, etc.).                        |
| `exercise`       | string  | Yes      | One of `push_up`, `squat`, `bicep_curl`.                     |
| `target_reps`    | integer | Yes      | Reps the user was aiming for.                                |
| `completed_reps` | integer | Yes      | Reps the user actually completed (self-reported).            |
| `rir`            | integer | Yes      | Reps In Reserve — estimated reps left in the tank.           |

**cURL example:**

```bash
curl -X POST http://localhost:8000/api/analyze_set \
  -F "video=@./pushups.mp4" \
  -F "exercise=push_up" \
  -F "target_reps=10" \
  -F "completed_reps=8" \
  -F "rir=2"
```

**`200 OK` response:**

```json
{
  "log_id": 42,
  "form_score": 78.5,
  "progression_recommendation": "Lower load or rest longer.",
  "keyframe_paths": [
    "temp/rep1_good_start.jpg",
    "temp/rep1_good_bottom.jpg",
    "temp/rep1_good_end.jpg",
    "temp/rep2_bad_rom_start.jpg",
    "temp/rep2_bad_rom_bottom.jpg",
    "temp/rep2_bad_rom_end.jpg"
  ],
  "gemini_analysis": {
    "rep_scores": [
      { "rep": 1, "score": 88 },
      { "rep": 2, "score": 64 }
    ],
    "best_rep": 1,
    "worst_rep": 2,
    "correction_cards": [
      {
        "rep": 2,
        "issue": "Hips dropping",
        "tip": "Squeeze your butt muscles to keep your body in a straight line."
      }
    ]
  }
}
```

Frontend tip: serve each keyframe by prefixing the path with the API host — `http://localhost:8000/temp/rep1_good_bottom.jpg`. The `/temp` directory is mounted as static files in `main.py`.

**Error responses:**

| Status | Cause                                                                                |
| ------ | ------------------------------------------------------------------------------------ |
| `400`  | Unknown `exercise` value (not in `EXERCISE_CONFIGS`).                                |
| `422`  | OpenCV cannot decode the uploaded video.                                             |

**Cleanup:** Each request first purges leftover `temp/` files, then schedules deletion of its own video + keyframes 300 seconds after the response is returned (giving the frontend time to fetch them).

---

### `GET /api/logs`

Returns every saved workout log, newest first.

```bash
curl http://localhost:8000/api/logs
```

```json
[
  {
    "id": 42,
    "exercise": "push_up",
    "target_reps": 10,
    "completed_reps": 8,
    "rir": 2,
    "overall_score": 78.5,
    "created_at": "2026-05-09T14:21:03.184220+00:00",
    "comments": "[{\"rep\": 2, \"issue\": \"Hips dropping\", \"tip\": \"...\"}]"
  }
]
```

`comments` is a JSON-encoded string of correction cards; clients should `JSON.parse` it before rendering.

---

### `GET /health`

```json
{ "status": "ok" }
```

---

## Database

Persistence is handled by **`sqlite3`** (Python standard library) — not an ORM — through `database/manager.py`. The database file is `replab.db` at the project root and is created on app startup via the FastAPI `lifespan` hook.

> **Heads-up:** the original spec called for SQLAlchemy. The current implementation is plain `sqlite3` for simplicity. If you need migrations, multi-DB support, or relationship modelling, swap in SQLAlchemy by replacing the three functions in `database/manager.py` — the API layer only depends on their signatures.

### `WorkoutLog` schema

```sql
CREATE TABLE IF NOT EXISTS WorkoutLog (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise       TEXT    NOT NULL,
    target_reps    INTEGER NOT NULL,
    completed_reps INTEGER NOT NULL,
    rir            INTEGER NOT NULL,
    overall_score  REAL,
    created_at     TEXT    NOT NULL,   -- ISO-8601 UTC
    comments       TEXT                 -- JSON-encoded list of correction cards
);
```

### Public functions

| Function                                | Used by                              |
| --------------------------------------- | ------------------------------------ |
| `init_db()`                             | `main.py` lifespan startup           |
| `save_workout_log(...) -> int`          | `POST /api/analyze_set`              |
| `get_all_logs() -> list[dict]`          | `GET /api/logs`                      |
| `get_recent_corrections(exercise, limit=5)` | Builds the history block for the Gemini prompt — enables recurring-pattern detection across sessions. |

---

## Progression Logic

`services/progression.py::calculate_progression()` returns a string recommendation based on the four signals collected per set:

```python
if form_score < 75:
    return "Decrease load and focus on technique."
if completed_reps < target_reps or rir <= 1:
    return "Lower load or rest longer."
if rir >= 2:
    return "Increase load slightly."
return "Keep the same load."
```

Order matters: form quality is the gating signal — the user is never told to add load over a broken movement pattern.
