# Momentum Training Intelligence

Momentum is a static, local-first training app for planning, logging, and reviewing workouts without requiring a backend or a live database. The current build is a mobile-first PWA with a dedicated Today/Plan/Log/Review/History flow and a local storage model for active sessions, completed workouts, and draft coaching context.

## Current build overview

This repository is the actual client app, not a dashboard deployment folder. The project root contains the deployable static assets:

- `index.html` — app shell and navigation
- `app.js` — core UI state, rendering, session logic, exports, and view management
- `planner.js` — workout parsing, queueing, and cockpit/session planning helpers
- `workout-cards.js` — starter templates and prescribed-card metadata
- `data.js` — Markdown-backed data access layer for historical metrics
- `sw.js` — service worker for offline caching
- `data/` — reviewed Markdown snapshots used by the app at runtime

The app is intentionally plain HTML/CSS/JavaScript with no framework or build step. It runs as a static site and can be served from Cloudflare Pages, GitHub Pages, or any static host.

## Design and UX

### Mobile-first app structure

The interface is organized as a five-screen training flow:

- Today: landing surface and quick status overview
- Plan: workout queue, manual workout creation, and scheduled card management
- Log: active session capture and per-exercise logging
- Review: completed session review, coaching summaries, and exports
- History: historical view of recorded data and prior sessions

The design is optimized for gym-floor use: compact cards, dense info layout, large action buttons, and a low-friction set-entry pattern for quick logging.

### Workout planning model

Momentum supports three sources of workout structure:

- Prescribed cards such as the current program day structure
- Starter templates for Control, Strength, and Endurance sessions
- Manual or pasted workout cards parsed into reusable queue items

The planner layer converts raw workout text into structured plan blocks, normalizes fields like sets, reps, tempo, load, duration, and RIR, and then builds an active session cockpit for logging.

### Logging workflow

The current logging experience includes:

- Exercise-level capture with set-by-set tracking
- Reps or timed-duration mode selection
- Load input and working-load updates
- Tempo entry using a three-part format
- RIR selection and technical checkpoints
- Quick tags and notes
- Duplicate/delete actions for a session or exercise
- Automatic persistence of the active session in local storage

This makes the app usable for live recording in the gym without a network connection.

## Data model and storage boundaries

### Local-first storage

Momentum stores session data on the current device in browser local storage. The active session, queued plans, review queue, and completed-session records are kept locally and are not uploaded to a server automatically.

This is intentional: the app is designed to behave like a private training log that you can export before changing devices or clearing browser data.

### Data source safety

The app does not read or require a workbook file at runtime. It uses reviewed Markdown files in `data/` as the source of truth for historical training context and analysis.

The repository intentionally avoids pulling in raw Excel exports or unreviewed training files. The workbook remains a separate source artifact and is not deployed with the application.

## Markdown-backed reference data

The repository includes these data snapshots:

- `data/01_Training_Core.md`
- `data/02_Training_Reference.md`
- `data/03_Training_Analysis.md`
- `data/04_Training_Schema.md`

These files supply derived training context, exercise history, reference data, and schema metadata for the app without requiring backend access. The data loader handles the current table-driven markdown formats and is resilient to both the newer structured exports and the earlier positional-core exports.

## Exports and coaching output

The app includes export flows tailored for training review and coaching:

- Coach debrief summary for a completed workout
- JSON export of a completed session in Momentum-native format
- CSV export shaped for the Excel staging process

The CSV is designed to keep the data in a portable staging-friendly structure. Tempo, RIR, technical notes, checkpoints, and quick tags remain associated with the training note fields so the downstream spreadsheet logic can enrich the final view.

## Service worker and offline behavior

The service worker caches the app shell and reviewed data snapshots so the app remains usable after the first load, even when the network is unstable or unavailable. This supports the same workflow on mobile devices and tablet browsers in the gym.

## Repository layout

```text
.
├── app.js
├── data.js
├── planner.js
├── workout-cards.js
├── sw.js
├── index.html
├── manifest.webmanifest
├── README.md
├── CHANGELOG.md
├── DEPLOYMENT_CHECKLIST.md
├── data/
│   ├── 01_Training_Core.md
│   ├── 02_Training_Reference.md
│   ├── 03_Training_Analysis.md
│   └── 04_Training_Schema.md
└── _headers
```

## Deployment guidance

This project is designed to deploy as a static site. The usual process is:

1. Commit the app files and Markdown data snapshots.
2. Connect the repository to a static hosting provider such as Cloudflare Pages.
3. Publish the root directory as the deploy target.
4. Verify the app loads, the service worker caches correctly, and the app works on a mobile browser.

Do not upload raw workbook files, unreviewed health exports, or backend credentials as part of the app deployment.

## Release checklist

Use `DEPLOYMENT_CHECKLIST.md` as the release gate before publishing. It covers workbook safety, markdown refreshes, review of workout cards, mobile verification, and operational guardrails.

## Current product intent

The app is not a backend-driven analytics platform. The current direction is a disciplined, private, mobile-first training log that keeps the coach and athlete aligned through:

- structured gym-floor logging
- local durability
- clean recap and export flows
- reviewed markdown data context
- zero dependence on a live database or workbook in production
