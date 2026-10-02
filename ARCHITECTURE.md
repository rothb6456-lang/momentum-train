# Momentum Architecture

> Status: Active
> Scope: Static local-first training PWA with optional Bulldog API integration

## 1. Principles

### ADR: sourced education and completion (2026-09-30)

`education.js` owns the body explorer and introductory lessons. `education-lessons.json` is mirrored exactly in Bulldog `resources/education/lessons.json`; the contract test rejects drift. Each lesson has a source, version and knowledge check. `momentum.education.v1` stores pending/confirmed completion separately from profile and workout data, and is partitioned by the existing account bridge. Only the authenticated server grants XP, once per lesson and PlayerIdentity, after validating the answer. Failed requests remain pending; online/focus/manual retry resends them. No team timeline is created.

The front/back OpenStax image is a muscle reference with regional navigation. Layer selection changes introductory lesson content, not an anatomical dissection. Z-Anatomy assets are not bundled. Attribution is in `assets/anatomy/ATTRIBUTION.md` and the UI. Old `learnedStructureIds` remain preserved but are not proof of lesson completion. `education-anatomy.json` provides sourced short descriptions for the 32 existing catalog structures; five foundational lessons carry knowledge checks and XP. Exercise associations use canonical catalog records, not name guesses. Exercise-specific comparative studies still require deliberate review and expansion.

1. Local-first is the primary runtime model.
2. No build step is required.
3. State is separated by concern.
4. Gym-floor logging must tolerate loss of network connectivity.
5. Bulldog is optional for core logging and authoritative for synced server records.
6. The client must not invent backend contracts.

## 2. System map

```text
Momentum PWA
  +-- app.js / UI and state
  +-- planner.js / parsing
  +-- workout-cards.js / prescribed data
  +-- data.js / Markdown data
  +-- sync.js / network boundary
  +-- sw.js / offline cache
  +-- localStorage / local persistence
  +-- optional Sanctum API
             |
             v
      Bulldog /api/v1/training
```

## 3. Storage architecture

| Concern | Key |
| --- | --- |
| Active session | `momentum.active.v3` |
| Completed sessions | `momentum.sessions.v3` |
| Cockpit | `momentum.cockpit.v1` |
| Editor | `momentum.editor.v1` |
| Profile | `momentum.profile.v1` |
| Last view | `momentum:lastView` |
| Auth token | `momentum_sanctum_token` |
| Queue | `momentum.queued-workouts.v1` |

Storage keys are part of the persistence contract. Use a new versioned key or explicit migration when a shape becomes incompatible.

## 4. Session flow

```text
Plan -> queue -> cockpit -> active session
     -> set records -> completed session
     -> review/history -> optional cloud sync
```

Local persistence remains primary. API failure must not destroy local records.

## 5. Parser architecture

The parser is the compatibility boundary between authored cards and structured state. It must separate metadata from exercises, preserve load/sets/reps/tempo/RIR/rest, and avoid interpreting treadmill/cardio numeric fragments as separate exercises.

## 6. API architecture

Momentum consumes explicit Bulldog training endpoints under `/api/v1/training`. Before changing `sync.js`, inspect Bulldog's current `routes/api.php`, controller, middleware, and request/response fields.

### Authentication warning

Bulldog currently has browser `/login`, but its API route table does not define `/api/v1/auth/login`. A token-issuance endpoint must be explicitly designed before Momentum can depend on one.

## 7. Service worker

The service worker uses a versioned cache and network-first behavior for core application paths with cached fallback. Update the cache identifier when releases alter the cached shell and verify installed-PWA close/reopen behavior.

## 8. Deployment

```text
GitHub -> Cloudflare Pages -> train.bulldogstats.com
```

Momentum is static. There is no server runtime or frontend build pipeline.

## 9. Active ADRs

### ADR-001: Local-first state
Core planning/logging remains usable without the backend.

### ADR-002: No build step
The app is static HTML/CSS/JavaScript.

### ADR-003: Concern-specific storage keys
Persistent state is divided into explicit localStorage concerns.

### ADR-004: Reviewed Markdown runtime data
Historical context is deployed as reviewed Markdown rather than requiring the workbook.

### ADR-005: Optional cloud sync
Cloud synchronization augments local persistence rather than replacing it.

### ADR-006: Explicit API contract
The client consumes only endpoints confirmed by the Bulldog route/controller contract.

### ADR-007: Parser compatibility
Workout-card parsing must preserve established formats and keep metadata separate from exercises.

### ADR-008: Service-worker versioning
Offline assets require explicit cache-version changes when releases alter the cached shell.

## 10. Risks

- Authentication remains a separate browser/API contract.
- Service-worker caches can preserve stale code.
- Parser changes can affect historical card formats.
- Clearing browser storage can remove unsynced local records.
- Backend schema drift can break synchronization.
