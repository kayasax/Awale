# Awale (Oware) – Web Game & Engine

![Build](https://img.shields.io/github/actions/workflow/status/kayasax/Awale/build.yml?branch=master&label=CI)
![Pages Deploy](https://img.shields.io/github/actions/workflow/status/kayasax/Awale/pages.yml?branch=master&label=Pages)
![Release](https://img.shields.io/github/v/tag/kayasax/Awale?label=latest%20tag)
![License](https://img.shields.io/badge/license-MIT-blue)

**▶ Live Demo:** https://kayasax.github.io/Awale/

> Modern, accessible implementation of Awale (Oware / Mancala family) with animated sowing, capture effects, subtle audio, theming, and a reusable rules engine. **[Play it now →](https://kayasax.github.io/Awale/)**

The original plan (a Microsoft Teams bot) was abandoned due to tenant restrictions. The project pivoted into a polished, self‑contained browser game powered by the same core engine. Azure/Bot artifacts remain in history but are no longer the focus.

## ✨ Features
- Deterministic rules engine with starvation & capture logic
- Greedy AI opponent (baseline strategy)
- Animated sowing (per‑seed timing) + hand position indicator
- Capture sparkles + gain/loss delta badges
- Two themes (dark & wood) with unified scenic background
- Subtle Web Audio feedback (drops, capture, game end)
- Keyboard & screen‑reader friendly (aria-live updates, labeled pits)
- Production build via custom esbuild script + Vite dev server
- Dynamic version injection (footer shows current package version)

## 🗂 Monorepo Structure
```
packages/
  core/      # Pure engine + AI strategy
  shared/    # Shared types
  web/       # React/TypeScript frontend (vite dev + esbuild prod)
```

## 🚀 Quick Start
Clone & install (workspaces):
```
git clone https://github.com/kayasax/Awale.git
cd Awale
npm install
```
Run dev server (hot reload via Vite):
```
npm run dev -w @awale/web
```
Open: http://localhost:5173 (or the port Vite reports)

Production build (esbuild):
```
npm run build -w @awale/web
```
Preview production build locally:
```
npm run preview -w @awale/web
```

## 🧪 Tests
Engine tests placeholder (add under `packages/core`). Example command:
```
npm test
```
(Add Jest or Vitest config as engine tests grow.)

## 🔧 Build Details
- Dev: Vite handles module graph & fast HMR.
- Prod: Custom `build-esbuild.cjs` bundles `app.js`, copies CSS & public assets, injects version constant, produces relative paths for GitHub Pages.
- GitHub Actions: `build.yml` (CI), `release.yml` (tag assets), `pages.yml` (deploy site to Pages with SPA 404 fallback).

## 🌐 Deployment (GitHub Pages)
The `pages.yml` workflow builds on pushes to `master` and publishes the `dist` output; assets use relative paths so it works under `/<repo>/`.

## 🔁 Roadmap Ideas
- Stronger AI (minimax / heuristic pruning)
- Optional difficulty levels
- Move history & replay
- Mobile layout refinements
- Sound toggle persistence (localStorage)
- PWA (offline play)

## 🧠 Engine Notes
- 12 pit array (0‑5 player, 6‑11 AI)
- Capture scanning backward across opponent row when final seed lands there with 2–3 seeds
- Starvation prevention ensures opponent not left foodless unless unavoidable

## 📄 License
MIT (to be finalized) – consider this permissive; see upcoming LICENSE file.

## 🙌 Acknowledgements
Built during Hackathon 2025 iteration; pivoted from constrained Teams bot deployment to a clean web experience.

## 📬 Feedback
Issues and suggestions welcome via GitHub Issues.

