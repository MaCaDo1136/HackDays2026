import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()


def call_gemini_multimodal(
    keyframe_paths: list[str],
    exercise_type: str,
    past_corrections: list[dict] | None = None,
) -> dict:
    """
    Llama a Gemini 2.5 Flash para analizar las fotos extraídas del video.
    Devuelve un JSON estricto con las métricas de la técnica.

    past_corrections: historial de sesiones anteriores (de get_recent_corrections).
    Cuando se pasa, el prompt incluye los errores previos para que Gemini detecte
    patrones recurrentes y personalice el feedback.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key or api_key == "your_key_here":
        print("⚠️ WARNING: GEMINI_API_KEY no configurada en el .env. Usando datos falsos.")
        return _get_stub_response(keyframe_paths)

    client = genai.Client(api_key=api_key)

    images = []
    for path in keyframe_paths:
        try:
            img = Image.open(path)
            images.append(img)
        except Exception as e:
            print(f"Error al cargar la imagen {path}: {e}")

    history_section = _build_history_section(past_corrections)

    prompt = f"""
    You are an expert sports biomechanics coach. I am sending you sequential images of a person performing {exercise_type}.
    For each completed repetition there are 3 photos (Start, Bottom, End).
    {history_section}
    Analyze the technique across the whole set and return a STRICT JSON object using EXACTLY this schema:
    {{
        "rep_scores": [{{"rep": 1, "score": 85}}],
        "best_rep": 1,
        "worst_rep": 2,
        "correction_cards": [{{"rep": 2, "issue": "Hips dropping", "tip": "Squeeze your glutes to keep your body in a straight line."}}]
    }}

    Rules:
    1. Score each repetition from 0 to 100.
    2. Identify the best and worst repetition by its number.
    3. Generate 1 or 2 'correction_cards' only for repetitions where you notice clear mistakes.
    4. If you detect a mistake that already appeared in previous sessions, explicitly mention it is a recurring pattern in the 'issue' field (e.g., "[Recurring] Elbows flaring out").
    5. If a previous mistake is NO longer present in this session, you may add a positive correction_card with issue "Improvement detected" and a tip celebrating the progress.
    6. Return ONLY the raw JSON, with no markdown code blocks (` ```json `), no greetings, and no extra text.
    7. MANDATORY LANGUAGE: ALL text inside 'issue' and 'tip' fields MUST be written 100% in simple, beginner-friendly English. The app is for people who are new to working out, so:
       - Use everyday words anyone can understand. Avoid jargon, anatomical terms, and gym slang.
       - Instead of "glutes" say "butt muscles". Instead of "scapular retraction" say "pull your shoulder blades back". Instead of "hip hinge" say "bend at your hips".
       - Keep tips short, friendly, and actionable (one clear instruction per tip).
       - Do NOT use any Spanish or other languages. English only.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, *images],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )

        return json.loads(response.text)

    except Exception as e:
        print(f"❌ Error crítico en la API de Gemini: {e}")
        return _get_stub_response(keyframe_paths)


def _build_history_section(past_corrections: list[dict] | None) -> str:
    """Build the history paragraph injected into the prompt, or empty string if no history."""
    if not past_corrections:
        return ""

    lines = [
        "\n    === HISTORIAL DE SESIONES ANTERIORES ===",
        "    El usuario ya ha realizado este ejercicio antes. Estos son los errores detectados en sus últimas sesiones (más reciente primero):",
    ]
    for entry in past_corrections:
        date = entry["session"][:10]  # YYYY-MM-DD
        issues = ", ".join(c["issue"] for c in entry["corrections"])
        lines.append(f"    - {date}: {issues}")
    lines.append(
        "    Usa este historial para identificar errores recurrentes y celebrar mejoras. "
        "=========================================\n"
    )
    return "\n".join(lines)


def _get_stub_response(keyframe_paths):
    """Fallback original por si te quedas sin internet o la API falla"""
    num_reps = len(keyframe_paths) // 3
    return {
        "rep_scores": [{"rep": i + 1, "score": 80} for i in range(num_reps)],
        "best_rep": 1 if num_reps > 0 else None,
        "worst_rep": num_reps if num_reps > 0 else None,
        "correction_cards": [
            {
                "rep": 1,
                "issue": "Stub - Configura tu API Key",
                "tip": "Tu entorno no tiene llave de Google Gemini válida."
            }
        ] if num_reps > 0 else []
    }
