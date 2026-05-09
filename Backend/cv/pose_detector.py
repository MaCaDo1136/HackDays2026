import math

import cv2
import mediapipe as mp
import numpy as np


class PoseDetector:
    def __init__(
        self,
        static_image_mode: bool = False,
        model_complexity: int = 1,
        smooth_landmarks: bool = True,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        self._mp_draw = mp.solutions.drawing_utils
        self._mp_pose = mp.solutions.pose
        self._pose = self._mp_pose.Pose(
            static_image_mode=static_image_mode,
            model_complexity=model_complexity,
            smooth_landmarks=smooth_landmarks,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self._results = None
        self.lm_list: list = []

    def find_pose(self, img: np.ndarray, draw: bool = True) -> np.ndarray:
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self._results = self._pose.process(img_rgb)
        if self._results.pose_landmarks and draw:
            self._mp_draw.draw_landmarks(
                img, self._results.pose_landmarks, self._mp_pose.POSE_CONNECTIONS
            )
        return img

    def find_position(self, img: np.ndarray, draw: bool = True) -> list:
        self.lm_list = []
        if self._results and self._results.pose_landmarks:
            h, w, _ = img.shape
            for idx, lm in enumerate(self._results.pose_landmarks.landmark):
                cx, cy = int(lm.x * w), int(lm.y * h)
                self.lm_list.append([idx, cx, cy])
                if draw:
                    cv2.circle(img, (cx, cy), 5, (255, 0, 0), cv2.FILLED)
        return self.lm_list

    def find_angle(self, img: np.ndarray, p1: int, p2: int, p3: int, draw: bool = True) -> float:
        if len(self.lm_list) <= max(p1, p2, p3):
            return 0.0

        x1, y1 = self.lm_list[p1][1:]
        x2, y2 = self.lm_list[p2][1:]
        x3, y3 = self.lm_list[p3][1:]

        angle = math.degrees(
            math.atan2(y3 - y2, x3 - x2) - math.atan2(y1 - y2, x1 - x2)
        )
        # Normalise to [0, 180]
        if angle < 0:
            angle += 360
            if angle > 180:
                angle = 360 - angle
        elif angle > 180:
            angle = 360 - angle

        if draw:
            cv2.line(img, (x1, y1), (x2, y2), (255, 255, 255), 3)
            cv2.line(img, (x3, y3), (x2, y2), (255, 255, 255), 3)
            for pt in [(x1, y1), (x2, y2), (x3, y3)]:
                cv2.circle(img, pt, 5, (0, 0, 255), cv2.FILLED)
                cv2.circle(img, pt, 15, (0, 0, 255), 2)
            cv2.putText(
                img, str(int(angle)), (x2 - 50, y2 + 50),
                cv2.FONT_HERSHEY_PLAIN, 2, (0, 0, 255), 2,
            )
        return float(angle)
