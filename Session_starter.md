# 🧠 AI Session Starter: Awale

*Project memory file for AI assistant session continuity. Auto-referenced by custom instructions.*

---

## 📘 Project Context
**Project:** Awale
**Type:** General Development Project
**Purpose:** Build a calming, turn‑based Awale (Oware) board game experience playable directly inside Microsoft Teams 1:1 chats and (later) a Teams tab, emphasizing relaxation (ambient visuals + soft looping music), accessible rules learning, and optional AI opponent for solo play.
**Status:** 🧭 Vision defined / Pre-scaffolding phase

**Core Technologies (proposed):**
- Backend: Node.js / TypeScript (Bot Framework SDK for Teams)
- Game Engine: Pure functional TypeScript module (logic + rules + AI)
- Teams Interaction: Azure Bot Service (Teams channel) with Adaptive Cards for board state & move selection
- Optional Tab App (Phase 2): React + Fluent UI (or Teams Toolkit UI components)
- Persistence (Phase 1 dev): In‑memory (per process) → Phase 2: Azure Cosmos DB or Azure Table Storage
- Media Delivery (later): Azure Blob Storage (ambient audio, theme assets)
- Configuration & Secrets: Azure Key Vault + Managed Identity (when persistence added)
- CI/CD: GitHub Actions (build, lint, test, deploy via azd or Azure CLI)

**Available AI Capabilities:**
- 🔧 MCP Servers: Azure best practices, Microsoft Docs search, (extendable as needed)
- 📚 Documentation: Microsoft Docs MCP for Teams, Bot Service, storage, security
- 🔍 Tools: Session continuity, planning TODO list, Azure guidance, code generation support

---

## 🎯 Current State
**Build Status:** 🚀 **TEAMS-READY** - Complete Teams bot integration with deployable app package
**Key Achievement:** Full Microsoft Teams bot with working Awale game, AI opponent, and sideloadable app package
**Active Issue:** Ready for deployment - bot registration and ngrok tunnel needed for live testing
**AI Enhancement:** Session configured with MCP server awareness & Azure best practice integration

**Latest Major Progress (2025-09-18):**
- � **Complete Teams Bot Implementation** - Full Bot Framework integration with conversation state
- 📱 **Teams App Package Created** - `awale-teams-app.zip` ready for sideloading
- 🤖 **Bot Handler with AI Integration** - Text commands, game flow, AI opponent moves
- 📋 **Teams App Manifest** - Complete manifest.json with proper permissions and scopes
- 🎨 **App Icons Generated** - color.png (192x192) and outline.png (32x32) placeholder icons
- 📦 **Deployable Package** - All files packaged for Teams upload and testing

**Architecture Highlights:**
- **Bot Framework Server**: Restify HTTP server with Bot Framework adapter
- **Teams Integration**: Message handling, Adaptive Cards, conversation state management  
- **Game Flow**: Text-based commands (new game, 0-5 moves, help, quit)
- **AI Opponent**: Automatic play with greedy strategy after human moves
- **Visual Display**: Formatted ASCII board with score tracking
- **State Management**: Persistent game sessions across Teams conversations
- Persistence Abstraction: `GameRepository` with in-memory impl first; later Cosmos DB (partition key: gameId) using Managed Identity.
- Security: No secrets in code; environment config via Key Vault once infra exists.
- Telemetry (later): Application Insights for move latency, AI depth chosen, errors.
- Relevant MCP Tools: Azure best practices, Docs search for Bot Framework & Teams.

---

## 🧠 Technical Memory

**Critical Discoveries:**
- Vision clarified: Teams-based Awale with relaxation & optional AI.
- Early decision toward TypeScript + Bot Framework for fastest Teams iteration.
- Need clean pure engine to enable reuse (CLI tests, bot, future web UI).
- Azure best practice tooling accessible for secure, scalable evolution.

**Performance Insights (future focus):**
- Game engine lightweight; performance concerns shift to AI search pruning.
- Potential optimization: transposition table + iterative deepening for AI (phase 3+).
- Rendering frequency low (turn-based) → no heavy perf constraints initially.

**Known Constraints:**
- Must function gracefully in text-first Adaptive Card environment (limited interactivity compared to full canvas UI).
- Music playback not supported directly in standard chat cards → handled in Tab app phase.
- Hackathon timeline suggests lean MVP before advanced AI or theming marketplace.
- Multi-user concurrency: need idempotent move handling & concurrency token to prevent double submissions.
- Initial absence of persistence means games lost on restart (acceptable pre-alpha).

