from pathlib import Path

import cv2
import numpy as np

from cv.pose_detector import PoseDetector

TEMP_DIR = Path("temp")

# Exercise configuration
# angle_points : (p1, p2, p3) MediaPipe landmark IDs – p2 is the vertex joint.
# aux_points   : list of (p1, p2, p3) for secondary angles used in form checks.
# per_range    : (angle_at_bottom, angle_at_top) → mapped to (0%, 100%).
# form_check   : (primary_angle, aux_angles) → bool; must be True at start.
# bottom_check : strict geometric standard for a correct bottom position.
# top_check    : strict geometric standard for a correct top position.
#
# Rep quality uses per% equivalents of these strict standards:
#   per_min_this_rep <= 5  (≈ bottom_check depth)
#   per_max_this_rep >= 95 (≈ top_check extension)
# Both must be met for a rep to be labelled "good"; otherwise "bad_rom".
EXERCISE_CONFIGS: dict[str, dict] = {
    "push_up": {
        # Elbow angle: left shoulder(11) → elbow(13) → wrist(15)
        "angle_points": (11, 13, 15),
        # Aux[0]: shoulder angle  Aux[1]: hip angle
        "aux_points": [(13, 11, 23), (11, 23, 25)],
        # elbow ~90° → per=0 (bottom); elbow ~160° → per=100 (top)
        "per_range": (90, 160),
        "form_check": lambda a, aux: a > 160 and len(aux) >= 2 and aux[0] > 40 and aux[1] > 160,
        "bottom_check": lambda a, aux: a <= 90 and (not aux or aux[-1] > 160),
        "top_check": lambda a, aux: a > 160 and len(aux) >= 2 and aux[0] > 40 and aux[1] > 160,
    },
    "squat": {
        # Knee angle: left hip(23) → knee(25) → ankle(27)
        "angle_points": (23, 25, 27),
        "aux_points": [],
        # knee ~90° → per=0 (parallel); knee ~170° → per=100 (standing)
        "per_range": (90, 170),
        "form_check": lambda a, aux: a > 160,
        "bottom_check": lambda a, aux: a < 90,
        "top_check": lambda a, aux: a > 160,
    },
    "bicep_curl": {
        # Elbow angle: left shoulder(11) → elbow(13) → wrist(15)
        "angle_points": (11, 13, 15),
        "aux_points": [],
        # elbow ~30° → per=0 (peak contraction); elbow ~160° → per=100 (extended)
        "per_range": (30, 160),
        "form_check": lambda a, aux: a > 150,
        "bottom_check": lambda a, aux: a < 40,
        "top_check": lambda a, aux: a > 150,
    },
}

# Frames of per-history used to smooth the direction trend.
_SMOOTH_WINDOW = 5
# Minimum per% change across the window needed to register a new direction.
_MIN_CHANGE = 2.0


def _save_frame(frame: np.ndarray, rep_tag: str, position: str) -> str:
    TEMP_DIR.mkdir(exist_ok=True)
    path = TEMP_DIR / f"{rep_tag}_{position}.jpg"
    cv2.imwrite(str(path), frame)
    return str(path)


