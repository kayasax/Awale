export type Player = 'A' | 'B';
export interface GameState {
    pits: number[];
    currentPlayer: Player;
    captured: Record<Player, number>;
    ended: boolean;
    winner: Player | 'Draw' | null;
    lastMove?: number;
    turn: number;
    id?: string;
    version?: number;
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
