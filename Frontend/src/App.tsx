import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Dumbbell,
  FileVideo,
  FlaskConical,
  Info,
  Lightbulb,
  Play,
  RotateCcw,
  Save,
  Upload,
  Wrench,
} from 'lucide-react'
import {
  analyzeSet,
  keyframeUrl,
  type AnalyzeSetResponse,
  type ExerciseId,
} from './services/api'

type Screen = 'start' | 'guide' | 'logger' | 'processing' | 'review'

type Exercise = {
  id: ExerciseId
  label: string
  checks: string
  tags: string[]
}

const exercises: Exercise[] = [
  {
    id: 'push_up',
    label: 'Push-Up',
    checks: 'RepLab checks body line, depth, and control.',
    tags: ['Depth', 'Alignment', 'Control'],
  },
  {
    id: 'squat',
    label: 'Bodyweight Squat',
    checks: 'RepLab checks depth, balance, and knee tracking.',
    tags: ['Depth', 'Balance', 'Knee tracking'],
  },
  {
    id: 'bicep_curl',
    label: 'Bicep Curl',
    checks: 'RepLab checks range of motion, control, and swing.',
    tags: ['Range', 'Control', 'No swing'],
  },
]

const guideChecklist = [
  ['Side view', 'Record from your side, not the front.'],
  ['Phone low', 'Place the phone near floor level.'],
  ['Full body visible', 'Keep head, feet, and hands inside the frame.'],
  ['Good lighting', 'Make sure your movement is easy to see.'],
  ['3–8 reps', 'Record enough reps to compare consistency.'],
  ['5–15 seconds', 'Keep the clip short and easy to analyze.'],
]

const processingSteps = [
  'Uploading video',
  'Detecting reps',
  'Extracting keyframes',
  'Checking consistency',
  'Building next action',
]

function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [selectedExercise, setSelectedExercise] = useState<ExerciseId>('squat')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [targetReps, setTargetReps] = useState(8)
  const [completedReps, setCompletedReps] = useState(8)
  const [rir, setRir] = useState(2)
  const [result, setResult] = useState<AnalyzeSetResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const exercise =
    exercises.find((item) => item.id === selectedExercise) ?? exercises[1]
  const displayFileName = videoFile?.name ?? 'squat_set_02.mp4'

  const goBack = () => {
    if (screen === 'guide') setScreen('start')
    if (screen === 'logger') setScreen('guide')
    if (screen === 'processing') {
      abortRef.current?.abort()
      setScreen('logger')
    }
    if (screen === 'review') setScreen('logger')
  }

  const handleAnalyze = async () => {
    if (!videoFile) {
      setError('Please choose a side-view video before analyzing.')
      return
    }
    setError(null)
    setResult(null)
    setScreen('processing')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const data = await analyzeSet(
        {
          video: videoFile,
          exercise: selectedExercise,
          target_reps: targetReps,
          completed_reps: completedReps,
          rir,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setResult(data)
      setScreen('review')
    } catch (err) {
      if (controller.signal.aborted) return
      const message =
        err instanceof Error ? err.message : 'Could not analyze the set.'
      setError(message)
      setScreen('logger')
    }
  }

  const cancelAnalysis = () => {
    abortRef.current?.abort()
    setScreen('logger')
  }

  return (
    <MobileShell>
      <AppHeader
        screen={screen}
        onBack={screen === 'start' ? undefined : goBack}
        reviewTitle={exercise.label}
        reviewCompletedReps={completedReps}
        reviewFormScore={result?.form_score}
      />

      {screen === 'start' && (
        <StartScreen
          selectedExercise={selectedExercise}
          onSelectExercise={setSelectedExercise}
          onStart={() => setScreen('guide')}
          onGuide={() => setScreen('guide')}
        />
      )}

      {screen === 'guide' && (
        <RecordingGuideScreen
          onBack={() => setScreen('start')}
          onContinue={() => setScreen('logger')}
        />
      )}

      {screen === 'logger' && (
        <SetLoggerScreen
          exercise={exercise}
          videoFile={videoFile}
          targetReps={targetReps}
          completedReps={completedReps}
          rir={rir}
          error={error}
          onFileSelected={setVideoFile}
          onTargetRepsChange={setTargetReps}
          onCompletedRepsChange={setCompletedReps}
          onRirChange={setRir}
          onGuide={() => setScreen('guide')}
          onAnalyze={handleAnalyze}
        />
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          fileName={displayFileName}
          onCancel={cancelAnalysis}
        />
      )}

      {screen === 'review' && result && (
        <ReviewScreen
          exercise={exercise}
          fileName={displayFileName}
          result={result}
          completedReps={completedReps}
          onSave={() => setScreen('start')}
          onTryNextSet={() => setScreen('logger')}
        />
      )}
    </MobileShell>
  )
}

