# Momentum deployment checklist

## Before each release

- [ ] Verify the Excel workbook opens normally; it is never deployed.
- [ ] Refresh the workbook and regenerate reviewed Markdown exports.
- [ ] Replace only `data/01_Training_Core.md`, `02_Training_Reference.md`, `03_Training_Analysis.md`, and `04_Training_Schema.md`.
- [ ] Update prescribed cards in `workout-cards.js` when Coach issues them.
- [ ] Run browser checks for Today, Log workout, Coach export, History, offline reopen, and mobile fields.
- [ ] Review `git status`, commit, and push to the private GitHub repository.

## Cloudflare Pages

- [ ] Confirm the production branch is `main`.
- [ ] Confirm `train.bulldogstats.com` remains protected by the one-email Access policy.
- [ ] Deploy from GitHub (preferred) or upload the contents of this folder.
- [ ] Open the deployed app in an iPhone/iPad private session, sign in, and verify new data appears.
- [ ] Close/reopen the installed PWA after a service-worker change.

## Data safety

- [ ] Do not upload `Training_Database.xlsx`, raw Gym Log+ exports, API keys, or unreviewed health files to the app repository.
- [ ] Do not loosen the Cloudflare Access policy beyond the named authorized email.
