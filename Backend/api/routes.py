import asyncio
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from cv.pipeline import extract_keyframes
from database.manager import get_all_logs, save_workout_log
from services.gemini_client import call_gemini_multimodal
from services.progression import calculate_progression

router = APIRouter()

TEMP_DIR = Path("temp")


@router.post("/api/analyze_set")
async def analyze_set(
    video: UploadFile = File(..., description="Workout video file (mp4, mov, etc.)"),
    exercise: str = Form(..., description="push_up | squat | bicep_curl"),
    target_reps: int = Form(..., description="Number of reps the user aimed for"),
    completed_reps: int = Form(..., description="Reps the user actually completed (self-reported)"),
    rir: int = Form(..., description="Reps In Reserve – estimated reps left in the tank"),
):
    """
    Full analysis pipeline:
      1. Save the uploaded video to temp/
      2. Run MediaPipe keyframe extraction (offloaded to a thread pool so FastAPI stays non-blocking)
      3. Call Gemini multimodal stub
      4. Compute progression recommendation
      5. Persist to WorkoutLog table
      6. Return full result payload
    """
    # 1. Persist video to disk
    video_path = TEMP_DIR / (video.filename or "upload.mp4")
    with open(video_path, "wb") as f:
        f.write(await video.read())

    # 2. Extract keyframes – cv2/mediapipe are CPU-bound blocking calls;
    #    run_in_executor offloads them to a thread so the event loop stays free.
    loop = asyncio.get_event_loop()
    try:
        keyframe_paths, form_score = await loop.run_in_executor(
            None, extract_keyframes, str(video_path), exercise
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except IOError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # 3. Gemini analysis (stub – plug in google-genai SDK here)
    gemini_result = call_gemini_multimodal(keyframe_paths, exercise)

    # 4. Progression recommendation
    progression = calculate_progression(completed_reps, target_reps, rir, form_score)

    # 5. Persist result
    log_id = save_workout_log(exercise, target_reps, completed_reps, rir, form_score)

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
