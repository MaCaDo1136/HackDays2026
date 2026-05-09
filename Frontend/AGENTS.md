# AGENTS.md — RepLab Frontend

## Project Context

This directory contains the frontend for **RepLab**, an 8-hour hackathon MVP.

RepLab is a mobile-first web app for beginner and intermediate lifters.

**Brand:** RepLab  
**Tagline:** Build confidence before adding weight.

The product helps users:
1. choose one supported exercise,
2. learn how to record a short side-view set video,
3. log basic set context,
4. upload the video,
5. wait while the set is analyzed,
6. review rep-by-rep technique feedback,
7. get a simple next-set recommendation.

RepLab is not a generic fitness app, not a full workout tracker, not a dashboard, not a chatbot, and not a workout planner.

## Current MVP Flow

Implement and preserve this flow:

1. Start Screen / Exercise Selection
2. Recording Guide
3. Set Logger + Video Upload
4. Processing / Analyzing
5. Rep Lab Review

Navigation should be simple and local-state driven unless there is a clear reason to add routing.

## Supported Exercises

Use exactly these UI labels:

- Push-Up
- Bodyweight Squat
- Bicep Curl

Use these backend values:

- Push-Up -> `push_up`
- Bodyweight Squat -> `squat`
- Bicep Curl -> `bicep_curl`

For the MVP, use **Bicep Curl**, not “Standing Dumbbell Bicep Curl,” “Standing Curl,” or “Curl Pattern.”

## Frontend Stack

Use:

- Vite
- React
- TypeScript
- Tailwind CSS
- lucide-react when useful
- custom inline SVGs for exercise glyphs if needed

Do not migrate to Next.js.
Do not add shadcn/ui unless explicitly requested.
Do not add new dependencies unless necessary.

## Windows Command Notes

When running npm commands on Windows PowerShell, prefer:

```powershell
npm.cmd run dev
npm.cmd install
npm.cmd install lucide-react
npm.cmd install -D tailwindcss @tailwindcss/vite
```

PowerShell may block `npm.ps1`, so `npm.cmd` is safer.

## Design References

Use the Stitch export and references located under:

```text
../docs/stitch/
```

Important files may include:

- `DESIGN.md`
- screenshots for Start Screen
- screenshots/code for Recording Guide
- screenshots/code for Set Logger + Video Upload
- screenshots/code for Rep Lab Review
- screenshot for Processing / Analyzing

Use the Stitch export as **visual reference**, not as raw production code.

Do not blindly paste generated HTML from Stitch. Rebuild the UI as clean React components.

## Visual Identity

RepLab visual direction:

- dark premium
- beginner-friendly sports-science lab
- replay-style visual analysis
- calm confidence
- technical but not intimidating
- evidence-based feedback

Use:

- near-black background
- charcoal cards
- Technical Cyan as the primary identity color
- Soft Green for good/positive states
- Amber for “needs work” or normal technique warnings
- Muted Red only for destructive/critical states
- strong white typography
- subtle borders
- mobile-first spacing

Avoid:

- Electric Lime
- purple SaaS gradients
- white/light app screens
- dashboards
- generic fitness app layouts
- heavy bodybuilding aesthetic
- medical/scanner UI
- social feed UI
- trainer marketplace UI
- chatbot-first UI

## Color Meaning

Use this semantic mapping:

- Cyan = what RepLab detected or selected
- Green = what looked good
- Amber = what needs attention
- Red = destructive or critical only
- White = what the user should understand
- Gray = secondary context

## Microcopy Rules

Tone should be calm, practical, and beginner-friendly.

Good phrases:

- Build confidence before adding weight
- Review your reps
- Analyze Set
- Your last reps got shorter
- Keep the same depth
- Repeat before adding weight
- Good control early, fatigue showed later
- Start with one short side-view set
- Side-view clip
- Full body visible

Avoid:

- bad form
- injury risk
- biometrics
- skeletal data
- AI trainer
- performance scanner
- medical analysis
- perfect technique
- failed rep

## Screen Requirements

### 1. Start Screen / Exercise Selection

Purpose:
The user chooses one supported exercise and starts a review.

Requirements:

- Hero headline: `Build confidence before adding weight.`
- Supporting text: `Review one set, see how your reps looked, and get a smarter next step.`
- Flow strip: `Choose → Upload → Review`
- Exercise cards:
  - Push-Up
  - Bodyweight Squat
  - Bicep Curl
- Default selected exercise: Bodyweight Squat
- Dynamic CTA: `Start [Exercise] Review`
- Secondary action: `How recording works`

Polish notes:

- Replace exercise icons manually with simple Technical Cyan line SVGs.
- Do not rely on Stitch to insert small icons.
- Push-Up icon: side-view push-up glyph.
- Bodyweight Squat icon: squat glyph.
- Bicep Curl icon: arm curl or dumbbell curl glyph.

