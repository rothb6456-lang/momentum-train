# Momentum Training Intelligence

Static, private PWA for workout cards, direct capture, review, and training analysis.

## Current first-pass capabilities

- Five mobile-first screens: Home, Today, Log, Review, and History.
- Prescribed Phase 9 / Week 3 / Day 2 card with exercise-level logging launch points.
- Durable device-local active-session autosave and completed-session review queue.
- Direct set capture for load, reps or duration, three-part tempo, RIR, checkpoint, note, and structured quick tags.
- Coach-ready debrief copy, Momentum-native JSON export, and CSV export shaped for the Momentum Excel staging path.
- Markdown-backed historical metrics, phase workload, exercise defaults, and session history.

## Local data boundary

Active and completed Momentum sessions stay in the browser's local storage on the current device. They are not uploaded automatically. Export a completed session from **Review** before clearing browser data or changing devices.

### CSV staging fields

The CSV export emits the current staging-schema fields:

`Routine_Name`, `Activity_Date`, `Exercise_Name`, `Exercise_Muscle_Groups`, `Exercise_Equipment`, `Exercise_Date_Time`, `Repetitions_Or_Duration`, `Weight_Or_Distance`, `Use_Metric`, `Note`, and `Superset`.

Tempo, RIR, quick tags, checkpoints, and performance notes are retained in `Note`. Muscle group and equipment remain intentionally blank in this first pass so the Excel lookup/staging logic can enrich them.

## Safety and data boundary

The deployed app never reads `Training_Database.xlsx`. It uses only the Markdown snapshots in `data/`, so the workbook remains safe to open and update in Excel.

## Data refresh

1. Refresh the Excel workbook's Power Query outputs.
2. Export the four Markdown source snapshots.
3. Replace the matching files in `dashboard/data/`.
4. Deploy `dashboard/` to Cloudflare Pages.

## Deployment

Upload all files within `dashboard/` to the `momentum-train` Cloudflare Pages project. Do not upload the parent training-source folder or any Excel workbook.

## Gym-floor workflow

1. Open **Today** and select the prescribed card exercise.
2. Record each completed set in **Log workout**.
3. Record shoulder and grip context once per session.
4. Finish the session and copy the structured Coach debrief.

For unusual, substituted, or retrospective work, use **Log workout** directly.

## Git setup

Initialize this `dashboard/` folder as a private GitHub repository, then connect it in Cloudflare Pages for automatic deploys. Do not commit raw health exports outside the reviewed Markdown snapshots.

The included `DEPLOYMENT_CHECKLIST.md` is the release gate.
