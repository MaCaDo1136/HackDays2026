---
name: RepLab
colors:
  surface: '#0a151a'
  surface-dim: '#0a151a'
  surface-bright: '#303b40'
  surface-container-lowest: '#051014'
  surface-container-low: '#121d22'
  surface-container: '#162126'
  surface-container-high: '#212b31'
  surface-container-highest: '#2c363c'
  on-surface: '#d9e4eb'
  on-surface-variant: '#bac9cb'
  inverse-surface: '#d9e4eb'
  inverse-on-surface: '#273237'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe8'
  primary: '#aef8ff'
  on-primary: '#00363a'
  primary-container: '#18e5f2'
  on-primary-container: '#006268'
  inverse-primary: '#00696f'
  secondary: '#64d4f7'
  on-secondary: '#003543'
  secondary-container: '#129dbe'
  on-secondary-container: '#002e3a'
  tertiary: '#daeeff'
  on-tertiary: '#193343'
  tertiary-container: '#b8d3e8'
  on-tertiary-container: '#425b6d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#78f5ff'
  primary-fixed-dim: '#00dbe8'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#b5ebff'
  secondary-fixed-dim: '#64d4f7'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e60'
  tertiary-fixed: '#cbe6fb'
  tertiary-fixed-dim: '#afcade'
  on-tertiary-fixed: '#011e2d'
  on-tertiary-fixed-variant: '#304a5a'
  background: '#0a151a'
  on-background: '#d9e4eb'
  surface-variant: '#2c363c'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.03em
  display-md:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '650'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '650'
    lineHeight: '1.25'
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.55'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.12em
  data-metric:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  gutter: 16px
  card-gap: 12px
  section-gap: 28px
  screen-top-padding: 20px
---

# RepLab Design System

## Brand Core

**Product name:** RepLab  
**Tagline:** Build confidence before adding weight.  
**Positioning:** A beginner-friendly performance lab that turns short workout set videos into visual rep review, technique feedback, and a smarter next action.

RepLab is not a generic workout tracker, not a gym dashboard, not a chatbot, and not a medical analysis tool. It is a focused mobile experience for beginner and intermediate lifters who want to understand how their reps looked before increasing weight or difficulty.

The visual identity should feel like:

- dark premium technical
- sports-science
- replay-style visual analysis
- beginner-friendly
- calm confidence
- evidence-based feedback
- technical but not intimidating

The core emotional response is:

> “I understand what happened in my set, and I know what to improve next.”

## Visual Direction

RepLab uses a **Technical Cyan identity**. Cyan represents what RepLab detects: selected reps, video annotations, active timeline segments, technical highlights, and primary actions.

The application uses a sophisticated **Steel Gray** foundation for its dark mode, providing a modern, technical background that is softer and more professional than pure black.

The app must remain:

- dark mode only
- premium
- calm
- focused
- readable
- mobile-first

Do not use white app backgrounds, light screens, generic SaaS purple gradients, excessive neon, or medical UI patterns.

## Color System

### Foundation

The system uses a neutral Steel Gray palette to create a sense of technical depth:

- **Background:** `#191C1D` (Derived from neutral gray)
- **Lowest surface:** `#111415`
- **Primary card surface:** `#212526`
- **Elevated surface:** `#25292A`
- **Highest surface:** `#3B3F40`

Surfaces should feel layered through tonal contrast and subtle borders (`#3F484A`), not heavy shadows.

### Identity Color

**Technical Cyan** is the primary brand color.

Use cyan for:

- primary CTAs
- active timeline segments
- selected rep states
- video annotations
- data markers
- active checklist states
- focus borders
- technical labels

Primary cyan:

- `#18E5F2`

### Semantic Colors

Use semantic colors carefully. They should support feedback, not dominate the interface.

**Soft Green**  
Use for good technique states, stable reps, completed steps, and positive feedback.

**Amber**  
Use for “Needs Work,” caution, inconsistency, or technique warnings.

**Muted Red**  
Use only for critical issues or destructive actions. Avoid making beginners feel judged.

### Color Meaning

