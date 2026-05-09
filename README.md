# RepLab

**Build confidence before adding weight.**

RepLab is a mobile-first workout review app that turns a short set video into visual evidence, rep-by-rep feedback, and a smarter next-set recommendation.

Traditional workout logs store what you did. **RepLab helps you understand how it looked.**

---

## Why RepLab?

Most workout trackers are excellent at logging numbers: sets, reps, load, and RIR. But numbers alone do not tell the whole story.

A beginner or intermediate lifter might complete the target reps, but their last reps could become shorter, less controlled, or less consistent. RepLab focuses on that exact moment:

> After finishing a set, should I add weight, repeat the same set, slow down, or fix technique first?

RepLab uses a short side-view video to make that decision clearer.

---

## Demo preview

> Add final screenshots or GIFs here before submitting.

| Start | Upload | Review |
|---|---|---|
| `<img width="121" height="81" alt="small" src="https://github.com/user-attachments/assets/c71dc321-a267-4f05-9f9a-4a0a3ca9c99b" />` | `<img width="121" height="81" alt="small-4" src="https://github.com/user-attachments/assets/fe78afa5-60f3-4acd-9fca-44c04861e93b" /> | `<img width="121" height="81" alt="small-5" src="https://github.com/user-attachments/assets/175c2553-f2db-4fe4-9777-6677ef8261d4" />` |

---

## What it does

RepLab guides the user through a focused workout review loop:

1. Choose one supported exercise
2. Learn how to record the set correctly
3. Log basic set context
4. Upload a short side-view video
5. Wait while the set is analyzed
6. Review the rep-by-rep results
7. Get a next-set recommendation

The MVP supports:

- Push-Up
- Bodyweight Squat
- Bicep Curl

Each clip follows a simple recording setup:

- phone placed low near the floor
- phone supported by a water bottle, gym bottle, shoe, or bag
- side-view angle
- full body visible
- decent lighting
- around 3–8 reps
- around 5–15 seconds

---

## Core features

### Mobile-first RepLab flow

The frontend is designed as a focused mobile app experience:

- Start / Exercise Selection
- Recording Guide
- Set Logger + Video Upload
- Processing / Analyzing
- Rep Lab Review

### Visual rep review

The review screen is built around evidence, not chat:

- uploaded set video slot
- rep timeline
- selected keyframes
- best rep vs needs-work comparison
- findings card
- correction cue
- next action card

### Computer vision pipeline

The backend processes the uploaded workout video and extracts structured visual information.

The current pipeline:

- receives a video upload through FastAPI
- saves the video temporarily
- runs pose/movement analysis
- tracks exercise-specific joint angles
- detects movement phases
- extracts keyframes for reps
- labels range-of-motion quality
- computes a form score

### Gemini multimodal analysis

Gemini is used to analyze extracted rep images and return structured feedback, such as:

- rep scores
- best rep
- worst rep
- correction cards

The backend includes fallback behavior so the demo can remain stable even if external AI configuration is unavailable.

### Smart progression recommendation

RepLab turns the analysis into a simple training decision:

- repeat before adding weight
- add reps
- keep the same load
- slow down
- progress when the set is consistent

---

## Tech stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- lucide-react
- Mobile-first UI
- Dark Technical Cyan visual system

### Backend

- Python
- FastAPI
- OpenCV
- Pose estimation / movement analysis
- Google Gemini
- Local workout logging

---

## Repository structure

```txt
HackDays2026/
├── Backend/
│   ├── api/
│   │   └── routes.py
│   ├── cv/
│   │   └── pipeline.py
│   ├── database/
│   │   └── manager.py
│   ├── services/
│   │   ├── gemini_client.py
│   │   └── progression.py
│   └── main.py
│
├── Frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── services/
│   │       └── api.ts
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    └── stitch/
```

---

## Running locally

### 1. Clone the repository

```bash
git clone https://github.com/MaCaDo1136/HackDays2026.git
cd HackDays2026
```

---

## Backend setup

From the repository root:

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install python-dotenv google-genai pillow uvicorn
python -m uvicorn main:app --reload --port 8000
```

Check that the backend is running:

```txt
http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## Frontend setup

Open a second terminal:

```powershell
cd Frontend
npm.cmd install
npm.cmd run dev
```

Vite should start at:

```txt
http://localhost:5173/
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is blocked.

---

## API overview

### Health check

```http
GET /health
```

### Analyze a set

```http
POST /api/analyze_set
```

Expected `FormData` fields:

| Field | Type | Example |
|---|---:|---|
| `video` | File | `squat_set_02.mp4` |
| `exercise` | string | `squat` |
| `target_reps` | number | `8` |
| `completed_reps` | number | `8` |
| `rir` | number | `2` |

Supported exercise values:

| UI label | API value |
|---|---|
| Push-Up | `push_up` |
| Bodyweight Squat | `squat` |
| Bicep Curl | `bicep_curl` |

Example response shape:

```json
{
  "log_id": 1,
  "form_score": 82.5,
  "progression_recommendation": "Repeat before adding weight",
  "keyframe_paths": ["temp/rep1_good_bottom.jpg"],
  "gemini_analysis": {
    "best_rep": 3,
    "worst_rep": 8,
    "correction_cards": []
  }
}
```

### Logs

```http
GET /api/logs
```

Returns saved workout logs ordered newest first.

---

## MVP scope

RepLab is intentionally focused.

It is not:

- a full workout tracker
- a routine builder
- a social fitness app
- a chatbot wrapper
- a medical tool
- an injury prediction system
- a professional biomechanics platform

It is a focused set-review loop:

```txt
Log Set → Upload Video → Review Reps → Get Next Action
```

---

## Design direction

RepLab uses a dark, premium, sports-science lab aesthetic:

- near-black background
- charcoal cards
- Technical Cyan as the primary accent
- Soft Green for good states
- Amber for needs-work states
- Muted Red only for destructive or critical states
- calm, beginner-friendly copy
- replay-style visual analysis

The goal is to make technique review feel practical, accessible, and less intimidating.

---

## Challenges

The hardest part was keeping the MVP narrow.

It would have been easy to build a generic AI fitness app, a complete workout logger, or a chatbot that talks about exercise videos. Instead, RepLab focuses on one specific high-value moment:

**What should I do after this set?**

Other challenges included:

- turning short videos into structured information
- keeping recording requirements simple enough for beginners
- avoiding medical or injury-related overclaims
- making AI support the workflow without becoming the whole product
- balancing visual polish with hackathon time constraints

---

## Future improvements

Next steps for RepLab:

- improve rep segmentation accuracy
- support more exercises
- make pose analysis more robust across lighting and camera angles
- compare technique quality across sessions
- personalize progression recommendations
- add editable set history
- show long-term consistency trends
- improve keyframe visualization
- support optional coach explanations without making chat the main product

---

## Team

Built during HackDays 2026.

> Add team members, roles, and links here.

---

## Devpost summary

**RepLab turns a short workout set video into a rep-by-rep technique review and a smarter next-set decision, helping lifters build confidence before adding weight.**
