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
    if completed_reps < target_reps and rir <= 1:
        return "Lower load or rest longer."
    if completed_reps >= target_reps and form_score < 75:
        return "Keep or lower load and fix technique."
    if completed_reps >= target_reps and rir >= 2 and form_score >= 75:
        return "Increase load slightly."
    if completed_reps >= target_reps and rir < 2 and form_score >= 75:
        return "Keep the same load."
    return "Keep the same load."