function repScoreColor(score: number): {
  bg: string
  border: string
  text: string
} {
  if (score >= 85) return { bg: 'bg-[#72e0a4]/30', border: 'border-[#72e0a4]/70', text: 'text-[#72e0a4]' }
  if (score >= 70) return { bg: 'bg-[#aef8ff]/25', border: 'border-[#aef8ff]/60', text: 'text-[#aef8ff]' }
  return { bg: 'bg-[#f1bd5a]/25', border: 'border-[#f1bd5a]/55', text: 'text-[#f1bd5a]' }
}

function keyframeForRep(paths: string[], rep: number | null | undefined): string | null {
  if (!rep || rep < 1) return null
  // Backend emits 3 keyframes per rep (start, bottom, top). Pick the bottom frame.
  const baseIndex = (rep - 1) * 3
  return paths[baseIndex + 1] ?? paths[baseIndex] ?? null
}

function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-[#05090b] text-[#d9e4eb] lg:grid lg:place-items-center lg:px-6 lg:py-8">
      <div className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col overflow-hidden bg-[#0a151a] shadow-2xl shadow-black/40 ring-1 ring-[#3b494b]/70 lg:min-h-[884px] lg:rounded-[1.65rem]">
        {children}
      </div>
    </main>
  )
}

function AppHeader({
  screen,
  onBack,
  reviewTitle,
  reviewCompletedReps,
  reviewFormScore,
}: {
  screen: Screen
  onBack?: () => void
  reviewTitle?: string
  reviewCompletedReps?: number
  reviewFormScore?: number
}) {
  if (screen === 'start') {
    return (
      <header className="flex h-[96px] items-center justify-between border-b border-[#3b494b] bg-[#071115] px-7">
        <div className="flex items-center gap-3">
          <FlaskConical className="size-8 text-[#18e5f2]" strokeWidth={2.4} />
          <span className="font-heading text-[31px] font-bold leading-none text-[#78f5ff]">
            RepLab
          </span>
        </div>
        <div className="grid size-12 place-items-center rounded-full border border-[#3b494b] bg-[#162126] text-[#bac9cb]">
          <Dumbbell className="size-5" />
        </div>
      </header>
    )
  }

  if (screen === 'review') {
    const score = reviewFormScore
    const scoreColor =
      score === undefined
        ? '#d9e4eb'
        : score >= 85
          ? '#72e0a4'
          : score >= 70
            ? '#aef8ff'
            : '#f1bd5a'
    return (
      <header className="sticky top-0 z-20 border-b border-[#3b494b]/70 bg-[#0a151a]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <IconButton label="Go back" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-2xl font-bold leading-tight text-white">
              {reviewTitle ?? 'Set review'}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d9e4eb]">
                {reviewCompletedReps ?? 0} reps
              </span>
              {score !== undefined && (
                <span
                  className="rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{
                    color: scoreColor,
                    borderColor: `${scoreColor}55`,
                    backgroundColor: `${scoreColor}1f`,
                    borderWidth: 1,
                    borderStyle: 'solid',
                  }}
                >
                  Form score {Math.round(score)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
    )
  }

  const label = screen === 'processing' ? 'Analysis' : ''
  const title = screen === 'logger' ? 'RepLab' : 'RepLab'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#3b494b] bg-[#0a151a]/95 px-5 backdrop-blur">
      <IconButton label="Go back" onClick={onBack}>
        <ArrowLeft className="size-6" />
      </IconButton>
      <div className="flex items-baseline gap-3">
        <span
          className={`font-heading font-bold leading-none text-[#aef8ff] ${
            screen === 'logger' ? 'text-[36px]' : 'text-2xl'
          }`}
        >
          {title}
        </span>
        {label && (
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#bac9cb]">
            {label}
          </span>
        )}
      </div>
      <div className="w-10" />
    </header>
  )
}

function StartScreen({
  selectedExercise,
  onSelectExercise,
  onStart,
  onGuide,
}: {
  selectedExercise: ExerciseId
  onSelectExercise: (exercise: ExerciseId) => void
  onStart: () => void
  onGuide: () => void
}) {
  const selected =
    exercises.find((exercise) => exercise.id === selectedExercise) ??
    exercises[1]

  return (
    <ScreenBody>
      <section className="space-y-7">
        <div className="space-y-6">
          <h1 className="font-heading text-[44px] font-bold leading-[1.16] text-[#e6eef2]">
            Build confidence before adding weight.
          </h1>
          <p className="text-[22px] leading-[1.45] text-[#bac9cb]">
            Review one set, see how your reps looked, and get a smarter next
            step.
          </p>
        </div>

        <FlowStrip />
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-[28px] font-bold leading-tight text-[#e6eef2]">
          Choose an exercise
        </h2>
        <div className="grid gap-4">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              selected={exercise.id === selectedExercise}
              onSelect={() => onSelectExercise(exercise.id)}
            />
          ))}
        </div>
      </section>

      <BottomCTA>
        <PrimaryButton large onClick={onStart}>
          Start {selected.label} Review
          <ArrowRight className="size-8" />
        </PrimaryButton>
        <p className="text-center font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#bac9cb]">
          Start with one short side-view set.
        </p>
        <SecondaryButton onClick={onGuide}>
          <Info className="size-5" />
          How recording works
        </SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function FlowStrip() {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl border border-[#3b494b] bg-[#162126] px-4 py-5 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] shadow-inner shadow-white/[0.02]">
      <span className="text-[#78f5ff]">Choose</span>
      <ArrowRight className="size-3.5 text-[#849495]" />
      <span className="text-[#849495]">Upload</span>
      <ArrowRight className="size-3.5 text-[#849495]" />
      <span className="text-[#849495]">Review</span>
    </div>
  )
}

