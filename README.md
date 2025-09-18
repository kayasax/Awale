# Awale (Oware) – Relaxing Teams Game

## Vision
A calming, turn‑based Awale (Oware) experience playable directly inside Microsoft Teams 1:1 chats using Adaptive Cards, with optional bot AI opponent and (later) a richer graphical Tab (React) featuring ambient visuals & soft looping music.

## Phased Roadmap
1. ✅ Core Engine (rules, moves, captures, endgame) + Tests
2. ✅ Simple AI (greedy capture) (CLI helper pending)
3. 🚧 Teams Bot MVP (Adaptive Card board + pit buttons)
4. ⏳ Persistence (Cosmos DB) & concurrency safeguards
5. ⏳ Enhanced AI (minimax + pruning) and analytics (App Insights)
6. ⏳ React Tab UI (graphical pits, animations, theme selector, audio)
7. ⏳ Theming + plugin architecture (strategy variants, visual packs)

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
