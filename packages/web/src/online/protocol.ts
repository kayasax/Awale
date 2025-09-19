// Client-side protocol type mirrors (subset) of server definitions
export interface GameStateSnapshot {
  pits: number[]; // length 12
  currentPlayer: 'A' | 'B';
  captured: { A: number; B: number };
  ended: boolean;
  winner: 'A' | 'B' | 'Draw' | null;
  version?: number;
}

// Server -> Client
export type ServerToClient =
  | { type: 'created'; gameId: string; playerToken: string }
  | { type: 'joined'; gameId: string; role: 'host' | 'guest'; opponent: string }
  | { type: 'state'; gameId: string; version: number; state: GameStateSnapshot }
  | { type: 'moveApplied'; gameId: string; seq: number; pit: number; player: 'host' | 'guest'; version: number; captured?: number }
  | { type: 'gameEnded'; gameId: string; reason: string; final: GameStateSnapshot }
  | { type: 'pong'; latency?: number }
  | { type: 'error'; code: string; message: string };

// Client -> Server
export type ClientToServer =
  | { type: 'create'; name?: string }
  | { type: 'join'; gameId: string; name?: string }
  | { type: 'move'; gameId: string; pit: number }
  | { type: 'resign'; gameId: string }
  | { type: 'ping'; ts?: number };
