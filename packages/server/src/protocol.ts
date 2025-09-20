// Basic protocol type definitions (initial draft)
export type ClientToServer =
	| { type: 'create'; name?: string; playerId?: string }
	| { type: 'join'; gameId: string; name?: string; playerId?: string; reconnect?: boolean }
	| { type: 'move'; gameId: string; pit: number; clientSeq?: number }
	| { type: 'resign'; gameId: string }
	| { type: 'ping'; ts?: number };

export type ServerToClient =
	| { type: 'created'; gameId: string; playerToken: string }
	| { type: 'joined'; gameId: string; role: 'host' | 'guest'; opponent?: string }
	| { type: 'gameStarting'; gameId: string; startingPlayer: 'host' | 'guest'; message: string }
	| { type: 'state'; gameId: string; version: number; state: any }
	| { type: 'moveApplied'; gameId: string; seq: number; pit: number; player: 'host' | 'guest'; version: number; captured?: number }
	| { type: 'error'; code: string; message: string }
	| { type: 'opponentLeft'; gameId: string; temporary: boolean }
	| { type: 'opponentReconnected'; gameId: string }
	| { type: 'gameEnded'; gameId: string; reason: string; final: any }
	| { type: 'pong'; latency?: number };

// The authoritative server now uses the core engine GameState. Keeping this
// placeholder for future protocol-specific projection if needed.
export interface GameStateSnapshot {
	pits: number[];
	currentPlayer: string;
	captured: { A: number; B: number };
	ended: boolean;
	winner: string | null;
	version?: number;
}