function ExerciseCard({
  exercise,
  selected,
  onSelect,
}: {
  exercise: Exercise
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      className={`relative overflow-hidden rounded-2xl border p-7 text-left transition ${
        selected
          ? 'border-[#18e5f2] bg-[#132226] shadow-[0_0_0_1px_rgba(24,229,242,0.25),0_18px_45px_rgba(24,229,242,0.08)]'
          : 'border-[#3b494b] bg-[#162126] hover:border-[#849495]'
      }`}
      type="button"
      onClick={onSelect}
    >
      {selected && (
        <div className="absolute -right-12 -top-12 size-28 rounded-full bg-[#18e5f2]/8" />
      )}
      <div className="relative flex items-start gap-5">
        <div
          className={`grid size-14 shrink-0 place-items-center rounded-xl border ${
            selected
              ? 'border-[#18e5f2]/70 bg-[#18e5f2]/12'
              : 'border-[#3b494b] bg-[#212b31]'
          }`}
        >
          <ExerciseGlyph id={exercise.id} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3
              className={`font-heading text-[25px] font-bold leading-tight ${
                selected ? 'text-[#78f5ff]' : 'text-[#e6eef2]'
              }`}
            >
              {exercise.label}
            </h3>
            {selected && (
              <CheckCircle2 className="size-7 shrink-0 text-[#78f5ff]" />
            )}
          </div>
          <p className="mt-5 text-[19px] leading-7 text-[#bac9cb]">
            {exercise.checks}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {exercise.tags.map((tag) => (
              <span
                className={`rounded-full border px-4 py-1.5 font-mono text-[12px] font-semibold tracking-[0.18em] ${
                  selected
                    ? 'border-[#18e5f2] bg-[#18e5f2] text-[#00363a]'
                    : 'border-[#3b494b] bg-[#212b31] text-[#bac9cb]'
                }`}
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function ExerciseGlyph({ id }: { id: ExerciseId }) {
  if (id === 'push_up') {
    return (
      <svg className="h-8 w-10 text-[#aef8ff]" viewBox="0 0 48 32" fill="none">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M14 12 L25 15 L39 15 M24 15 L16 25 M38 15 L43 25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path d="M6 27 H44" stroke="currentColor" strokeLinecap="round" />
      </svg>
    )
  }

  if (id === 'bicep_curl') {
    return (
      <svg className="h-9 w-9 text-[#aef8ff]" viewBox="0 0 36 36" fill="none">
        <path
          d="M10 25 C16 25 17 20 17 16 V10 M17 10 H24 M24 10 C28 10 30 13 30 17"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M7 25 H13 M8 28 H14 M24 17 H32"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    )
  }

  return (
    <svg className="h-9 w-9 text-[#aef8ff]" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="7" r="3" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M18 11 V25 M12 14 H24 M15 25 H21 M14 31 L18 25 L22 31"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}

function RecordingGuideScreen({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <ScreenBody>
      <TitleBlock
        title="Record your set correctly"
        subtitle="A better setup helps RepLab review your reps more clearly."
      />

      <RecordingGuideCard />

      <section className="space-y-4">
        <h2 className="font-heading text-[26px] font-bold leading-tight text-[#e6eef2]">
          Before you record
        </h2>
        <div className="grid gap-3">
          {guideChecklist.map(([title, body]) => (
            <ChecklistItem body={body} key={title} title={title} />
          ))}
        </div>
      </section>

      <TipCard />

      <BottomCTA>
        <PrimaryButton large onClick={onContinue}>
          Got it, start upload
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Back to exercise</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function RecordingGuideCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-[#3b494b] bg-[#162126]">
      <div className="relative h-[214px] overflow-hidden border-b border-[#3b494b] bg-[#212b31]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,229,242,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(24,229,242,0.09)_1px,transparent_1px)] bg-[size:18px_18px] opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(150deg,rgba(24,229,242,0.14)_1px,transparent_1px),linear-gradient(25deg,rgba(24,229,242,0.12)_1px,transparent_1px)] bg-[size:14px_14px]" />
        <div className="absolute left-10 top-9 size-3 border-l border-t border-[#78f5ff]" />
        <div className="absolute right-12 top-9 size-3 border-r border-t border-[#78f5ff]" />
        <div className="absolute bottom-10 left-10 size-3 border-b border-l border-[#78f5ff]" />
        <div className="absolute bottom-9 right-9 size-4 border-b border-r border-[#78f5ff]" />
        <div className="absolute right-10 top-12 h-24 w-28 opacity-35">
          <svg viewBox="0 0 120 96" fill="none" className="h-full w-full">
            <circle cx="28" cy="15" r="8" stroke="#78f5ff" />
            <path
              d="M28 25 C20 39 21 51 34 59 M34 59 L75 59 M34 59 L21 83 M43 59 L54 83 M42 36 L78 38 M78 38 L104 31"
              stroke="#78f5ff"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute bottom-26 left-28 h-24 w-28 rounded-t-2xl border border-[#78f5ff]/40 bg-[#162126]/80" />
        <div className="absolute bottom-8 left-[178px] h-28 w-14 rounded-t-2xl border-2 border-[#78f5ff]/70 bg-[#0a151a]">
          <div className="mx-auto mt-2 h-1 w-6 rounded-full bg-[#78f5ff]/60" />
          <div className="mx-auto mt-6 h-12 w-9 rounded-lg border border-[#78f5ff]/35" />
        </div>
        <div className="absolute bottom-8 left-[128px] h-[118px] w-[58px] -rotate-[-8deg] rounded-lg border-2 border-[#78f5ff] bg-[#0a151a] shadow-[0_0_22px_rgba(24,229,242,0.12)]">
          <div className="mx-auto mt-3 h-1 w-7 rounded-full bg-[#78f5ff]/70" />
          <svg className="mx-auto mt-5 h-16 w-9 text-[#78f5ff]" viewBox="0 0 36 64" fill="none">
            <path
              d="M7 36 C14 22 20 48 29 26"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path d="M8 48 H28 M10 54 H23" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="p-4">
        <h2 className="font-heading text-2xl font-bold text-[#aef8ff]">
          Simple setup
        </h2>
        <p className="mt-2 text-base leading-7 text-[#d9e4eb]">
          Place your phone low, record from the side, and keep your full body in
          frame.
        </p>
      </div>
    </section>
  )
}

function SetLoggerScreen({
  exercise,
  videoFile,
  targetReps,
  completedReps,
  rir,
  error,
  onFileSelected,
  onTargetRepsChange,
  onCompletedRepsChange,
  onRirChange,
  onGuide,
  onAnalyze,
}: {
  exercise: Exercise
  videoFile: File | null
  targetReps: number
  completedReps: number
  rir: number
  error: string | null
  onFileSelected: (file: File) => void
  onTargetRepsChange: (value: number) => void
  onCompletedRepsChange: (value: number) => void
  onRirChange: (value: number) => void
  onGuide: () => void
  onAnalyze: () => void
}) {
  return (
    <ScreenBody>
      <section className="space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-[45px] font-bold leading-[1.05] text-[#e6eef2]">
              {exercise.label}
            </h1>
            <p className="mt-3 text-[22px] text-[#bac9cb]">Log your set</p>
          </div>
          <span className="mt-12 inline-flex items-center gap-3 rounded-full border border-[#aef8ff] bg-[#18e5f2]/10 px-5 py-2 font-mono text-[12px] font-semibold uppercase leading-tight tracking-[0.18em] text-[#aef8ff]">
            <span className="size-2.5 rounded-full bg-[#78f5ff]/70" />
            Ready to analyze
          </span>
        </div>
        <p className="text-[22px] leading-[1.55] text-[#bac9cb]">
          Log your set, upload a side-view clip, and RepLab will review how your
          reps looked.
        </p>
      </section>

      <SetContextCard
        targetReps={targetReps}
        completedReps={completedReps}
        rir={rir}
        onTargetRepsChange={onTargetRepsChange}
        onCompletedRepsChange={onCompletedRepsChange}
        onRirChange={onRirChange}
      />

      <section className="space-y-4">
        <SectionLabel>Recording checklist</SectionLabel>
        <div className="flex flex-wrap gap-3">
          {[
            ['Side view', true],
            ['Full body visible', true],
            ['Phone low', false],
            ['3–8 reps', true],
            ['5–15 sec', false],
            ['Good lighting', false],
          ].map(([item, active]) => (
            <ChecklistChip active={Boolean(active)} key={String(item)}>
              {item}
            </ChecklistChip>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Upload set video</SectionLabel>
          <button
            className="font-mono text-[12px] font-semibold tracking-[0.16em] text-[#aef8ff]"
            type="button"
            onClick={onGuide}
          >
            Open Recording Guide
          </button>
        </div>
        <VideoUploadSlot
          fileName={videoFile?.name ?? ''}
          onFileSelected={onFileSelected}
        />
        <p className="text-lg text-[#bac9cb]">Side-view clip, 5–15 seconds.</p>
      </section>

      {error && (
        <article className="flex items-start gap-3 rounded-xl border border-[#f1bd5a]/60 bg-[#3a2a14] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#f1bd5a]" />
          <div>
            <p className="font-heading text-base font-bold text-[#f1bd5a]">
              Analysis failed
            </p>
            <p className="mt-1 text-sm leading-6 text-[#e6c98a]">{error}</p>
          </div>
        </article>
      )}

      <BottomCTA>
        <PrimaryButton large onClick={onAnalyze}>
          <BarChart3 className="size-7" />
          Analyze Set
        </PrimaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function SetContextCard({
  targetReps,
  completedReps,
  rir,
  onTargetRepsChange,
  onCompletedRepsChange,
  onRirChange,
}: {
  targetReps: number
  completedReps: number
  rir: number
  onTargetRepsChange: (value: number) => void
  onCompletedRepsChange: (value: number) => void
  onRirChange: (value: number) => void
}) {
  const fields: {
    label: string
    value: number
    onChange: (value: number) => void
    suffix?: string
    min: number
    max: number
  }[] = [
    { label: 'Target', value: targetReps, onChange: onTargetRepsChange, min: 1, max: 99 },
    { label: 'Done', value: completedReps, onChange: onCompletedRepsChange, min: 0, max: 99 },
    { label: 'RIR', value: rir, onChange: onRirChange, min: 0, max: 10 },
  ]

  return (
    <section className="rounded-2xl border border-[#3b494b] bg-[#212b31] p-5 shadow-inner shadow-white/[0.02]">
      <div className="grid grid-cols-3 gap-3">
        {fields.map(({ label, value, onChange, min, max }) => (
          <label className="min-w-0" key={label}>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-[#bac9cb]">
              {label}
            </p>
            <div className="mt-2 grid h-[92px] place-items-center rounded-xl border border-[#3b494b] bg-[#2c363c] px-2">
              <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={Number.isFinite(value) ? value : 0}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  if (Number.isNaN(parsed)) return
                  onChange(Math.max(min, Math.min(max, parsed)))
                }}
                className="w-full bg-transparent text-center font-heading text-[clamp(1.4rem,6vw,1.9rem)] font-bold leading-tight text-[#e6eef2] outline-none [appearance:textfield] focus:text-[#aef8ff] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </label>
        ))}
      </div>
    </section>
  )
}

function VideoUploadSlot({
  fileName,
  onFileSelected,
}: {
  fileName: string
  onFileSelected: (file: File) => void
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-[#78f5ff]/70 bg-[#212b31] p-5 transition hover:border-[#aef8ff]">
      <input
        accept="video/*"
        className="sr-only"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onFileSelected(file)
          }
        }}
      />
      <div className="flex items-center gap-5">
        <div className="relative grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-lg border border-[#3b494b] bg-[#121d22]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2c363c] to-[#051014]" />
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#303b40]">
            <div className="h-full w-1/3 bg-[#aef8ff]" />
          </div>
          {fileName ? (
            <Play className="relative size-8 text-[#d9e4eb]" />
          ) : (
            <Upload className="relative size-8 text-[#d9e4eb]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] text-[#d9e4eb]">
            {fileName || 'Choose side-view clip'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[12px] font-semibold tracking-[0.18em] text-[#bac9cb]">
              0:15
            </span>
            <span className="size-1 rounded-full bg-[#3b494b]" />
            <span className="font-mono text-[12px] font-semibold tracking-[0.18em] text-[#aef8ff]">
              {fileName ? 'Ready' : 'Select file'}
            </span>
          </div>
        </div>
        <span className="hidden rounded-full bg-[#2c363c] px-3 py-2 text-sm text-[#bac9cb] sm:inline-flex">
          {fileName ? 'Replace video' : 'Upload'}
        </span>
      </div>
    </label>
  )
}

function ProcessingScreen({
  fileName,
  onCancel,
}: {
  fileName: string
  onCancel: () => void
}) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStep((current) => (current + 1) % processingSteps.length)
    }, 900)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <ScreenBody>
      <TitleBlock
        title="Analyzing your set"
        subtitle="RepLab is reviewing your video frame by frame."
      />

      <ProcessingVideoCard fileName={fileName} />

      <ProcessingStepper activeStep={step} />

      <AnalysisInfoCard />

      <BottomCTA>
        <button
          className="mx-auto py-5 font-mono text-[12px] font-semibold uppercase tracking-[0.24em] text-[#d9e4eb]"
          type="button"
          onClick={onCancel}
        >
          Cancel analysis
        </button>
      </BottomCTA>
    </ScreenBody>
  )
}

function ProcessingVideoCard({ fileName }: { fileName: string }) {
  return (
    <section className="rounded-2xl border border-[#18e5f2] bg-[#162126] p-5 shadow-[0_18px_45px_rgba(24,229,242,0.08)]">
      <div className="grid aspect-video place-items-center rounded-xl border border-[#3b494b] bg-[#263136]">
        <div className="grid size-14 place-items-center rounded border-4 border-[#3b494b] text-[#3b494b]">
          <Play className="size-8 fill-current" />
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-[#e6eef2]">
            {fileName}
          </p>
          <p className="mt-2 text-xl text-[#bac9cb]">0:15</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#18e5f2]/70 bg-[#18e5f2]/10 px-5 py-2 font-mono text-[12px] font-semibold tracking-[0.18em] text-[#18e5f2]">
          <RotateCcw className="size-4" />
          Processing
        </span>
      </div>
    </section>
  )
}

function ProcessingStepper({ activeStep }: { activeStep: number }) {
  return (
    <section className="space-y-0 py-2">
      {processingSteps.map((item, index) => {
        const done = index < activeStep
        const active = index === activeStep
        const Icon = index === 0 ? Check : index === 1 ? FlaskConical : FileVideo

        return (
          <div className="grid grid-cols-[3.5rem_1fr] gap-4" key={item}>
            <div className="flex flex-col items-center">
              <div
                className={`grid size-11 place-items-center rounded-full border ${
                  done
                    ? 'border-[#78f5ff] bg-[#12313a] text-[#aef8ff]'
                    : active
                      ? 'border-[#18e5f2] bg-[#18e5f2] text-[#00363a]'
                      : 'border-[#3b494b] bg-[#0a151a] text-[#526366]'
                }`}
              >
                <Icon className="size-5" />
              </div>
              {index !== processingSteps.length - 1 && (
                <div className="h-14 w-px bg-[#3b494b]" />
              )}
            </div>
            <div className="pt-2">
              <p
                className={`text-xl ${
                  active
                    ? 'font-semibold text-[#18e5f2]'
                    : done
                      ? 'text-[#e6eef2]'
                      : 'text-[#849495]'
                }`}
              >
                {item}
              </p>
              {active && (
                <p className="mt-2 font-mono text-[12px] font-semibold tracking-[0.22em] text-[#aef8ff]">
                  Detecting rep 4 of 8
                </p>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function AnalysisInfoCard() {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#3b494b] bg-[#162126] p-7">
      <Wrench className="absolute left-6 top-8 size-14 text-[#526366]/45" />
      <div className="pl-20">
        <h2 className="font-heading text-[28px] font-bold leading-tight text-[#e6eef2]">
          What RepLab checks
        </h2>
        <p className="mt-4 text-lg leading-7 text-[#d9e4eb]">
          Range, control, and consistency across your reps.
        </p>
      </div>
    </article>
  )
}

function ReviewScreen({
  exercise,
  fileName,
  result,
  completedReps,
  onSave,
  onTryNextSet,
}: {
  exercise: Exercise
  fileName: string
  result: AnalyzeSetResponse
  completedReps: number
  onSave: () => void
  onTryNextSet: () => void
}) {
  const { keyframe_paths, form_score, progression_recommendation, gemini_analysis } = result
  const { rep_scores, best_rep, worst_rep, correction_cards } = gemini_analysis

  const findingsText = buildFindingsText(form_score, completedReps, rep_scores)

  return (
    <ScreenBody compact>
      <KeyframeGallery fileName={fileName} keyframePaths={keyframe_paths} />

      <RepTimeline repScores={rep_scores} bestRep={best_rep} worstRep={worst_rep} />

      <BestNeedsWorkComparison
        keyframePaths={keyframe_paths}
        bestRep={best_rep}
        worstRep={worst_rep}
        repScores={rep_scores}
      />

      <FindingsCard
        formScore={form_score}
        text={findingsText}
      />

      {correction_cards.length === 0 ? (
        <CorrectionCard
          title="No major issues detected"
          body="Your form looked consistent across the set. Keep going with the same setup."
        />
      ) : (
        correction_cards.map((card, index) => (
          <CorrectionCard
            key={`${card.rep}-${index}`}
            title={`Rep ${card.rep}: ${card.issue}`}
            body={card.tip}
          />
        ))
      )}

      <NextActionCard
        title="Coach recommendation"
        body={progression_recommendation}
        exercise={exercise.label}
      />

      <BottomCTA>
        <PrimaryButton onClick={onSave}>
          <Save className="size-5" />
          Save Review
        </PrimaryButton>
        <SecondaryButton onClick={onTryNextSet}>Try Next Set</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function buildFindingsText(
  formScore: number,
  completedReps: number,
  repScores: { rep: number; score: number }[],
): string {
  const rounded = Math.round(formScore)
  if (repScores.length === 0) {
    return `Form score ${rounded}/100 across ${completedReps} reps.`
  }
  const best = repScores.reduce((acc, r) => (r.score > acc.score ? r : acc), repScores[0])
  const worst = repScores.reduce((acc, r) => (r.score < acc.score ? r : acc), repScores[0])
  if (best.rep === worst.rep) {
    return `Form score ${rounded}/100. Reps held steady across the set.`
  }
  return `Form score ${rounded}/100. Best rep #${best.rep} (${best.score}) vs weakest rep #${worst.rep} (${worst.score}).`
}

function KeyframeGallery({
  fileName,
  keyframePaths,
}: {
  fileName: string
  keyframePaths: string[]
}) {
  if (keyframePaths.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-[#3b494b] bg-[#121d22] p-5 text-center">
        <p className="font-heading text-lg text-[#e6eef2]">No keyframes returned</p>
        <p className="mt-2 text-sm text-[#bac9cb]">{fileName}</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <SectionLabel>Keyframes</SectionLabel>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bac9cb]">
          {keyframePaths.length} frames
        </span>
      </div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-3 pb-2">
          {keyframePaths.map((path, index) => {
            const rep = Math.floor(index / 3) + 1
            const phase = ['Start', 'Bottom', 'Top'][index % 3]
            return (
              <figure
                key={path}
                className="flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-[#3b494b] bg-[#121d22] p-2"
              >
                <img
                  src={keyframeUrl(path)}
                  alt={`Rep ${rep} ${phase}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
                <figcaption className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bac9cb]">
                  <span className="text-[#aef8ff]">Rep {rep}</span>
                  <span>{phase}</span>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
      <p className="truncate text-sm text-[#bac9cb]">{fileName}</p>
    </section>
  )
}

function RepTimeline({
  repScores,
  bestRep,
  worstRep,
}: {
  repScores: { rep: number; score: number }[]
  bestRep: number | null
  worstRep: number | null
}) {
  if (repScores.length === 0) {
    return (
      <section className="space-y-3">
        <SectionLabel>Rep timeline</SectionLabel>
        <p className="rounded-lg border border-[#3b494b] bg-[#121d22] px-4 py-5 text-sm text-[#bac9cb]">
          No per-rep scores returned.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <SectionLabel>Rep timeline</SectionLabel>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#aef8ff]">
          {repScores.length} reps
        </span>
      </div>
      <div className="flex h-12 gap-1 rounded-lg border border-[#3b494b] bg-[#121d22] p-1">
        {repScores.map(({ rep, score }) => {
          const palette = repScoreColor(score)
          const isBest = bestRep === rep
          const isWorst = worstRep === rep
          return (
            <div
              key={rep}
              className={`flex flex-1 items-center justify-center rounded-md border text-[10px] font-mono font-semibold ${palette.border} ${palette.bg} ${palette.text} ${
                isBest ? 'ring-2 ring-[#72e0a4]' : ''
              } ${isWorst ? 'ring-2 ring-[#f1bd5a]' : ''}`}
              title={`Rep ${rep} – ${score}/100`}
            >
              <span>{score}</span>
              {isBest && <span className="ml-0.5 text-[#72e0a4]">★</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BestNeedsWorkComparison({
  keyframePaths,
  bestRep,
  worstRep,
  repScores,
}: {
  keyframePaths: string[]
  bestRep: number | null
  worstRep: number | null
  repScores: { rep: number; score: number }[]
}) {
  if (bestRep === null && worstRep === null) return null

  const scoreFor = (rep: number | null) =>
    rep === null ? null : repScores.find((r) => r.rep === rep)?.score ?? null

  return (
    <section className="grid grid-cols-2 gap-3">
      {bestRep !== null && (
        <FeedbackCard
          accent="green"
          eyebrow={`Best Rep · ${bestRep}`}
          marker={scoreFor(bestRep) !== null ? `${scoreFor(bestRep)}/100` : 'Highest score'}
          title="Cleanest form"
          imageUrl={(() => {
            const path = keyframeForRep(keyframePaths, bestRep)
            return path ? keyframeUrl(path) : null
          })()}
        />
      )}
      {worstRep !== null && (
        <FeedbackCard
          accent="amber"
          eyebrow={`Needs Work · ${worstRep}`}
          marker={scoreFor(worstRep) !== null ? `${scoreFor(worstRep)}/100` : 'Lowest score'}
          title="Focus area"
          imageUrl={(() => {
            const path = keyframeForRep(keyframePaths, worstRep)
            return path ? keyframeUrl(path) : null
          })()}
        />
      )}
    </section>
  )
}

function FeedbackCard({
  accent,
  eyebrow,
  marker,
  title,
  imageUrl,
}: {
  accent: 'green' | 'amber'
  eyebrow: string
  marker: string
  title: string
  imageUrl: string | null
}) {
  const color = accent === 'green' ? '#72e0a4' : '#f1bd5a'

  return (
    <article
      className="rounded-xl border bg-[#212b31] p-4"
      style={{ borderColor: accent === 'green' ? 'rgba(114,224,164,0.45)' : 'rgba(241,189,90,0.45)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bac9cb]">
          {eyebrow}
        </p>
        <CheckCircle2 className="size-5" style={{ color }} />
      </div>
      <div className="relative mt-4 aspect-square overflow-hidden rounded-lg border border-[#3b494b]/60 bg-[#121d22]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] font-mono uppercase tracking-[0.14em] text-[#849495]">
            No frame
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#051014] via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 text-center">
          <h3 className="font-heading text-lg font-bold" style={{ color }}>
            {title}
          </h3>
          <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#d9e4eb]">
            {marker}
          </p>
        </div>
      </div>
    </article>
  )
}

function FindingsCard({
  formScore,
  text,
}: {
  formScore: number
  text: string
}) {
  const rounded = Math.round(formScore)
  const palette = repScoreColor(rounded)
  return (
    <article className="flex gap-4 rounded-xl border border-[#3b494b] bg-[#162126] p-5">
      <div
        className={`grid size-12 shrink-0 place-items-center rounded-full border ${palette.border} ${palette.bg} ${palette.text} font-heading text-base font-bold`}
      >
        {rounded}
      </div>
      <div>
        <SectionLabel>Findings</SectionLabel>
        <p className="mt-3 text-lg leading-7 text-[#e6eef2]">{text}</p>
      </div>
    </article>
  )
}

function CorrectionCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="flex gap-4 rounded-xl border border-[#3b494b] bg-[#162126] p-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#18e5f2] text-[#00363a]">
        <Wrench className="size-5" />
      </div>
      <div>
        <SectionLabel>Correction</SectionLabel>
        <h2 className="mt-3 font-heading text-xl font-bold text-[#aef8ff]">
          {title}
        </h2>
        <p className="mt-3 text-base leading-7 text-[#d9e4eb]">{body}</p>
      </div>
    </article>
  )
}

function NextActionCard({
  title,
  body,
  exercise,
}: {
  title: string
  body: string
  exercise: string
}) {
  return (
    <article className="rounded-xl border border-[#78f5ff]/70 bg-[#18242a] p-7">
      <div className="flex items-center gap-3">
        <Lightbulb className="size-5 text-[#aef8ff]" />
        <SectionLabel>Next steps</SectionLabel>
      </div>
      <h2 className="mt-7 font-heading text-[26px] font-bold leading-tight text-[#e6eef2]">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-7 text-[#d9e4eb]">
        {body} Focus on matching your best {exercise.toLowerCase()} range for
        all 8 reps.
      </p>
    </article>
  )
}

function ChecklistItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-[#3b494b] bg-[#121d22] p-4">
      <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-[#aef8ff]" />
      <div>
        <h3 className="font-heading text-base font-bold text-[#e6eef2]">
          {title}
        </h3>
        <p className="mt-1 leading-6 text-[#d9e4eb]">{body}</p>
      </div>
    </div>
  )
}

function ChecklistChip({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 font-mono text-[12px] font-semibold tracking-[0.18em] ${
        active
          ? 'border-[#aef8ff] bg-[#18e5f2]/10 text-[#aef8ff]'
          : 'border-[#3b494b] bg-[#2c363c] text-[#bac9cb]'
      }`}
    >
      {active ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
      {children}
    </span>
  )
}

function TipCard() {
  return (
    <article className="rounded-xl border border-l-4 border-[#3b494b] border-l-[#aef8ff] bg-[#162126] p-5">
      <div className="flex items-center gap-3 text-[#aef8ff]">
        <Lightbulb className="size-5" />
        <h2 className="font-heading text-xl font-bold">Quick tip</h2>
      </div>
      <p className="mt-4 text-lg leading-7 text-[#d9e4eb]">
        Use a water bottle, gym bottle, shoe, or bag to support your phone. You
        do not need a tripod.
      </p>
    </article>
  )
}

function TitleBlock({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <section className="space-y-4">
      <h1 className="font-heading text-[38px] font-bold leading-[1.14] text-[#e6eef2]">
        {title}
      </h1>
      <p className="text-[21px] leading-[1.45] text-[#bac9cb]">{subtitle}</p>
    </section>
  )
}

function ScreenBody({
  children,
  compact = false,
}: {
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-1 flex-col px-5 ${
        compact ? 'gap-7 py-7' : 'gap-9 py-7'
      }`}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9e4eb]">
      {children}
    </p>
  )
}

function BottomCTA({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-auto grid gap-3 border-t border-[#3b494b]/60 bg-[#0a151a]/95 px-5 py-5 backdrop-blur">
      {children}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  large = false,
}: {
  children: React.ReactNode
  onClick: () => void
  large?: boolean
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-3 rounded-2xl bg-[#aef8ff] px-5 font-heading font-bold text-[#00363a] shadow-[0_16px_32px_rgba(24,229,242,0.12)] transition hover:bg-[#78f5ff] focus:outline-none focus:ring-2 focus:ring-[#aef8ff] focus:ring-offset-2 focus:ring-offset-[#0a151a] ${
        large ? 'min-h-[76px] text-[29px]' : 'min-h-[62px] text-xl'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className="inline-flex min-h-[60px] items-center justify-center gap-2 rounded-full border border-[#3b494b] bg-[#0a151a] px-5 py-3 font-heading text-lg font-bold text-[#e6eef2] transition hover:border-[#849495] hover:bg-[#121d22] focus:outline-none focus:ring-2 focus:ring-[#18e5f2] focus:ring-offset-2 focus:ring-offset-[#0a151a]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      aria-label={label}
      className="grid size-10 shrink-0 place-items-center rounded-full text-[#bac9cb] transition hover:bg-[#162126] hover:text-[#aef8ff]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default App
