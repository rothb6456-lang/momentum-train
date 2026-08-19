# Momentum Training Intelligence

Static, private PWA for workout cards, direct capture, and training analysis.

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
