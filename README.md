# Momentum Training Intelligence

Momentum is the Bulldog ecosystem's local-first training PWA. It is a static, mobile-first application for planning, logging, reviewing, and exporting workouts.

Core operation does not require a backend or database. Optional authenticated features connect to the Bulldog Laravel API.

> `bulldogstats.com` is a separate WordPress site and is not part of this repository.

## Stack

- Vanilla JavaScript
- HTML/CSS
- PWA APIs
- localStorage
- Service Worker
- Reviewed Markdown data
- No framework
- No build step
- Optional Laravel/Sanctum API integration

## App surfaces

- Today
- Plan
- Log
- Review
- History

## Module responsibilities

- `app.js`: application state, rendering, navigation, logging, profile UI, persistence
- `planner.js`: workout parsing, normalization, queueing
- `workout-cards.js`: prescribed cards and starter templates
- `data.js`: reviewed Markdown data access
- `sync.js`: optional Bulldog authentication, catalog/session/Coach API calls
- `sw.js`: offline cache lifecycle

## Local-first storage

Use strict per-concern storage keys. Current keys include:

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

The authentication token is separate from workout data. New persistent concerns should normally receive their own versioned key.

## Session lifecycle

```text
plan -> queue -> cockpit -> active session
     -> local set logging -> completed session
     -> review/history -> optional Bulldog sync
```

Failed network requests must not destroy local workout data.

## Parser

The parser converts authored workout cards into structured plan blocks. Workout metadata is not an exercise. Numeric fragments such as treadmill speed, incline, target duration, and confidence must not become accidental exercise records.

Test both table-style and narrative cards when changing parser behavior.

## Markdown reference data

Runtime data comes from reviewed files:
- `data/01_Training_Core.md`
- `data/02_Training_Reference.md`
- `data/03_Training_Analysis.md`
- `data/04_Training_Schema.md`

The Excel workbook is a source artifact, not a runtime dependency.

## Bulldog integration

Current training API examples:

```text
GET  /api/v1/training/exercises
GET  /api/v1/training/body-structures
POST /api/v1/training/body-structures/{bodyStructure}/learned
GET  /api/v1/training/sessions
POST /api/v1/training/sessions
GET  /api/v1/training/sessions/{session}
POST /api/v1/training/coach/generate-card
```

These routes are Sanctum-protected.

`POST /api/v1/auth/login` is the supported token endpoint. The Bulldog hub also launches Momentum through a single-use, 90-second code exchanged at `/api/v1/auth/exchange`; no second password entry is needed. `account-bridge.js` partitions local workspaces by account before loading `app.js`. Tokens are kept separate from archived workouts.

`card-filters.js` derives equipment and body structure filters from required exercises and canonical catalog aliases. Unknown metadata excludes a card from restrictive equipment filters. `beta-tools.js` provides hub navigation, install guidance, and the Log walkthrough. Profile updates sync to `/api/v1/training/profile`; workout retries use the original client session ID.

Run `node tests/card-filters.cjs`, `node tests/account-bridge.cjs`, and `node tests/parser-smoke.js` from this repository. Cloudflare Pages project `momentum-train-app` deploys `main` to `train.bulldogstats.com`; pushing main publishes the application.

## Offline behavior

The service worker caches the app shell and reviewed data. After changing cached assets, update the service-worker cache identifier and test close/reopen behavior on an installed PWA.

## Local execution

Momentum has no build step:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Do not use `file://`.

## Deployment

The current production path is static hosting through Cloudflare Pages at `train.bulldogstats.com`.

Before release, verify the five views, persistence, parser behavior, offline reopen, mobile controls, service-worker updates, and intended authenticated sync.

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

## Data safety

Do not deploy credentials, API keys, raw private health/training exports, or unreviewed source artifacts.
