export const API_BASE_URL = 'http://localhost:8000'

export type ExerciseId = 'push_up' | 'squat' | 'bicep_curl'

export type RepScore = {
  rep: number
  score: number
}

export type CorrectionCard = {
  rep: number
  issue: string
  tip: string
}

export type GeminiAnalysis = {
  rep_scores: RepScore[]
  best_rep: number | null
  worst_rep: number | null
  correction_cards: CorrectionCard[]
}

export type AnalyzeSetResponse = {
  log_id: number
  form_score: number
  progression_recommendation: string
  keyframe_paths: string[]
  gemini_analysis: GeminiAnalysis
}

export type AnalyzeSetParams = {
  video: File
  exercise: ExerciseId
  target_reps: number
  completed_reps: number
  rir: number
}

export async function analyzeSet(
  params: AnalyzeSetParams,
  signal?: AbortSignal,
): Promise<AnalyzeSetResponse> {
  const formData = new FormData()
  formData.append('video', params.video)
  formData.append('exercise', params.exercise)
  formData.append('target_reps', String(params.target_reps))
  formData.append('completed_reps', String(params.completed_reps))
  formData.append('rir', String(params.rir))

  const response = await fetch(`${API_BASE_URL}/api/analyze_set`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      if (errorBody?.detail) detail = String(errorBody.detail)
    } catch {
      // body wasn't JSON; keep default detail
    }
    throw new Error(detail)
  }

  return (await response.json()) as AnalyzeSetResponse
}

export function keyframeUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${API_BASE_URL}/${cleaned}`
}
