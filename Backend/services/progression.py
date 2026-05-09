def calculate_progression(
    completed_reps: int,
    target_reps: int,
    rir: int,
    form_score: float,
) -> str:
    """
    Returns a load-progression recommendation.

    completed_reps : reps actually performed
    target_reps    : reps the user was aiming for
    rir            : Reps In Reserve (self-reported reps left in the tank)
    form_score     : 0–100 quality score from extract_keyframes
    """
    if form_score < 75:
        return "Decrease load and focus on technique."
    if completed_reps < target_reps or rir <= 1:
        return "Lower load or rest longer."
    if rir >= 2:
        return "Increase load slightly."
    return "Keep the same load."