### 2. Recording Guide

Purpose:
Teach the user how to record correctly.

Requirements:

- Title: `Record your set correctly`
- Subtitle: `A better setup helps RepLab review your reps more clearly.`
- Hero setup card: phone low, side view, support object like water bottle/gym bottle.
- Checklist:
  - Side view
  - Phone low
  - Full body visible
  - Good lighting
  - 3–8 reps
  - 5–15 seconds
- Quick tip:
  - `Use a water bottle, gym bottle, shoe, or bag to support your phone. You do not need a tripod.`
- CTA: `Got it, start upload`
- Secondary: `Back to exercise`

Implementation note:
The checklist can be informative bullets or interactive checks. Do not over-engineer.

### 3. Set Logger + Video Upload

Purpose:
Collect basic set context and video.

Requirements:

- Exercise: Bodyweight Squat by default
- Set: Set 2 of 4
- Reps: 8
- Load: Bodyweight
- RIR: 2 RIR
- Recording checklist chips
- Video upload slot
- CTA: `Analyze Set`
- Secondary: `Open Recording Guide`

Polish notes:

- Use `Bodyweight`, not `BW`.
- Remove any `Live` label.
- Video card should feel like an implementable upload slot.
- If file is selected, show filename and ready state.
- Use “Replace video” instead of a visually aggressive trash icon when possible.

### 4. Processing / Analyzing

Purpose:
Bridge upload and review.

Requirements:

- Title: `Analyzing your set`
- Subtitle: `RepLab is reviewing your video frame by frame.`
- Video placeholder card with filename, duration, and Processing state.
- Stepper:
  - Uploading video
  - Detecting reps
  - Extracting keyframes
  - Checking consistency
  - Building next action
- Example progress detail: `Detecting rep 4 of 8`
- Info card:
  - Title: `What RepLab checks`
  - Body: `Range, control, and consistency across your reps.`
- Bottom action: `Cancel analysis`

Implementation note:
If Stitch’s info card looks visually broken, implement it cleanly in code.

### 5. Rep Lab Review

Purpose:
Hero screen of the MVP.

Requirements:

- Exercise: Bodyweight Squat
- Set: 8 reps
- Video placeholder / user video slot
- Rep timeline
- Best Rep card:
  - `Best Rep · 3`
  - `Full depth`
  - use Soft Green
- Needs Work card:
  - `Needs Work · 8`
  - `Short depth`
  - use Amber
- Findings:
  - `Depth dropped after rep 5. Fatigue likely caused shorter range near the end of the set.`
- Correction:
  - Title: `Keep the same range`
  - Body: `Your last reps got shorter. Try matching the same depth on every rep before adding difficulty.`
- Next Action:
  - Title: `Repeat before adding weight`
  - Body: `Your early reps were stable, but depth became less consistent later in the set.`
- CTAs:
  - `Save Review`
  - `Try Next Set`

Implementation notes:

- Keep video as an implementable placeholder slot unless real video preview is easy.
- Avoid red for normal technique feedback.
- Make sure Next Action is not hidden behind sticky CTA.

## Backend Integration

Backend is in:

```text
../Backend
```

API base should come from:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Endpoint:

```text
POST /api/analyze_set
```

Send `FormData` fields:

- `video`
- `exercise`
- `target_reps`
- `completed_reps`
- `rir`

Expected backend response may include:

- `log_id`
- `form_score`
- `progression_recommendation`
- `keyframe_paths`
- `gemini_analysis`

Implement backend integration only after the mock UI flow is working.

If backend fails, show a friendly fallback and allow mock review data so the demo does not break.

## Implementation Priorities

Priority 1:
Make the app run locally.

Priority 2:
Implement the full mock flow with clean components.

Priority 3:
Connect backend with safe fallback.

Do not overbuild.

Avoid:

- auth
- profile
- history
- dashboard
- chatbot
- full workout tracker
- workout programming
- social/community
- payments/subscriptions

## Component Guidance

Prefer clean, reusable components:

- MobileShell
- AppHeader
- ExerciseCard
- FlowStrip
- RecordingGuideCard
- ChecklistItem
- SetContextCard
- VideoUploadSlot
- ProcessingStepper
- RepTimeline
- BestNeedsWorkComparison
- FindingsCard
- CorrectionCard
- NextActionCard
- BottomCTA

Keep components simple and readable.

## Testing / Verification

After changes, run:

```powershell
npm.cmd run dev
```

If lint script exists, run:

```powershell
npm.cmd run lint
```

Before finishing a task, report:

- files changed
- commands run
- any errors or assumptions
- next recommended step
