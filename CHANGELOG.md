# Changelog

## 2026-09-09 (Patch V1.1.2)

- **Issue 1 (Rest Timer)**: Fixed countdown tick logic to evaluate `remaining <= 0` prior to decrementing, rendering explicit `0s`, triggering haptic vibration & Web Audio chime, and clearing interval cleanly.
- **Issue 2 (Logo & Theme)**: Consolidated theme variables in `:root` and added `mix-blend-mode: screen` on brand marks to eliminate white backgrounds against dark blue containers.
- **Issue 3 (Sync & Auth Error Handling)**: Added robust HTTP status and response text catching in `syncSessionToStatbook`, Sanctum Bearer token headers, and authentication modal handling.
- **Issue 4 (Multi-Card Queue & Calendar Strip)**: Added `momentum_queued_plans` array storage, multi-card queue management, and the 7-day rolling calendar strip component (`renderWeeklyCalendarStrip`).
- **Issue 5 (Date Field Layout)**: Constrained `input[type="date"]` with flex-safe bounds and padding to eliminate calendar picker clipping across mobile viewports.
- Updated Service Worker cache version to `momentum-v1.1.2`.

## 2026-08-19

- Added a static Markdown data layer; the web app does not read or lock the Excel workbook.
- Added source snapshots to the deployable app package.
- Added prescribed-card data model and executable Phase 9 Week 3 Day 2 card.
- Added a grouped recent/library exercise selector, session context, structured Coach export, and durable local session record.
- Added PWA offline caching for app assets and approved Markdown data snapshots.
# Momentum redesign — first pass

- Replaced the prototype interface with mobile-first Home, Today, Log, Review, and History screens.
- Added local active-session autosave, restore-after-refresh, completed-session storage, review staging, and status tracking.
- Added structured gym-floor set capture: reps/duration toggle, load, three-part tempo, RIR chips, notes, technical checkpoints, quick tags, duplicate, and delete.
- Added Coach debrief, Momentum JSON, and Excel-staging CSV exports.
- Hardened Markdown loading to support both header-table exports and the current positional core export.
- Updated the service-worker cache version for the redesigned client.
