import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Camera,
  Check,
  Clock3,
  FileVideo,
  Info,
  RotateCcw,
  Upload,
} from 'lucide-react'

type ExerciseId = 'push_up' | 'squat' | 'bicep_curl'
type Screen = 'start' | 'guide' | 'logger' | 'processing' | 'review'

type Exercise = {
  id: ExerciseId
  label: string
  checks: string
}

const exercises: Exercise[] = [
  { id: 'push_up', label: 'Push-Up', checks: 'Line, depth' },
  { id: 'squat', label: 'Bodyweight Squat', checks: 'Depth, control' },
  { id: 'bicep_curl', label: 'Bicep Curl', checks: 'Range, tempo' },
]

const checklist = [
  'Side view',
  'Phone low',
  'Full body visible',
  'Good lighting',
  '3–8 reps',
  '5–15 seconds',
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
  const [videoFileName, setVideoFileName] = useState('')

  const exercise =
    exercises.find((item) => item.id === selectedExercise) ?? exercises[1]
  const displayFileName = videoFileName || 'side-view-set.mp4'

  return (
    <MobileShell>
      <AppHeader screen={screen} />

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
          videoFileName={videoFileName}
          onFileSelected={setVideoFileName}
          onGuide={() => setScreen('guide')}
          onAnalyze={() => setScreen('processing')}
        />
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          fileName={displayFileName}
          onCancel={() => setScreen('logger')}
          onComplete={() => setScreen('review')}
        />
      )}

      {screen === 'review' && (
        <ReviewScreen
          exercise={exercise}
          fileName={displayFileName}
          onSave={() => setScreen('start')}
          onTryNextSet={() => setScreen('logger')}
        />
      )}
    </MobileShell>
  )
}

function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh px-4 py-5 text-[#d9e4eb] sm:px-6 lg:grid lg:place-items-center lg:py-8">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-none border-[#3f484a] bg-[#111415]/92 shadow-2xl shadow-black/30 sm:min-h-[820px] sm:rounded-[2rem] sm:border">
        {children}
      </div>
    </main>
  )
}

