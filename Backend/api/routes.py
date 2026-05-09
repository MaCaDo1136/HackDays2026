import asyncio
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse

from cv.pipeline import extract_keyframes
from database.manager import get_all_logs, save_workout_log
from services.gemini_client import call_gemini_multimodal
from services.progression import calculate_progression

router = APIRouter()

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)


def _purge_temp_dir() -> None:
    """Delete all video and keyframe files left over from previous requests."""
    for pattern in ("*.jpg", "*.mp4", "*.mov", "*.MP4", "*.MOV"):
        for stale_file in TEMP_DIR.glob(pattern):
            try:
                stale_file.unlink()
            except Exception:
                pass


async def _cleanup_after_delay(file_paths: list[str], delay_seconds: int = 300) -> None:
    """Safety-net: delete this request's files after the frontend has had time to load them."""
    await asyncio.sleep(delay_seconds)
    for path in file_paths:
        try:
            Path(path).unlink(missing_ok=True)
        except Exception:
            pass


@router.post("/api/analyze_set")
async def analyze_set(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...,
                             description="Workout video file (mp4, mov, etc.)"),
    exercise: str = Form(..., description="push_up | squat | bicep_curl"),
    target_reps: int = Form(...,
                            description="Number of reps the user aimed for"),
    completed_reps: int = Form(...,
                               description="Reps the user actually completed (self-reported)"),
    rir: int = Form(...,
                    description="Reps In Reserve – estimated reps left in the tank"),
):
    """
    Full analysis pipeline:
      1. Save the uploaded video to temp/
      2. Run MediaPipe keyframe extraction
      3. Call Gemini multimodal stub
      4. Compute progression recommendation
      5. Persist to WorkoutLog table
      6. Queue cleanup task to prevent storage leaks
      7. Return full result payload
    """
    _purge_temp_dir()

    video_path = TEMP_DIR / (video.filename or "upload.mp4")
    with open(video_path, "wb") as f:
        f.write(await video.read())

    loop = asyncio.get_event_loop()
    try:
        keyframe_paths, form_score = await loop.run_in_executor(
            None, extract_keyframes, str(video_path), exercise
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except IOError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    gemini_result = call_gemini_multimodal(keyframe_paths, exercise)

    progression = calculate_progression(
        completed_reps, target_reps, rir, form_score
    )

    log_id = save_workout_log(
        exercise, target_reps, completed_reps, rir, form_score
    )

    files_to_delete = [str(video_path)] + keyframe_paths
    background_tasks.add_task(_cleanup_after_delay, files_to_delete, 300)

    return JSONResponse({
        "log_id": log_id,
        "form_score": form_score,
        "progression_recommendation": progression,
        "keyframe_paths": keyframe_paths,
        "gemini_analysis": gemini_result,
    })


@router.get("/api/logs")
def get_logs():
    """Return all workout logs ordered newest first."""
    return get_all_logs()


@router.get("/health")
def health():
    return {"status": "ok"}
