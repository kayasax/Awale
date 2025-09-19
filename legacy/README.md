# Legacy Assets (Archived)

These files/folders were part of the earlier Azure / Microsoft Teams bot deployment experiment or early ad‑hoc demos. They are retained for historical reference but are no longer maintained.

## Contents
- `azure.yaml` & `infra/` – Initial Azure infrastructure-as-code (Bicep) and azd config (deployment path abandoned in favor of static GitHub Pages web app).
- `teams-app/` – Original Microsoft Teams app manifest, icon assets, and helper scripts.
- `TEAMS_SETUP.md` – Setup instructions for the Teams bot/app during the first iteration.
- `IT_EXCEPTION_REQUEST.md` – Internal exception / approval request notes tied to the blocked tenant deployment.
- `demo/` – Prototype scripts (CLI + adaptive card) predating the current React web UI.
- `DEMO_ALTERNATIVES.md` – Brainstorm notes for earlier demonstration strategies.
- `web-demo.html` – Standalone minimal HTML harness predating the React/Vite build.

## Rationale
The project pivoted to a browser-based React + TypeScript implementation deployed via GitHub Pages. The Azure + Teams route was blocked by organizational constraints and is not part of the active roadmap.

## Retrieval
All files are also available in Git history (tag `pre-legacy-cleanup` will be created). Keep or remove this folder later once fully confident no information is needed.

## Current Active Implementation
Refer to:
- `packages/web/` – React/TypeScript game client
- `README.md` (root) – Project overview
- `CHANGELOG.md` / `RELEASE_NOTES_*` – Release history

---
If you need to resurrect any part of the old deployment workflow, start by copying the relevant files out of this directory and updating them to current dependencies.
