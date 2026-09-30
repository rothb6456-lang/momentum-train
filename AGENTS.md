# AGENTS.md

## Project identity

Momentum is a static, local-first training PWA.

## Stack

- Vanilla JavaScript
- HTML/CSS
- PWA APIs
- localStorage
- Service Worker
- Reviewed Markdown
- No framework
- No build step

Bulldog is a separate Laravel repository.

## Non-negotiable architecture

Normal planning, logging, review, and local persistence must work without a live backend.

Use strict per-concern localStorage keys. Do not consolidate unrelated state.

Current keys include:

```text
momentum.active.v3
momentum.sessions.v3
momentum.cockpit.v1
momentum.editor.v1
momentum.profile.v1
momentum:lastView
momentum_sanctum_token
momentum.queued-workouts.v1
```

## Module rules

- `app.js`: UI, state, logging, persistence
- `planner.js`: parsing/normalization
- `workout-cards.js`: prescribed/starter cards
- `data.js`: reviewed Markdown data
- `sync.js`: optional Bulldog API boundary
- `sw.js`: cache lifecycle

## Parser rules

Workout metadata is not an exercise. Test parser changes against table and narrative cards, timed exercises, treadmill/cardio lines with multiple numbers, optional exercises, target duration, and confidence metadata.

Do not let speed, incline, duration, RIR, tempo, or other metadata become accidental exercise records.

## API rules

The current Bulldog integration targets `/api/v1/training/*`.

Before changing `sync.js`:
1. Inspect Bulldog `routes/api.php`.
2. Inspect the relevant controller.
3. Confirm Sanctum middleware.
4. Confirm request/response fields.
5. Test authenticated and unauthenticated behavior.

Do not infer endpoints by convention.

## Known pitfalls

### 1. Invalid login endpoint

Bulldog now exposes `POST /api/v1/auth/login` and the single-use `POST /api/v1/auth/exchange` bridge. The browser `/login` route remains a separate session surface. Verify both repositories when changing account handoff.

### 2. bindLog() scope regression

A `bindLog()` binding was accidentally placed outside its intended execution block and failed to run. When changing event binding, inspect braces and execution scope, verify the DOM exists, and exercise the Log view.

### 3. Backend schema drift

A Bulldog API controller failed after querying a column that a later migration had dropped. Inspect current migrations and current model/controller code before using a database field.

### 4. Service-worker staleness

The PWA can retain cached application code. Update the cache identifier when the app shell changes and verify close/reopen behavior.

### 5. Parser regressions

Numeric treadmill/cardio metadata can be mistaken for exercise/set data. Preserve metadata/exercise separation.

## Data safety

Do not deploy credentials, API keys, raw private health/training exports, or unreviewed workbook data.

## Local execution

There is no build command:

```bash
python3 -m http.server 8000
```

Do not use `file://`.

## Change discipline

Make the smallest coherent change. For cross-repository changes, document the contract and validate both sides. For durable architectural decisions, update `ARCHITECTURE.md` and its ADR list.
