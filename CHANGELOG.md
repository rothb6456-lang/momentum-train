# Changelog

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
