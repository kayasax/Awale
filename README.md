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
- Sound/theme persistence (localStorage)
- PWA update notification polish (core offline + installable shell shipped in 0.3.0)

## 📱 PWA (Offline Support – since 0.3.0)
The web client includes a Progressive Web App layer (introduced in version 0.3.0):
- `manifest.webmanifest` with install metadata & theme colors
- Service Worker (`sw.js`) precaches core shell (HTML, JS, CSS, background image, manifest, favicon)
- Network‑first strategy for `index.html` ensures new deployments propagate
- Cache‑first for static assets for fast repeat loads offline
- Versioned caches: `awale-static-<version>` auto‑clean old versions on activate
- Update toast prompts user to refresh when a new build is available

Install Tips:
1. Desktop Chrome/Edge: Open the site → install icon in address bar.
2. Android Chrome: Menu → Add to Home screen.
3. iOS Safari: Share → Add to Home Screen (iOS may ignore some meta unless icons provided; PNG icons coming soon).

Offline Testing:
```
npm run build -w @awale/web
npx serve packages/web/dist
```
Load the served URL, then go offline and refresh—game should still load.

## 🧠 Engine Notes
- 12 pit array (0‑5 player, 6‑11 AI)
- Capture scanning backward across opponent row when final seed lands there with 2–3 seeds
- Starvation prevention ensures opponent not left foodless unless unavoidable

## 📄 License
MIT (LICENSE file pending addition). All current source intended to be used under permissive MIT terms; formal file will be added in a subsequent commit.

## 🙌 Acknowledgements
Built during Hackathon 2025 iteration; pivoted from constrained Teams bot deployment to a clean web experience.

## 📬 Feedback
Issues and suggestions welcome via GitHub Issues.

---

## 🌐 (In Progress) Online Multiplayer
Work underway on feature branch `feature/online-multiplayer-aca` to add optional two‑player online games while preserving the existing single‑player AI mode as default.

### Architecture Snapshot
```
Browser (React PWA)
  ↕ secure WebSocket (wss)
Authoritative Node Server (@awale/server)
  ↳ Pure Rules Engine (@awale/core)
```
Frontend continues to deploy statically (GitHub Pages). Multiplayer server runs separately as a container (target: Azure Container Apps or App Service) exposing `/ws` and `/health`.

### Current Server Capabilities
- Create / Join by short game ID
- Engine‑driven move validation & capture logic
- Broadcast state & per‑move capture details
- Resign & natural end detection
- Lightweight rate limiting (token bucket)
- Stale session cleanup (fully disconnected or aged)

### Protocol (Draft)
Client → Server messages:
```jsonc
{ "type": "create", "name": "Alice" }
{ "type": "join", "gameId": "abc123", "name": "Bob" }
{ "type": "move", "gameId": "abc123", "pit": 4 }
{ "type": "resign", "gameId": "abc123" }
{ "type": "ping", "ts": 1737058300000 }
```
Server → Client notable messages:
```jsonc
{ "type": "created", "gameId": "abc123", "playerToken": "..." }
{ "type": "joined", "gameId": "abc123", "role": "guest", "opponent": "Alice" }
{ "type": "state", "gameId": "abc123", "version": 7, "state": { "pits": [...], "currentPlayer": "A", "captured": {"A": 12, "B": 8}, "ended": false, "winner": null, "version": 7 } }
{ "type": "moveApplied", "gameId": "abc123", "seq": 5, "pit": 4, "player": "host", "version": 7, "captured": 3 }
{ "type": "gameEnded", "gameId": "abc123", "reason": "end", "final": { ...snapshot } }
{ "type": "error", "code": "ILLEGAL", "message": "Illegal move" }
```

### Environment Variables (Server)
| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Listen port | `8080` |
| `ALLOWED_ORIGIN` | Restrict WebSocket Origin (optional) | (unset = allow) |
| `RATE_LIMIT_BURST` | Max immediate messages per connection | `20` |
| `RATE_LIMIT_REFILL_MS` | Token refill interval (ms) | `1000` |
| `STALE_DISCONNECT_MS` | Purge game after both players disconnected for this long | `300000` (5m) |
| `MAX_GAME_AGE_MS` | Hard cap to remove very old games | `3600000` (1h) |

### Local Run (Multiplayer Server)
```
npm run build -w @awale/core
npm run build -w @awale/shared
npm run build -w @awale/server
node packages/server/dist/index.js
curl http://localhost:8080/health
```

### Docker
```
docker build -t awale-server:dev packages/server
docker run -p 8080:8080 awale-server:dev
```

### Planned Frontend Additions
- Mode selector (Play vs AI / Play Online)
- Create flow (display game code + share button)
- Join flow (enter code → live board sync)
- Reconnect handling (token reuse – future)