function AppHeader({ screen }: { screen: Screen }) {
  const screenLabel = {
    start: 'Choose',
    guide: 'Setup',
    logger: 'Upload',
    processing: 'Analyze',
    review: 'Review',
  }[screen]

  return (
    <header className="flex items-center justify-between border-b border-[#3f484a]/70 px-5 py-4">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#18e5f2]">
          RepLab
        </p>
        <p className="mt-1 text-xs text-[#8fa0a3]">
          Build confidence before adding weight
        </p>
      </div>
      <div className="rounded-full border border-[#3f484a] bg-[#212526] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#bac9cb]">
        {screenLabel}
      </div>
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
      <section className="space-y-5">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3f484a] bg-[#212526] px-3 py-1 text-xs text-[#bac9cb]">
            <Camera className="size-3.5 text-[#18e5f2]" />
            Start with one short side-view set
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-normal text-white">
            Build confidence before adding weight.
          </h1>
          <p className="max-w-sm text-base leading-7 text-[#bac9cb]">
            Review one set, see how your reps looked, and get a smarter next
            step.
          </p>
        </div>

        <FlowStrip />
      </section>

      <section className="space-y-3">
        <SectionLabel>Choose exercise</SectionLabel>
        <div className="grid gap-3">
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
        <PrimaryButton onClick={onStart}>
          Start {selected.label} Review
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton onClick={onGuide}>How recording works</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function FlowStrip() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#3f484a] bg-[#212526] px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d9e4eb]">
      <span>Choose</span>
      <ArrowRight className="size-3.5 text-[#18e5f2]" />
      <span>Upload</span>
      <ArrowRight className="size-3.5 text-[#18e5f2]" />
      <span>Review</span>
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
      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-[#18e5f2] bg-[#162126]'
          : 'border-[#3f484a] bg-[#212526] hover:border-[#849495]'
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-[#3f484a] bg-[#111415]">
        <ExerciseGlyph id={exercise.id} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-white">{exercise.label}</h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8fa0a3]">
          {exercise.checks}
        </p>
      </div>
      <div
        className={`grid size-6 place-items-center rounded-full border ${
          selected
            ? 'border-[#18e5f2] bg-[#18e5f2] text-[#002022]'
            : 'border-[#3f484a] text-transparent'
        }`}
      >
        <Check className="size-4" />
      </div>
    </button>
  )
}

function ExerciseGlyph({ id }: { id: ExerciseId }) {
  if (id === 'push_up') {
    return (
      <svg className="h-8 w-10 text-[#18e5f2]" viewBox="0 0 48 32" fill="none">
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
      <svg className="h-9 w-9 text-[#18e5f2]" viewBox="0 0 36 36" fill="none">
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
    <svg className="h-9 w-9 text-[#18e5f2]" viewBox="0 0 36 36" fill="none">
      <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M17 11 L14 18 L20 22 M14 18 L8 17 M20 22 L27 21 M20 22 L16 30 M14 18 L9 27"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path d="M5 31 H31" stroke="currentColor" strokeLinecap="round" />
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

      <section className="space-y-3">
        <SectionLabel>Recording checklist</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {checklist.map((item) => (
            <ChecklistItem key={item}>{item}</ChecklistItem>
          ))}
        </div>
      </section>

      <InfoCard
        title="Quick tip"
        body="Use a water bottle, gym bottle, shoe, or bag to support your phone. You do not need a tripod."
      />

      <BottomCTA>
        <PrimaryButton onClick={onContinue}>
          Got it, start upload
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Back to exercise</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function RecordingGuideCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#3f484a] bg-[#212526] p-5">
      <div className="absolute inset-x-0 bottom-0 h-20 bg-[#111415]" />
      <div className="relative mx-auto h-56 max-w-xs">
        <div className="absolute bottom-10 left-4 h-24 w-12 rounded-[1rem] border-2 border-[#18e5f2] bg-[#0a151a] shadow-lg shadow-[#18e5f2]/10">
          <div className="mx-auto mt-2 h-1 w-5 rounded-full bg-[#3f484a]" />
          <div className="mx-auto mt-5 h-10 w-7 rounded border border-[#3f484a] bg-[#162126]" />
        </div>
        <div className="absolute bottom-4 left-3 h-8 w-16 rounded-lg border border-[#3f484a] bg-[#2c363c]" />
        <div className="absolute bottom-8 right-7 h-32 w-24 rounded-t-full border border-[#3f484a] bg-[#25292a]">
          <div className="absolute left-1/2 top-5 size-7 -translate-x-1/2 rounded-full border border-[#18e5f2]" />
          <div className="absolute left-1/2 top-14 h-16 w-px -translate-x-1/2 bg-[#18e5f2]" />
          <div className="absolute left-9 top-16 h-14 w-px rotate-[-28deg] bg-[#18e5f2]" />
          <div className="absolute left-14 top-16 h-14 w-px rotate-[28deg] bg-[#18e5f2]" />
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-[#3f484a] bg-[#111415]/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#18e5f2]">
          Side view
        </div>
      </div>
    </div>
  )
}

function SetLoggerScreen({
  exercise,
  videoFileName,
  onFileSelected,
  onGuide,
  onAnalyze,
}: {
  exercise: Exercise
  videoFileName: string
  onFileSelected: (fileName: string) => void
  onGuide: () => void
  onAnalyze: () => void
}) {
  return (
    <ScreenBody>
      <TitleBlock
        title="Upload your set"
        subtitle="Add the basic set context and one short side-view clip."
      />

      <SetContextCard exercise={exercise} />

      <section className="space-y-3">
        <SectionLabel>Recording checklist</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {['Side-view clip', 'Phone low', 'Full body visible'].map((item) => (
            <span
              className="rounded-full border border-[#3f484a] bg-[#212526] px-3 py-2 text-xs text-[#bac9cb]"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      <VideoUploadSlot
        fileName={videoFileName}
        onFileSelected={onFileSelected}
      />

      <BottomCTA>
        <PrimaryButton onClick={onAnalyze}>
          Analyze Set
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton onClick={onGuide}>Open Recording Guide</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function SetContextCard({ exercise }: { exercise: Exercise }) {
  const metrics = [
    ['Exercise', exercise.label],
    ['Set', 'Set 2 of 4'],
    ['Reps', '8'],
    ['Load', 'Bodyweight'],
    ['RIR', '2 RIR'],
  ]

  return (
    <section className="rounded-2xl border border-[#3f484a] bg-[#212526] p-4">
      <SectionLabel>Set context</SectionLabel>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {metrics.map(([label, value], index) => (
          <div
            className={`rounded-xl border border-[#3f484a]/80 bg-[#162126] p-3 ${
              index === 0 ? 'col-span-2' : ''
            }`}
            key={label}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8fa0a3]">
              {label}
            </p>
            <p className="mt-1 font-semibold text-white">{value}</p>
          </div>
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
  onFileSelected: (fileName: string) => void
}) {
  return (
    <section className="rounded-2xl border border-dashed border-[#3f484a] bg-[#212526] p-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-[#111415] px-4 py-8 text-center">
        <input
          accept="video/*"
          className="sr-only"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              onFileSelected(file.name)
            }
          }}
        />
        <div className="grid size-14 place-items-center rounded-full bg-[#18e5f2] text-[#002022]">
          {fileName ? <Check className="size-6" /> : <Upload className="size-6" />}
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">
          {fileName || 'Side-view clip'}
        </h2>
        <p className="mt-2 text-sm text-[#bac9cb]">
          {fileName ? 'Ready' : 'Choose a 5–15 second video'}
        </p>
        <span className="mt-4 rounded-full border border-[#3f484a] px-3 py-1 text-xs text-[#bac9cb]">
          {fileName ? 'Replace video' : 'Upload video'}
        </span>
      </label>
    </section>
  )
}

function ProcessingScreen({
  fileName,
  onCancel,
  onComplete,
}: {
  fileName: string
  onCancel: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, processingSteps.length - 1))
    }, 520)

    const timeoutId = window.setTimeout(onComplete, 3000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [onComplete])

  return (
    <ScreenBody>
      <TitleBlock
        title="Analyzing your set"
        subtitle="RepLab is reviewing your video frame by frame."
      />

      <VideoPreviewCard
        fileName={fileName}
        meta="0:12"
        state="Processing"
        active
      />

      <ProcessingStepper activeStep={step} />

      <div className="rounded-xl border border-[#18e5f2]/40 bg-[#0a151a] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#18e5f2]">
          Detecting rep 4 of 8
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2c363c]">
          <div
            className="h-full rounded-full bg-[#18e5f2] transition-all duration-500"
            style={{ width: `${28 + step * 16}%` }}
          />
        </div>
      </div>

      <InfoCard
        title="What RepLab checks"
        body="Range, control, and consistency across your reps."
      />

      <BottomCTA>
        <SecondaryButton onClick={onCancel}>Cancel analysis</SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function ProcessingStepper({ activeStep }: { activeStep: number }) {
  return (
    <section className="rounded-2xl border border-[#3f484a] bg-[#212526] p-4">
      <div className="space-y-3">
        {processingSteps.map((item, index) => {
          const done = index < activeStep
          const active = index === activeStep

          return (
            <div className="flex items-center gap-3" key={item}>
              <div
                className={`grid size-7 place-items-center rounded-full border ${
                  done
                    ? 'border-[#72e0a4] bg-[#72e0a4] text-[#062412]'
                    : active
                      ? 'border-[#18e5f2] bg-[#18e5f2] text-[#002022]'
                      : 'border-[#3f484a] text-[#8fa0a3]'
                }`}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </div>
              <p className={active ? 'font-semibold text-white' : 'text-[#bac9cb]'}>
                {item}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ReviewScreen({
  exercise,
  fileName,
  onSave,
  onTryNextSet,
}: {
  exercise: Exercise
  fileName: string
  onSave: () => void
  onTryNextSet: () => void
}) {
  return (
    <ScreenBody>
      <TitleBlock title="Review your reps" subtitle={`${exercise.label} · 8 reps`} />

      <VideoPreviewCard fileName={fileName} meta="Set 2 of 4" state="Ready" />

      <RepTimeline />

      <BestNeedsWorkComparison />

      <FindingsCard />

      <CorrectionCard
        title="Keep the same range"
        body="Your last reps got shorter. Try matching the same depth on every rep before adding difficulty."
      />

      <NextActionCard
        title="Repeat before adding weight"
        body="Your early reps were stable, but depth became less consistent later in the set."
      />

      <BottomCTA>
        <PrimaryButton onClick={onSave}>
          Save Review
          <Check className="size-4" />
        </PrimaryButton>
        <SecondaryButton onClick={onTryNextSet}>
          Try Next Set
          <RotateCcw className="size-4" />
        </SecondaryButton>
      </BottomCTA>
    </ScreenBody>
  )
}

function VideoPreviewCard({
  fileName,
  meta,
  state,
  active = false,
}: {
  fileName: string
  meta: string
  state: string
  active?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#3f484a] bg-[#212526]">
      <div className="relative grid aspect-video place-items-center bg-[#0a151a]">
        <div className="absolute inset-4 rounded-xl border border-[#18e5f2]/40" />
        <div className="absolute left-8 top-8 h-20 w-12 rounded border border-[#18e5f2]/70" />
        <div className="absolute bottom-8 right-8 h-20 w-20 rounded-full border border-[#18e5f2]/40" />
        <FileVideo className="size-10 text-[#18e5f2]" />
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{fileName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#8fa0a3]">
            <Clock3 className="size-3.5" />
            {meta}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${
            active
              ? 'bg-[#18e5f2] text-[#002022]'
              : 'border border-[#3f484a] text-[#72e0a4]'
          }`}
        >
          {state}
        </span>
      </div>
    </section>
  )
}

function RepTimeline() {
  const reps = [
    'good',
    'good',
    'best',
    'good',
    'good',
    'warn',
    'warn',
    'needs',
  ]

  return (
    <section className="rounded-2xl border border-[#3f484a] bg-[#212526] p-4">
      <SectionLabel>Rep timeline</SectionLabel>
      <div className="mt-4 grid grid-cols-8 gap-2">
        {reps.map((state, index) => (
          <div className="space-y-2" key={`${state}-${index}`}>
            <div
              className={`h-16 rounded-lg border ${
                state === 'best'
                  ? 'border-[#72e0a4] bg-[#72e0a4]/25'
                  : state === 'needs'
                    ? 'border-[#f1bd5a] bg-[#f1bd5a]/25'
                    : state === 'warn'
                      ? 'border-[#f1bd5a]/70 bg-[#f1bd5a]/10'
                      : 'border-[#18e5f2]/60 bg-[#18e5f2]/10'
              }`}
            />
            <p className="text-center font-mono text-[11px] text-[#8fa0a3]">
              {index + 1}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function BestNeedsWorkComparison() {
  return (
    <section className="grid grid-cols-2 gap-3">
      <FeedbackCard
        accent="green"
        eyebrow="Best Rep · 3"
        title="Full depth"
        body="Strongest range and control."
      />
      <FeedbackCard
        accent="amber"
        eyebrow="Needs Work · 8"
        title="Short depth"
        body="Range got shorter near the end."
      />
    </section>
  )
}

function FeedbackCard({
  accent,
  eyebrow,
  title,
  body,
}: {
  accent: 'green' | 'amber'
  eyebrow: string
  title: string
  body: string
}) {
  const color =
    accent === 'green'
      ? 'border-[#72e0a4] text-[#72e0a4]'
      : 'border-[#f1bd5a] text-[#f1bd5a]'

  return (
    <article className={`rounded-2xl border bg-[#212526] p-4 ${color}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#bac9cb]">{body}</p>
    </article>
  )
}

function FindingsCard() {
  return (
    <article className="rounded-2xl border border-[#3f484a] bg-[#212526] p-4">
      <SectionLabel>Findings</SectionLabel>
      <p className="mt-3 leading-7 text-[#d9e4eb]">
        Depth dropped after rep 5. Fatigue likely caused shorter range near the
        end of the set.
      </p>
    </article>
  )
}

function CorrectionCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-[#f1bd5a]/70 bg-[#212526] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#f1bd5a]">
        Correction
      </p>
      <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 leading-7 text-[#bac9cb]">{body}</p>
    </article>
  )
}

function NextActionCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-[#18e5f2] bg-[#162126] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#18e5f2]">
        Next Action
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 leading-7 text-[#bac9cb]">{body}</p>
    </article>
  )
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#3f484a] bg-[#212526] p-3 text-sm text-[#d9e4eb]">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#18e5f2] text-[#002022]">
        <Check className="size-3.5" />
      </span>
      {children}
    </div>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-[#3f484a] bg-[#212526] p-4">
      <Info className="mt-1 size-5 shrink-0 text-[#18e5f2]" />
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-1 leading-6 text-[#bac9cb]">{body}</p>
      </div>
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
    <section className="space-y-3">
      <h1 className="text-3xl font-bold leading-tight tracking-normal text-white">
        {title}
      </h1>
      <p className="leading-7 text-[#bac9cb]">{subtitle}</p>
    </section>
  )
}

function ScreenBody({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col gap-7 px-5 py-6">{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa0a3]">
      {children}
    </p>
  )
}

function BottomCTA({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto grid gap-3 pt-2">{children}</div>
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#18e5f2] px-5 py-3 font-semibold text-[#002022] transition hover:bg-[#78f5ff] focus:outline-none focus:ring-2 focus:ring-[#aef8ff] focus:ring-offset-2 focus:ring-offset-[#111415]"
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
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#3f484a] bg-[#212526] px-5 py-3 font-semibold text-[#d9e4eb] transition hover:border-[#849495] focus:outline-none focus:ring-2 focus:ring-[#18e5f2] focus:ring-offset-2 focus:ring-offset-[#111415]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default App
