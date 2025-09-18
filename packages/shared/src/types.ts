export type Player = 'A' | 'B';
export interface GameState {
  pits: number[]; // length 12
  currentPlayer: Player;
  captured: Record<Player, number>;
  ended: boolean;
  winner: Player | 'Draw' | null;
  lastMove?: number; // pit index
  turn: number;
  id?: string;
  version?: number; // concurrency token
}
export interface MoveResult {
  state: GameState;
  capturedThisMove: number;
  extraTurn: boolean;
}
export interface Strategy {
  chooseMove(state: GameState): number;
  name: string;
}
