from pathlib import Path

import cv2
import numpy as np

from cv.pose_detector import PoseDetector

TEMP_DIR = Path("temp")

# Exercise configuration
# Each entry defines how to measure, validate, and state-machine a rep.
#
# angle_points : (p1, p2, p3) MediaPipe landmark IDs – p2 is the vertex joint.
# aux_points   : list of (p1, p2, p3) for secondary angles used in form checks.
# per_range    : (angle_at_bottom, angle_at_top) → mapped to (0%, 100%).
# form_check   : (primary_angle, aux_angles) → bool; must be True at start.
# bottom_check : True when the rep's lowest point is reached.
# top_check    : True when the rep's highest point is reached.
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


def _save_frame(frame: np.ndarray, rep_tag: str, position: str) -> str:
    TEMP_DIR.mkdir(exist_ok=True)
    path = TEMP_DIR / f"{rep_tag}_{position}.jpg"
    cv2.imwrite(str(path), frame)
    return str(path)


def extract_keyframes(video_path: str, exercise_type: str) -> tuple[list[str], float]:
    """
    Process a workout video and extract 3 annotated keyframes per rep:
      - repN_start.jpg  – top/start position (arms/legs extended)
      - repN_bottom.jpg – deepest point of the rep
      - repN_end.jpg    – return to top position

    form_score (0–100) is a range-of-motion quality proxy:
      - depth_score    = 100 minus the average per% at the bottom (lower = deeper = better)
      - extension_score = average per% at the top (higher = fuller extension = better)
      - form_score     = mean of the two

    Raises ValueError for unsupported exercise types.
    Raises IOError if the video cannot be opened.
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
    # 0 = expecting bottom next (going down), 1 = expecting top next (coming up)
    direction = 0
    rep_count = 0
    pending_start_frame = None  # Last "top" frame buffered to use as the rep's start image

    # ROM quality accumulators
    per_min_this_rep = 100.0   # Tracks deepest point while going down
    per_max_this_rep = 0.0     # Tracks highest point while coming up
    bottom_depths: list[float] = []
    top_extensions: list[float] = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Draw skeleton annotations onto the frame before any saving
        frame = detector.find_pose(frame, draw=True)
        lm_list = detector.find_position(frame, draw=False)
        if not lm_list:
            continue

        p1, p2, p3 = config["angle_points"]
        primary_angle = detector.find_angle(frame, p1, p2, p3, draw=True)

        aux_angles: list[float] = []
        for ap1, ap2, ap3 in config.get("aux_points", []):
            # Secondary angles drawn without extra annotation to keep frames clean
            aux_angles.append(detector.find_angle(
                frame, ap1, ap2, ap3, draw=False))

        per = float(
            np.clip(np.interp(primary_angle, config["per_range"], (0, 100)), 0.0, 100.0))

        # --- Wait for valid starting position (top of the movement) ---
        if not form_valid:
            if config["form_check"](primary_angle, aux_angles):
                form_valid = True
                pending_start_frame = frame.copy()
            continue

        # --- Track completion-percentage extremes for form scoring ---
        if direction == 0:
            per_min_this_rep = min(per_min_this_rep, per)
        else:
            per_max_this_rep = max(per_max_this_rep, per)

        # Keep refreshing the start-frame buffer while still near the top
        if per >= 90 and direction == 0:
            pending_start_frame = frame.copy()

        # --- Transition: top → bottom ---
        if per <= 5 and direction == 0 and config["bottom_check"](primary_angle, aux_angles):
            rep_tag = f"rep{rep_count + 1}"
            if pending_start_frame is not None:
                saved_paths.append(_save_frame(
                    pending_start_frame, rep_tag, "start"))
            saved_paths.append(_save_frame(frame, rep_tag, "bottom"))
            bottom_depths.append(per_min_this_rep)
            per_min_this_rep = 100.0
            direction = 1

        # --- Transition: bottom → top (rep complete) ---
        elif per >= 95 and direction == 1 and config["top_check"](primary_angle, aux_angles):
            rep_tag = f"rep{rep_count + 1}"
            saved_paths.append(_save_frame(frame, rep_tag, "end"))
            top_extensions.append(per_max_this_rep)
            per_max_this_rep = 0.0
            rep_count += 1
            direction = 0
            # Buffer this top frame immediately as the start of the next rep
            pending_start_frame = frame.copy()

    cap.release()

    if bottom_depths and top_extensions:
        # lower bottom → higher score
        depth_score = 100.0 - float(np.mean(bottom_depths))
        # higher top   → higher score
        extension_score = float(np.mean(top_extensions))
        form_score = round((depth_score + extension_score) / 2.0, 1)
    else:
        form_score = 0.0

    return saved_paths, form_score
