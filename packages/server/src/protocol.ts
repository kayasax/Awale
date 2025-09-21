// Basic protocol type definitions (initial draft)

// 🌐 Lobby System Data Models
export interface LobbyPlayer {
	id: string;           // Persistent player ID
	name: string;         // Display name
	avatar?: string;      // Profile avatar
	status: 'available' | 'in-game' | 'away' | 'offline';
	joinedAt: number;     // Timestamp
	gameId?: string;      // Current game if in-game
	ws?: any;             // WebSocket connection
}

export interface ChatMessage {
	id: string;
	playerId: string;
	playerName: string;
	message: string;
	timestamp: number;
	type: 'message' | 'system';
}

export interface GameInvitation {
	id: string;
	from: string;         // Player ID who sent
	to: string;           // Player ID who receives  
	gameId: string;       // Pre-created game ID
	timestamp: number;
	status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export type ClientToServer =
	| { type: 'create'; name?: string; playerId?: string }
	| { type: 'join'; gameId: string; name?: string; playerId?: string; reconnect?: boolean }
	| { type: 'move'; gameId: string; pit: number; clientSeq?: number }
	| { type: 'resign'; gameId: string }
	| { type: 'ping'; ts?: number }
	// 🌐 Lobby Messages
	| { type: 'lobby'; action: 'join'; playerId: string; playerName: string; avatar?: string }
	| { type: 'lobby'; action: 'leave' } 
	| { type: 'lobby'; action: 'chat'; message: string }
	| { type: 'lobby'; action: 'invite'; targetPlayerId: string }
	| { type: 'lobby'; action: 'accept-invite'; inviteId: string }
	| { type: 'lobby'; action: 'decline-invite'; inviteId: string }
	| { type: 'lobby'; action: 'status'; status: 'available' | 'away' };

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
	| { type: 'pong'; latency?: number }
	// 🌐 Lobby Messages
	| { type: 'lobby'; players: LobbyPlayer[]; messages: ChatMessage[] }
	| { type: 'lobby'; action: 'player-joined'; player: LobbyPlayer }
	| { type: 'lobby'; action: 'player-left'; playerId: string }
	| { type: 'lobby'; action: 'player-status'; playerId: string; status: LobbyPlayer['status'] }
	| { type: 'lobby'; action: 'chat-message'; message: ChatMessage }
	| { type: 'lobby'; action: 'invitation'; from: LobbyPlayer; gameId: string; inviteId: string }
	| { type: 'lobby'; action: 'invitation-response'; accepted: boolean; gameId: string; inviteId: string };

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