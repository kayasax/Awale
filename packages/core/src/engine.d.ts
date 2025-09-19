import { GameState, MoveResult } from '@awale/shared';
export declare function createInitialState(): GameState;
export declare function getLegalMoves(state: GameState): number[];
export declare function applyMove(state: GameState, pitIndex: number): MoveResult;
export declare function formatBoard(state: GameState): string;