---

## 🚀 Recent Achievements
| Date | Achievement |
|------|-------------|
| 2025-09-18 | ✅ Project initialized with session continuity infrastructure |
| 2025-09-18 | ✅ General Development Project development environment configured |
| 2025-09-18 | ✅ MCP server awareness integrated for enhanced AI capabilities |
| 2025-09-18 | ✅ Vision & architecture direction for Teams Awale defined |
| 2025-09-18 | ✅ Monorepo scaffold (core/shared/bot), engine + tests, README created |
| 2025-09-18 | ✅ Hackathon 2025 project registered (ID 109939) |
| 2025-09-18 | ✅ **MAJOR BREAKTHROUGH** - Fixed Jest testing infrastructure completely |
| 2025-09-18 | ✅ **ALL TESTS PASSING** - 6 tests across 2 suites with proper TypeScript resolution |
| 2025-09-18 | ✅ **BUILD SYSTEM WORKING** - Full monorepo compilation to dist/ folders |
| 2025-09-18 | ✅ **AI STRATEGY IMPLEMENTED** - Greedy capture algorithm working and tested |
| 2025-09-18 | ✅ **TEAMS BOT COMPLETE** - Full Bot Framework server with conversation state |
| 2025-09-18 | ✅ **TEAMS APP PACKAGE** - Complete manifest, icons, and deployable ZIP file |
| 2025-09-18 | ✅ **DEMO SCRIPTS WORKING** - CLI demo, simple JS demo, all systems verified |
| 2025-09-18 | 🎮 **READY FOR TEAMS DEPLOYMENT** - Sideloadable app package created!

---

## 📋 Active Priorities
1. ✅ **COMPLETED** - Confirm stack & minimal MVP scope (engine + simple CLI tests vs direct bot)
2. ✅ **COMPLETED** - Scaffold repository structure
3. ✅ **COMPLETED** - Core engine base implementation
4. ✅ **COMPLETED** - Initial unit tests with Jest infrastructure
5. ✅ **COMPLETED** - Simple AI strategy (greedy capture fallback random legal)
6. ✅ **COMPLETED** - Adaptive Card renderer (board pits + select pit buttons) & command handling stub
7. ✅ **COMPLETED** - In-memory game repository + concurrency token logic
8. ✅ **COMPLETED** - Draft README
9. ✅ **COMPLETED** - Teams bot implementation with Bot Framework
10. ✅ **COMPLETED** - Teams app manifest and package creation
11. 🎯 **CURRENT** - Bot registration and live deployment testing
12. 📋 **NEXT** - Hackathon demo and presentation preparation
13. 📋 **UPCOMING** - Plan Phase 2 (Azure deployment, enhanced features)

**🚀 READY FOR TEAMS DEPLOYMENT:**
- Complete sideloadable app package: `awale-teams-app.zip`
- Full bot implementation with game engine + AI
- Setup guide with step-by-step instructions
- Only needs bot registration and ngrok tunnel for live testing

---

## 🔧 Development Environment
**Common Commands (planned):**
`npm run dev:bot` – start bot locally with ngrok / Teams dev tunnel
`npm test` – run Jest tests for engine & bot utilities
`npm run lint` – lint codebase (ESLint + Prettier)
`npm run build` – build TypeScript

**Key Files (will be added):**
`/packages/core/src/engine.ts` – core game logic
`/packages/core/src/ai/greedy.ts` – initial AI strategy
`/packages/bot/src/index.ts` – bot entrypoint
`/packages/bot/src/adaptiveCards/boardCard.ts` – card generator
`/packages/bot/src/handlers/moveHandler.ts` – move processing
`/packages/shared/src/types.ts` – shared type interfaces

**Setup Requirements (upcoming):**
1. Install Node.js LTS
2. Clone repo & `npm install`
3. Run `npm run test` to validate engine
4. Start bot with dev tunnel for Teams testing
5. (Later) Provision Azure resources via `azd` or scripts

**AI Tools:**
- Azure best practices MCP for secure service integration design
- Microsoft Docs MCP for Bot Framework & Teams schemas
- Planning TODO tooling for incremental delivery

---

*This file serves as persistent project memory for enhanced AI assistant session continuity with MCP server integration.*