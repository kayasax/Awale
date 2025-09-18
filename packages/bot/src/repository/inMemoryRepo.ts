import { GameState } from '@awale/shared';
import { createInitialState, applyMove } from '@awale/core/engine';

export interface GameRepository {
  createGame(id?: string): GameState;
  getGame(id: string): GameState | undefined;
  saveGame(state: GameState): void;
  applyPlayerMove(id: string, pit: number): { state: GameState; captured: number };
}

const store = new Map<string, GameState>();

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class InMemoryGameRepository implements GameRepository {
  createGame(id?: string): GameState {
    const gameId = id ?? generateId();
    const state = { ...createInitialState(), id: gameId, version: 0 };
    store.set(gameId, state);
    return state;
  }
  getGame(id: string): GameState | undefined {
    return store.get(id);
  }
  saveGame(state: GameState): void {
    if (!state.id) throw new Error('State missing id');
    store.set(state.id, state);
  }
  applyPlayerMove(id: string, pit: number) {
    const current = this.getGame(id);
    if (!current) throw new Error('Game not found');
    const { state: next, capturedThisMove } = applyMove(current, pit);
    this.saveGame(next);
    return { state: next, captured: capturedThisMove };
  }
}

export const repo = new InMemoryGameRepository();
