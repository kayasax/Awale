// Client-side protocol type mirrors (subset) of server definitions
export interface GameStateSnapshot {
  pits: number[]; // length 12
  currentPlayer: 'A' | 'B';
  captured: { A: number; B: number };
  ended: boolean;
  winner: 'A' | 'B' | 'Draw' | null;
  version?: number;
}

// 🌐 Lobby System Data Models
export interface LobbyPlayer {
  id: string;           // Persistent player ID
  name: string;         // Display name
  avatar?: string;      // Profile avatar
  status: 'available' | 'in-game' | 'away' | 'offline';
  joinedAt: number;     // Timestamp
  gameId?: string;      // Current game if in-game
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

// Server -> Client
export type ServerToClient =
  | { type: 'created'; gameId: string; playerToken: string }
  | { type: 'joined'; gameId: string; role: 'host' | 'guest'; opponent: string }
  | { type: 'gameStarting'; gameId: string; startingPlayer: 'host' | 'guest'; message: string }
  | { type: 'state'; gameId: string; version: number; state: GameStateSnapshot }
  | { type: 'moveApplied'; gameId: string; seq: number; pit: number; player: 'host' | 'guest'; version: number; captured?: number }
  | { type: 'gameEnded'; gameId: string; reason: string; final: GameStateSnapshot }
  | { type: 'pong'; latency?: number }
  | { type: 'error'; code: string; message: string }
  // 🌐 Lobby Messages
  | { type: 'lobby'; players: LobbyPlayer[]; messages: ChatMessage[] }
  | { type: 'lobby'; action: 'player-joined'; player: LobbyPlayer }
  | { type: 'lobby'; action: 'player-left'; playerId: string }
  | { type: 'lobby'; action: 'player-status'; playerId: string; status: LobbyPlayer['status'] }
  | { type: 'lobby'; action: 'chat-message'; message: ChatMessage }
  | { type: 'lobby'; action: 'invitation'; from: LobbyPlayer; gameId: string; inviteId: string }
  | { type: 'lobby'; action: 'invitation-response'; accepted: boolean; gameId: string; inviteId: string };

// Client -> Server
export type ClientToServer =
  | { type: 'create'; name?: string }
  | { type: 'join'; gameId: string; name?: string }
  | { type: 'move'; gameId: string; pit: number }
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
