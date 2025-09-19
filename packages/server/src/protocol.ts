// Basic protocol type definitions (initial draft)
export type ClientToServer =
  | { type: 'create'; name?: string }
  | { type: 'join'; gameId: string; name?: string }
  | { type: 'move'; gameId: string; pit: number; clientSeq?: number }
  | { type: 'resign'; gameId: string }
  | { type: 'ping'; ts?: number };

export type ServerToClient =
  | { type: 'created'; gameId: string; playerToken: string }
  | { type: 'joined'; gameId: string; role: 'host' | 'guest'; opponent?: string }
  | { type: 'state'; gameId: string; version: number; state: any }
  | { type: 'moveApplied'; gameId: string; seq: number; pit: number; player: 'host' | 'guest'; version: number }
  | { type: 'error'; code: string; message: string }
  | { type: 'opponentLeft'; gameId: string; temporary: boolean }
  | { type: 'opponentReconnected'; gameId: string }
  | { type: 'gameEnded'; gameId: string; reason: string; final: any }
  | { type: 'pong'; latency?: number };

export interface GameStateSnapshot {
  pits: number[];
  scores: { host: number; guest: number };
  currentPlayer: 'host' | 'guest';
  phase: 'playing' | 'ended';
}