def extract_keyframes(video_path: str, exercise_type: str) -> tuple[list[str], float]:
    """
    Process a workout video and extract annotated keyframes per rep using
    direction-change (peak/valley) detection instead of fixed ROM thresholds.

    Saved filenames encode the rep number and ROM quality:
      repN_good_start.jpg    / repN_bad_rom_start.jpg
      repN_good_bottom.jpg   / repN_bad_rom_bottom.jpg
      repN_good_end.jpg      / repN_bad_rom_end.jpg   (omitted for incomplete reps)

    A rep is "good" only when per_min_this_rep <= 5 (full depth) AND
    per_max_this_rep >= 95 (full extension). Any rep that reverses direction before
    meeting both strict standards is saved as "bad_rom" so the multimodal AI can
    generate appropriate correction cards.

    form_score (0–100) is the mean of per-rep scores:
      raw_score = ((100 - bottom_per%) + top_per%) / 2
      bad_rom reps are capped at 50, so a set of shallow reps scores in the 40s–50s
      rather than inflating the overall number.
    """
    config = EXERCISE_CONFIGS.get(exercise_type)
    if config is None:
        raise ValueError(
            f"Unknown exercise '{exercise_type}'. Choose from: {list(EXERCISE_CONFIGS)}"
        )

    detector = PoseDetector()
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Cannot open video file: {video_path}")

    saved_paths: list[str] = []
    form_valid = False
    rep_count = 0

    per_history: list[float] = []
    current_direction: str | None = None  # "up" | "down"

    # Track the actual extreme frame/per within the current movement phase.
    phase_min_per = 100.0
    phase_min_frame: np.ndarray | None = None
    phase_max_per = 0.0
    phase_max_frame: np.ndarray | None = None

    pending_start_frame: np.ndarray | None = None
    pending_bottom: tuple[np.ndarray, float] | None = None  # (frame, per) at valley
    in_rep = False  # True after a valley is detected, waiting for the next peak

    rep_scores: list[float] = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = detector.find_pose(frame, draw=True)
        lm_list = detector.find_position(frame, draw=False)
        if not lm_list:
            continue

        p1, p2, p3 = config["angle_points"]
        primary_angle = detector.find_angle(frame, p1, p2, p3, draw=True)

        aux_angles: list[float] = []
        for ap1, ap2, ap3 in config.get("aux_points", []):
            aux_angles.append(detector.find_angle(frame, ap1, ap2, ap3, draw=False))

        per = float(
            np.clip(np.interp(primary_angle, config["per_range"], (0, 100)), 0.0, 100.0)
        )

        # Wait for a valid starting position (top of the movement).
        if not form_valid:
            if config["form_check"](primary_angle, aux_angles):
                form_valid = True
                current_direction = "up"  # we're at the top; first movement will go down
                phase_max_per = per
                phase_max_frame = frame.copy()
                pending_start_frame = frame.copy()
            continue

        per_history.append(per)
        if len(per_history) > _SMOOTH_WINDOW:
            per_history.pop(0)

        # Update per-phase extremes on every frame.
        if per < phase_min_per:
            phase_min_per = per
            phase_min_frame = frame.copy()
        if per > phase_max_per:
            phase_max_per = per
            phase_max_frame = frame.copy()

        if len(per_history) < _SMOOTH_WINDOW:
            continue

        # Determine trend over the smoothing window.
        trend = per_history[-1] - per_history[0]
        if abs(trend) < _MIN_CHANGE:
            new_direction = current_direction  # too noisy to call
        elif trend < 0:
            new_direction = "down"
        else:
            new_direction = "up"

        if new_direction == current_direction or new_direction is None:
            continue

        # ── Direction changed ──────────────────────────────────────────────
        if new_direction == "up":
            # Valley detected: person was going down, now going up → bottom of rep.
            pending_bottom = (
                phase_min_frame.copy() if phase_min_frame is not None else frame.copy(),
                phase_min_per,
            )
            in_rep = True
            # Reset phase tracking for the upward movement.
            phase_min_per = per
            phase_min_frame = frame.copy()
            phase_max_per = per
            phase_max_frame = frame.copy()

        else:  # new_direction == "down"
            # Peak detected: person was going up, now going down → top of rep.
            if in_rep and pending_bottom is not None:
                rep_count += 1
                rep_tag = f"rep{rep_count}"
                bottom_frame, bottom_per = pending_bottom
                quality = "good" if bottom_per <= 5 and phase_max_per >= 95 else "bad_rom"

                if pending_start_frame is not None:
                    saved_paths.append(
                        _save_frame(pending_start_frame, rep_tag, f"{quality}_start")
                    )
                saved_paths.append(_save_frame(bottom_frame, rep_tag, f"{quality}_bottom"))
                end_frame = phase_max_frame if phase_max_frame is not None else frame.copy()
                saved_paths.append(_save_frame(end_frame, rep_tag, f"{quality}_end"))

                raw_score = ((100.0 - bottom_per) + phase_max_per) / 2.0
                rep_score = min(raw_score, 50.0) if quality == "bad_rom" else raw_score
                rep_scores.append(rep_score)
                in_rep = False
                pending_bottom = None

            # This peak is the start frame for the next rep.
            pending_start_frame = (
                phase_max_frame.copy() if phase_max_frame is not None else frame.copy()
            )
            # Reset phase tracking for the downward movement.
            phase_min_per = per
            phase_min_frame = frame.copy()
            phase_max_per = 0.0
            phase_max_frame = None

        current_direction = new_direction

    cap.release()

    # Persist an incomplete rep: bottom reached but video ended before return to top.
    if in_rep and pending_bottom is not None:
        rep_count += 1
        rep_tag = f"rep{rep_count}"
        bottom_frame, bottom_per = pending_bottom
        quality = "good" if bottom_per <= 5 and phase_max_per >= 95 else "bad_rom"
        if pending_start_frame is not None:
            saved_paths.append(_save_frame(pending_start_frame, rep_tag, f"{quality}_start"))
        saved_paths.append(_save_frame(bottom_frame, rep_tag, f"{quality}_bottom"))
        # top extension = 0 since the rep never completed
        raw_score = (100.0 - bottom_per) / 2.0
        rep_score = min(raw_score, 50.0) if quality == "bad_rom" else raw_score
        rep_scores.append(rep_score)

    form_score = round(float(np.mean(rep_scores)), 1) if rep_scores else 0.0

    return saved_paths, form_score
