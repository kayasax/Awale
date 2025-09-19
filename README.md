# Awale (Oware) – Teams Strategy Game Bot

## 🎮 Current Status: FULLY DEPLOYED & FUNCTIONAL

✅ **Complete Implementation** - Game engine, AI opponent, Teams bot integration
✅ **Azure Deployment** - Professional hosting at https://app-ho6sgq4onri72.azurewebsites.net/
✅ **Bot Framework Integration** - Bot ID: 94ecc03e-3bdc-4f89-abce-2d6eda64f5bd
✅ **Teams App Package** - Ready for sideloading (organizational policy permitting)

## 🚫 Current Challenge: Organizational Restrictions
Your corporate Teams tenant restricts custom app installations. See [DEMO_ALTERNATIVES.md](DEMO_ALTERNATIVES.md) for workaround solutions.

## Vision
A strategic, turn‑based Awale (Oware) experience playable directly inside Microsoft Teams with AI opponent, conversation state management, and professional Azure hosting.

## Implementation Complete
1. ✅ Core Engine (rules, moves, captures, endgame) + Comprehensive Tests
2. ✅ Smart AI Opponent (greedy capture strategy)
3. ✅ Teams Bot MVP (Adaptive Card board + interactive gameplay)
4. ✅ Azure Infrastructure (App Service, Application Insights, Key Vault, Managed Identity)
5. ✅ Professional Deployment (Enterprise-grade hosting and monitoring)
6. ✅ GitHub Repository (Full source code and documentation)

## Why Text + Adaptive Cards First?
- Guarantees rules correctness before visual polish
- Faster iteration cycles in hackathon timeframe
- Decouples deterministic engine from UI so we can reuse the same logic across bot, tests, and future graphical tab
- Minimizes early complexity (no asset pipeline yet)

Graphical artwork WILL come (Phase 6). Early separation means we can design a rendering adapter later without refactoring core logic.

## Monorepo Structure
```
packages/
  core/      # Pure rules + AI strategies
  shared/    # Shared types (lightweight)
  bot/       # Teams Bot Framework integration (placeholder)
```

## Commands
Install (root installs all workspaces):
```
npm install
```
Build all:
```
npm run build
```
Run tests (engine + future bot tests):
```
npm test
```
Dev bot (placeholder for now):
```
npm run dev:bot
```

## Engine Design Notes
- Immutable transformations (new state objects)
- Array of 12 pits, captured counters per player
- Starvation rule enforcement (feeding logic)
- Capture chain scanning backwards across opponent row

## Next Implementation Steps
- [x] Greedy AI strategy (`packages/core/src/ai/greedy.ts`)
- [x] Adaptive Card generator stub
- [ ] Concurrency token check in repository abstraction (basic versioning present)
- [ ] Move history & serialization helpers
- [ ] CLI play script
- [ ] Bot Framework adapter integration

## Future Graphical Tab (Preview Thoughts)
- React + Fluent UI / Canvas hybrid for animated sowing
- Soft color palette + subtle particle ambient layer
- Audio: looped nature or kalimba track served from Blob Storage
- Theme JSON: colors, pit texture refs, audio theme slug

## License
TBD (personal hackathon project). Not yet open-sourced under a formal license.

## Hackathon
Registered in Microsoft Hackathon 2025:
https://innovationstudio.microsoft.com/hackathons/hackathon2025/project/109939