- **Cyan** = what RepLab detected
- **Green** = what looked good
- **Amber** = what needs attention
- **Red** = critical or destructive
- **White** = what the user should understand
- **Gray** = secondary context

## Typography

Use a three-font hierarchy.

### Space Grotesk

Used for:

- app name
- screen titles
- main metrics
- section headers
- key values

It should feel premium and technical without becoming futuristic or gamer-like.

### Manrope

Used for:

- explanations
- educational feedback
- body copy
- exercise descriptions
- recommendation reasoning

It keeps the product beginner-friendly and readable.

### JetBrains Mono

Used sparingly for:

- rep labels
- timestamps
- technical chips
- compact metadata
- timeline labels

Do not overuse monospace. Too much monospace makes the app feel like a developer tool instead of a workout product.

## Voice and Tone

RepLab speaks with calm, direct, evidence-based language.

Use short and helpful phrases.

Good microcopy:

- Review your reps
- Analyze set
- Your last reps got shorter
- Keep the same depth
- Repeat before adding weight
- Good control early, fatigue showed later
- Rep 3 was your most consistent
- Rep 8 lost range
- Save review

Avoid:

- Bad form
- Injury risk
- Skeletal data
- Biometrics
- Perfect technique
- AI trainer
- Medical diagnosis
- Elite performance scanner
- You failed this rep
- Dangerous movement detected

The product should guide the user without judging them.

## Layout Principles

The app is mobile-first.

Use a single-column layout with:

- 20px horizontal padding
- 12px card gaps
- 28px section gaps
- generous vertical rhythm
- clear hierarchy from video → timeline → findings → next action

The most important future screen is **Rep Lab Review**. Every component should support that screen.

## Elevation and Depth

Use tonal layering and subtle borders instead of heavy shadows.

- Background: `#191C1D`
- Card: `#212526`
- Elevated card: `#25292A`
- Floating controls: Semi-transparent overlays with subtle blur
- Borders: `#3F484A`
- Active border: `#18E5F2`

Use a 1px border for most cards. Use cyan borders only when the element is active, selected, or technically important.

## Shape Language

Use structured-rounded shapes to maintain the balance between technical precision and modern accessibility.

- Cards: `rounded-lg` or `rounded-xl`
- Buttons: `rounded-md` or `rounded-full`
- Chips: `rounded-full`
- Video cards: `rounded-xl`
- Bottom sheets: `rounded-xxl` top corners

## Component Guidelines

### Primary CTA

Use for the main action on a screen.

Style:

- background: `#18E5F2`
- text: dark technical neutral
- rounded-full or rounded-lg
- strong label
- high contrast

### Secondary Button

Use for secondary actions.

Style:

- transparent or dark surface
- border: `#3F484A`
- text: `#E1E3E3`

### Rep Timeline

The rep timeline is central to the product.

Each rep segment should communicate one of three states:

- cyan = selected / currently reviewed
- green = consistent / good rep
- amber = needs work
- red = critical issue, used rarely

### Next-Action Card

This is the final decision card.

Style:

- cyan border
- dark card (`#212526`)
- clear CTA
- short reasoning

## Screen Guidance

### Rep Lab Review

This is the hero experience. It should show the exercise name, set summary, video preview with cyan annotations, rep timeline, and the "Smart Next Action."

### Exercise Selection

This screen should feel focused and premium, showing only supported exercises with technical chips indicating what RepLab checks (e.g., Depth, Balance).

## Hard Visual Rules

Do not use:

- Electric Lime or Neon Green as identity colors
- white app backgrounds
- light mode screens
- purple SaaS gradients
- medical app visuals
- harsh red-heavy feedback
- bodybuilder fantasy imagery

Always use:

- Steel Gray technical dark mode
- Technical Cyan primary identity
- calm beginner-friendly language
- evidence-based cards
- replay-style visual analysis
- clear next action

## Final Direction

RepLab should feel like:

> A calm, premium, beginner-friendly sports-science lab that turns one workout set video into visual evidence and a smarter next action.

The visual identity is **Technical Cyan** on a **Steel Gray** foundation.