import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()


def call_gemini_multimodal(keyframe_paths: list[str], exercise_type: str) -> dict:
    """
    Llama a Gemini 1.5 Flash para analizar las fotos extraídas del video.
    Devuelve un JSON estricto con las métricas de la técnica.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    # Sistema de seguridad: si no hay API Key, devolvemos el Stub para que no explote
    if not api_key or api_key == "your_key_here":
        print("⚠️ WARNING: GEMINI_API_KEY no configurada en el .env. Usando datos falsos.")
        return _get_stub_response(keyframe_paths)

    # Inicializamos el cliente de Gemini
    client = genai.Client(api_key=api_key)

    # Cargamos las imágenes extraídas desde la carpeta temp/
    images = []
    for path in keyframe_paths:
        try:
            img = Image.open(path)
            images.append(img)
        except Exception as e:
            print(f"Error al cargar la imagen {path}: {e}")

    # El Prompt Maestro para el Hackathon
    prompt = f"""
    Eres un coach experto en biomecánica deportiva. Te estoy enviando imágenes secuenciales de una persona haciendo {exercise_type}.
    Por cada repetición completada hay 3 fotos (Inicio, Abajo, Fin).
    
    Analiza la técnica a lo largo de la serie y devuelve un objeto JSON ESTRICTO usando EXACTAMENTE este esquema:
    {{
        "rep_scores": [{{"rep": 1, "score": 85}}],
        "best_rep": 1,
        "worst_rep": 2,
        "correction_cards": [{{"rep": 2, "issue": "Hips dropping", "tip": "Squeeze glutes to maintain straight line."}}]
    }}
    
    Reglas:
    1. Califica cada repetición del 0 al 100.
    2. Identifica la mejor y la peor repetición por su número.
    3. Genera 1 o 2 'correction_cards' solo para las repeticiones donde notes errores claros.
    4. Devuelve ÚNICAMENTE el JSON crudo, sin bloques de código markdown (` ```json `), ni saludos, ni texto extra.
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
