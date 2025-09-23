# 🎮 Awale: Experimental TypeScript "Vibe Coding" Journey

![Build](https://img.shields.io/github/actions/workflow/status/kayasax/Awale/build.yml?branch=master&label=CI)
![Pages Deploy](https://img.shields.io/github/actions/workflow/status/kayasax/Awale/pages.yml?branch=master&label=Pages)
![Release](https://img.shields.io/github/v/tag/kayasax/Awale?label=latest%20release&color=success)
![Version](https://img.shields.io/badge/version-v0.6.1-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**▶ Live Experience:** https://kayasax.github.io/Awale/

> 🚀 **Microsoft Hackathon 2025** - An experimental journey into modern web development using AI-assisted "vibe coding" techniques. What happens when someone with zero TypeScript knowledge attempts to build a complete multiplayer game experience? This project is the answer!

## 🎯 Hackathon Context & Philosophy

**The Challenge:** Build a sophisticated web application using technologies I've never touched before
**The Method:** AI-assisted "vibe coding" - learning through doing, guided by AI pair programming
**The Goal:** Push the boundaries of what's possible with modern development tools and AI assistance

### 🧪 What is "Vibe Coding"?
- **Learning by Building**: No tutorials, no courses - just dive in and solve real problems
- **AI as Co-Pilot**: Leverage GitHub Copilot and AI assistants for real-time guidance
- **Iterative Discovery**: Let the project evolve organically based on what works
- **Modern Toolchain**: Embrace the latest in TypeScript, React, WebSockets, Azure, and PWA technologies

**Result**: A fully functional online multiplayer Awale (African Mancala) game with lobby system, real-time gameplay, PWA capabilities, and Azure deployment - all built by someone who didn't know TypeScript existed 1 week ago! 🤯

## ✨ What We Built (Against All Odds)

### 🎮 Game Features
- **Authentic Awale Rules**: Traditional African Mancala with proper capture logic and starvation prevention
- **Stunning Visuals**: Animated seed sowing, capture sparkles, delta badges, and thematic backgrounds
- **Smart AI**: Greedy strategy opponent for offline play
- **Dual Themes**: Dark modern and warm wood aesthetics
- **Accessibility**: Screen reader friendly, keyboard navigation, aria-live updates

### 🌐 Online Multiplayer (The Plot Twist!)
- **Real-time WebSocket Gameplay**: Authoritative server with move validation
- **Lobby System**: See online players, send/receive game invitations
- **Live Chat**: Community interaction in the lobby
- **Player Presence**: Track who's available, in-game, or away
- **Game Spectating**: View ongoing games and player activity

### 💻 Technical Achievements
- **Progressive Web App**: Offline play, installable, service worker caching
- **Monorepo Architecture**: Clean separation of engine, web client, and server
- **Azure Container Apps**: Scalable cloud deployment with WebSocket support
- **Modern Build Pipeline**: Vite dev server, esbuild production, automated CI/CD
- **Type Safety**: Full TypeScript throughout (learned on the job!)

## 🗂 Architecture (Vibe-Driven Design)

```
🏗 Monorepo Structure (packages/)
├── core/      # Pure game engine + AI (The Brain)
├── shared/    # Common types & protocols (The Contract)
├── web/       # React PWA frontend (The Face)
├── server/    # Node.js WebSocket server (The Conductor)
└── bot/       # Legacy Teams bot (The Ghost of Plans Past)
```

### 🎭 The Evolution Story
1. **Original Vision**: Microsoft Teams bot (blocked by enterprise restrictions)
2. **Pivot 1**: Simple web game (too boring!)
3. **Pivot 2**: PWA with offline play (getting warmer...)
4. **Final Form**: Full multiplayer with lobby, chat, and Azure deployment (JACKPOT! 🎰)

## 🚀 Getting Started (For Fellow Adventurers)

### Prerequisites
```bash
# Just Node.js - we'll figure out the rest together!
node --version  # v18+ recommended
npm --version   # Comes with Node
```

### Quick Launch
```bash
# Clone the experimental madness
git clone https://github.com/kayasax/Awale.git
cd Awale

# Install dependencies (trust the process)
npm install

# Launch development (prepare for magic)
npm run dev -w @awale/web

# Open http://localhost:5173 and witness the chaos!
```

### Production Build (Deploy Your Creation)
```bash
# Build optimized bundle
npm run build -w @awale/web

# Preview locally
npm run preview -w @awale/web

# Deploy to your favorite static host!
```

## 🌐 Online Multiplayer Setup (Advanced Wizardry)

Want to run your own multiplayer server? Here's the Azure magic:

### Server Deployment (Azure Container Apps)
```bash
# Create resource group
az group create -n awale-rg -l francecentral

# Build and deploy server
docker build -t awale-server -f packages/server/Dockerfile .
# ... (full deployment guide in original docs)
```

### Local Development Server
```bash
# Start local multiplayer server
npm run dev -w @awale/server

# Frontend connects to localhost:8080
npm run dev -w @awale/web
```

## 🧠 Lessons Learned (Vibe Coding Insights)

### 💡 What Worked
- **AI Pair Programming**: GitHub Copilot was genuinely helpful for TypeScript syntax and patterns
- **Iterative Development**: Small, testable changes made complex features achievable
- **Modern Tooling**: Vite, esbuild, and TypeScript created a surprisingly smooth developer experience
- **Real-time Debugging**: Console logging and browser dev tools were game-changers

### 🤔 Surprising Challenges
- **WebSocket State Management**: Harder than expected to keep client/server in sync
- **CSS Z-index Wars**: Who knew pseudo-elements could be so troublesome?
- **TypeScript Interfaces**: Still learning when to use `type` vs `interface` vs `class`
- **Azure Deployment**: Container Apps are powerful but the CLI dance is complex

### 🎯 Key Discoveries
- **Monorepo Benefits**: Shared types between frontend/backend prevented so many bugs
- **Service Workers**: PWA capabilities added with surprisingly little code
- **React Hooks**: useEffect cleanup patterns are crucial for WebSocket connections
- **Git Workflow**: Feature branches and semantic commits actually help!

## 🔮 Future Experiments

### 🎮 Game Enhancements
- [ ] Stronger AI with minimax algorithm
- [ ] Tournament mode with brackets
- [ ] Replay system with move history
- [ ] Custom game variants and rules

### 🌐 Multiplayer Evolution
- [ ] Spectator mode for live games
- [ ] Player rankings and statistics
- [ ] Private rooms and friend systems
- [ ] Mobile app using Capacitor or React Native

### 🛠 Technical Deep Dives
- [ ] Real-time testing with Playwright
- [ ] Performance monitoring with Application Insights
- [ ] Kubernetes deployment for scale
- [ ] GraphQL API for richer data queries

## � Acknowledgements & Credits

**Microsoft Hackathon 2025** - For creating the perfect excuse to experiment with cutting-edge tech

**AI Assistants** - GitHub Copilot, Claude, and GPT for being patient teachers and debugging partners

**Open Source Community** - Every Stack Overflow answer, GitHub issue, and documentation page that saved the day

**The Awale Game** - Ancient African wisdom meets modern web technology

## 📊 Project Stats (Because Numbers are Fun)

- **Lines of Code**: ~15,000+ (mostly TypeScript!)
- **Development Time**: 3 days!
- **AI Assistance**: ~80% of code had some AI input (vibe coding!)
- **Bug Count**: Lost count after 200 (learning experience!)
- **Coffee Consumed**: Immeasurable ☕
- **Fun Had**: Absolutely priceless 🎉

## 🎭 The Honest Truth

This project started as "let me try TypeScript" and somehow became a full-featured multiplayer game platform. The code probably violates several best practices, the architecture evolved organically (some might say chaotically), and I'm still not 100% sure how some parts work.

**But it works!** Players can join from around the world, chat in the lobby, start games, and have a genuinely fun experience. Sometimes the best way to learn is to just start building and figure it out as you go.

**That's the magic of vibe coding.** 🪄

---

## 📄 License

MIT License - Feel free to learn from this experimental journey!

## 🐛 Issues & Contributions

Found a bug? Have a suggestion? Want to see how NOT to write TypeScript?

Open an issue or submit a PR - all feedback welcome from fellow experimenters and experienced developers alike!

---

---

## 📚 Technical Documentation

<details>
<summary>🧪 <strong>Testing & Development</strong></summary>

### Running Tests
```bash
# Run all tests
npm test

# Test specific package
npm test -w @awale/core
```

### Build System Details
- **Dev**: Vite handles module graph & fast HMR
- **Prod**: Custom `build-esbuild.cjs` bundles optimized `app.js`
- **CI/CD**: GitHub Actions for build, release, and Pages deployment

</details>

<details>
<summary>🌐 <strong>Full Azure Deployment Guide</strong></summary>

### Complete Server Setup on Azure Container Apps

#### 1. Resource Group
```bash
az group create -n awale-rg -l francecentral
```

#### 2. Azure Container Registry (ACR)
```bash
ACR_NAME=awaleacr$RANDOM
az acr create -n $ACR_NAME -g awale-rg --sku Basic --admin-enabled true
az acr login -n $ACR_NAME
```

#### 3. Build & Push Image
```bash
IMG_TAG=v0.1.0
docker build -t $ACR_NAME.azurecr.io/awale-server:$IMG_TAG -f packages/server/Dockerfile .
docker push $ACR_NAME.azurecr.io/awale-server:$IMG_TAG
```

#### 4. Deploy Container App
```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App --wait
az containerapp env create -n awale-env -g awale-rg -l francecentral

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

#### 5. Verify & Configure
```bash
FQDN=$(az containerapp show -n awale-server -g awale-rg --query properties.configuration.ingress.fqdn -o tsv)
curl https://$FQDN/health

# Configure frontend
VITE_AWALE_SERVER_WS=wss://$FQDN/ws npm run build -w @awale/web
```

### Troubleshooting
| Issue | Solution |
|-------|----------|
| WebSocket connection fails | Check `ALLOWED_ORIGIN` matches exactly |
| No game creation | Verify `VITE_AWALE_SERVER_WS` environment variable |
| Rate limiting | Adjust `RATE_LIMIT_BURST` setting |

</details>

<details>
<summary>🎮 <strong>Game Engine & Protocol</strong></summary>

### Engine Architecture
- **12-pit array**: Positions 0-5 (player), 6-11 (AI/opponent)
- **Capture logic**: Final seed in opponent row with 2-3 seeds
- **Starvation prevention**: Must leave opponent with moves when possible

### WebSocket Protocol (Client ↔ Server)
```typescript
// Client → Server
{ type: "create", name: "Alice" }
{ type: "join", gameId: "abc123", name: "Bob" }
{ type: "move", gameId: "abc123", pit: 4 }

// Server → Client
{ type: "created", gameId: "abc123", playerToken: "..." }
{ type: "joined", gameId: "abc123", role: "guest", opponent: "Alice" }
{ type: "state", gameId: "abc123", version: 7, state: {...} }
{ type: "moveApplied", gameId: "abc123", captured: 3 }
```

### Lobby System Features
- **Real-time presence**: Track online/offline/in-game status
- **Game invitations**: Send/accept/decline game invites
- **Chat system**: Community interaction in lobby
- **Player visibility**: See all online players including those in games

</details>
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