### Azure Deployment (Planned Outline)
1. Build & push image to ACR or Docker Hub.
2. Deploy Azure Container App with ingress (external) on `wss` path `/ws`.
3. Configure env vars for origin + limits.
4. Point frontend to server WebSocket URL (e.g. `wss://<yourapp>.azurecontainerapps.io/ws`).
5. Future: add persistence (Redis or Table Storage) for reconnection & stats.

### Status
Backend core logic merged in feature branch. Frontend integration & documentation polishing in progress. Track tasks in repo TODO / issues.

### 🟦 Azure Deployment (Container Apps – France Central)
The bot-era Azure Function is NOT used for realtime multiplayer. Deploy the new WebSocket server as a container.

#### Choose Region
Using `francecentral` for all resources (low latency from EU). Adjust names to be globally unique.

#### 1. Resource Group
```bash
az group create -n awale-rg -l francecentral
```

#### 2. Azure Container Registry (ACR)
```bash
ACR_NAME=awaleacr$RANDOM   # choose a unique name if needed
az acr create -n $ACR_NAME -g awale-rg --sku Basic --admin-enabled true
az acr login -n $ACR_NAME
```

#### 3. Build & Push Image
From repo root (Dockerfile in `packages/server`):
```bash
IMG_TAG=v0.1.0
docker build -t $ACR_NAME.azurecr.io/awale-server:$IMG_TAG -f packages/server/Dockerfile .
docker push $ACR_NAME.azurecr.io/awale-server:$IMG_TAG
```

#### 4. Create Container Apps Environment
```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App --wait
az containerapp env create -n awale-env -g awale-rg -l francecentral
```

#### 5. Deploy Container App
```bash
FRONT_ORIGIN=https://kayasax.github.io
az containerapp create \
  -n awale-server \
  -g awale-rg \
  --environment awale-env \
  --image $ACR_NAME.azurecr.io/awale-server:$IMG_TAG \
  --target-port 8080 \
  --ingress external \
  --transport auto \
  --registry-server $ACR_NAME.azurecr.io \
  --env-vars ALLOWED_ORIGIN=$FRONT_ORIGIN RATE_LIMIT_BURST=20 RATE_LIMIT_REFILL_MS=1000 \
  --query properties.configuration.ingress.fqdn -o tsv
```
Note the FQDN returned (e.g. `awale-server.<hash>.francecentral.azurecontainerapps.io`).

#### 6. Verify Health
```bash
FQDN=$(az containerapp show -n awale-server -g awale-rg --query properties.configuration.ingress.fqdn -o tsv)
curl https://$FQDN/health
```
Expect `{"status":"ok","games":0}`.

#### 7. Frontend Configuration
Set WebSocket env variable for dev/prod builds:
```
VITE_AWALE_SERVER_WS=wss://$FQDN/ws
```
For GitHub Pages you can inject it at build time:
```bash
VITE_AWALE_SERVER_WS=wss://$FQDN/ws npm run build -w @awale/web
```
Then deploy (existing Pages workflow will publish `dist`).

#### 8. Test
Open two browser windows of the GitHub Pages site:
1. Create Online Game → copy code
2. Join Online Game → paste code
Moves should sync and captures broadcast.

#### 9. Updating the Server
```bash
NEW_TAG=v0.1.1
docker build -t $ACR_NAME.azurecr.io/awale-server:$NEW_TAG -f packages/server/Dockerfile .
docker push $ACR_NAME.azurecr.io/awale-server:$NEW_TAG
az containerapp update -n awale-server -g awale-rg --image $ACR_NAME.azurecr.io/awale-server:$NEW_TAG
```
Clients reconnect automatically (basic reconnect backoff already implemented).

#### 10. Optional Scaling / Hardening
- Add min / max replicas:
  ```bash
  az containerapp scale update -n awale-server -g awale-rg --min-replicas 0 --max-replicas 3
  ```
- Add a simple concurrent connection rule (future): KEDA websocket scaling or HTTP RPS rule once metrics needed.
- Consider instrumentation (App Insights / OpenTelemetry) later.

#### 11. Cleanup
```bash
az group delete -n awale-rg --no-wait -y
```

#### Troubleshooting
| Symptom | Check |
|---------|-------|
| WebSocket fails immediately | `ALLOWED_ORIGIN` matches exact scheme + origin? Ingress FQDN correct? |
| No `created` message | Wrong `VITE_AWALE_SERVER_WS` or network blocked; verify `/health` works first |
| Rate limit errors | Lower burst or too many rapid clicks; adjust `RATE_LIMIT_BURST` |
| Stale games accumulate | Tune `STALE_DISCONNECT_MS` / `MAX_GAME_AGE_MS` |

This section finalizes the previously "Planned Outline" into actionable Azure CLI steps.


