import { GameState, MoveResult, Player } from '@awale/shared';

// Core Awale (Oware) rules engine.
// Design goals:
// - Pure functions (no hidden mutation of caller state)
// - Deterministic logic for easy AI evaluation & testing
// - Clear separation of move validation, sowing, capture, and endgame detection

export function createInitialState(): GameState {
  return {
    pits: Array(12).fill(4),
    currentPlayer: 'A',
    captured: { A: 0, B: 0 },
    ended: false,
    winner: null,
    turn: 0,
    version: 0,
  };
}

function playerPitRange(player: Player): [number, number] {
  return player === 'A' ? [0, 5] : [6, 11];
}

export function getLegalMoves(state: GameState): number[] {
  if (state.ended) return [];
  const [start, end] = playerPitRange(state.currentPlayer);
  const candidates = [] as number[];
  for (let i = start; i <= end; i++) {
    if (state.pits[i] > 0) candidates.push(i);
  }
  // Starvation rule: If opponent has no seeds, current player must select a move that will sow at least one seed into opponent side.
  const opponent: Player = state.currentPlayer === 'A' ? 'B' : 'A';
  const [oStart, oEnd] = playerPitRange(opponent);
  const opponentHasSeeds = state.pits.slice(oStart, oEnd + 1).some((v: number) => v > 0);
  if (opponentHasSeeds) return candidates; // normal case
  // must play a move that feeds opponent; filter those that sow into opponent side
  return candidates.filter(idx => feedsOpponent(state, idx));
}

function feedsOpponent(state: GameState, pitIndex: number): boolean {
  const seeds = state.pits[pitIndex];
  if (seeds === 0) return false;
  let idx = pitIndex;
  for (let s = 0; s < seeds; s++) {
    idx = (idx + 1) % 12;
    if (belongsToOpponent(state.currentPlayer, idx)) return true;
  }
  return false;
}

function belongsToOpponent(current: Player, pitIndex: number): boolean {
  return current === 'A' ? pitIndex >= 6 : pitIndex <= 5;
}

export function applyMove(state: GameState, pitIndex: number): MoveResult {
  if (state.ended) throw new Error('Game already ended');
  const legal = getLegalMoves(state);
  if (!legal.includes(pitIndex)) throw new Error('Illegal move');
  const newState: GameState = { ...state, pits: [...state.pits], captured: { ...state.captured }, turn: state.turn + 1, lastMove: pitIndex, version: (state.version || 0) + 1 };
  let seeds = newState.pits[pitIndex];
  newState.pits[pitIndex] = 0;
  let idx = pitIndex;
  // Sowing (counter-clockwise): skip the original pit (common Oware variant)
  while (seeds > 0) {
    idx = (idx + 1) % 12;
    if (idx === pitIndex) continue; // skip original pit per standard Oware rule variant
    newState.pits[idx] += 1;
    seeds--;
  }
  // Capture phase: If the last seed lands in opponent territory and that pit now holds 2 or 3 seeds,
  // capture them; then continue backwards while pits satisfy 2 or 3 capturing condition.
  const opponent: Player = state.currentPlayer === 'A' ? 'B' : 'A';
  let capturedThisMove = 0;
  if (belongsToOpponent(state.currentPlayer, idx)) {
    let captureIdx = idx;
    while (belongsToOpponent(state.currentPlayer, captureIdx)) {
      const seedsInPit = newState.pits[captureIdx];
      if (seedsInPit === 2 || seedsInPit === 3) {
        capturedThisMove += seedsInPit;
        newState.pits[captureIdx] = 0;
        captureIdx = (captureIdx - 1 + 12) % 12;
      } else break;
    }
  }
  newState.captured[state.currentPlayer] += capturedThisMove;

  // Endgame detection triggers:
  // 1. A player reaches >=25 captures (cannot be overtaken)
  // 2. Remaining seeds small / no future feeding (simplified condition with remainingSeeds <= 6)
  // 3. Next player has no legal moves (stalemate starvation) -> distribute remaining seeds.
  const totalCaptured = newState.captured.A + newState.captured.B;
  const remainingSeeds = newState.pits.reduce((a: number, b: number) => a + b, 0);
  if (newState.captured[state.currentPlayer] >= 25 || remainingSeeds <= 6) {
    // Remaining seeds go to opponent who owns them if stalemate-like condition
    distributeRemaining(newState);
    finalizeWinner(newState);
  }
  if (!newState.ended) {
    newState.currentPlayer = opponent;
    const nextLegal = getLegalMoves(newState);
    if (nextLegal.length === 0) {
      distributeRemaining(newState);
      finalizeWinner(newState);
    }
  }
  return { state: newState, capturedThisMove, extraTurn: false };
}

function distributeRemaining(state: GameState) {
  if (state.ended) return;
  state.captured.A += state.pits.slice(0, 6).reduce((a: number, b: number) => a + b, 0);
  state.captured.B += state.pits.slice(6, 12).reduce((a: number, b: number) => a + b, 0);
  for (let i = 0; i < 12; i++) state.pits[i] = 0;
}

function finalizeWinner(state: GameState) {
  state.ended = true;
  if (state.captured.A > state.captured.B) state.winner = 'A';
  else if (state.captured.B > state.captured.A) state.winner = 'B';
  else state.winner = 'Draw';
}

export function formatBoard(state: GameState): string {
  const top = state.pits.slice(6, 12).slice().reverse().map((n: number) => n.toString().padStart(2, ' ')).join(' ');
  const bottom = state.pits.slice(0, 6).map((n: number) => n.toString().padStart(2, ' ')).join(' ');
  return `    ${top}\n${state.captured.B.toString().padStart(2,' ')}                  ${state.captured.A.toString().padStart(2,' ')}\n    ${bottom}`;
}
