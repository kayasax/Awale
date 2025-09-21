import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { randomBytes } from 'crypto';
import { ClientToServer, ServerToClient, GameStateSnapshot, LobbyPlayer, ChatMessage } from './protocol.js';
import { createInitialState as engineCreateInitial, applyMove, getLegalMoves } from '@awale/core';
import type { GameState } from '@awale/shared';
import { analytics, getGameType, calculateGameDuration, type GameType, type GameEndReason } from './analytics.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // Optional strict origin check

interface PlayerInfo { 
  id: string; 
  name: string; 
  playerId?: string;  // Client-provided persistent ID
  token: string; 
  connected: boolean; 
  ws?: WebSocket; 
  lastSeen: number; 
}
interface GameSession {
	id: string;
	host: PlayerInfo;
	guest?: PlayerInfo;
	state: GameState; // engine state directly
	createdAt: number;
	updatedAt: number;
	moveSeq: number;
	startingPlayer?: 'host' | 'guest'; // Randomized first player
}

const games = new Map<string, GameSession>();

// 🌐 Lobby System
interface LobbyConnection {
	ws: WebSocket;
	player: LobbyPlayer;
	lastSeen: number;
}

const lobbyConnections = new Map<string, LobbyConnection>();
const lobbyChatMessages: ChatMessage[] = [];
const activeInvitations = new Map<string, { from: LobbyPlayer; to: LobbyPlayer; gameId: string; timestamp: number }>();

// Lobby message broadcast
function broadcastToLobby(message: ServerToClient) {
	for (const connection of lobbyConnections.values()) {
		if (connection.ws.readyState === WebSocket.OPEN) {
			send(connection.ws, message);
		}
	}
}

// Clean up old lobby connections and invitations
setInterval(() => {
	const now = Date.now();
	const LOBBY_TIMEOUT = 300_000; // 5 minutes
	const INVITATION_TIMEOUT = 60_000; // 1 minute
	
	// Clean stale lobby connections
	for (const [playerId, connection] of lobbyConnections) {
		if (now - connection.lastSeen > LOBBY_TIMEOUT) {
			lobbyConnections.delete(playerId);
			broadcastToLobby({ type: 'lobby', action: 'player-left', playerId });
		}
	}
	
	// Clean old invitations
	for (const [inviteId, invite] of activeInvitations) {
		if (now - invite.timestamp > INVITATION_TIMEOUT) {
			activeInvitations.delete(inviteId);
		}
	}
	
	// Limit chat history
	if (lobbyChatMessages.length > 100) {
		lobbyChatMessages.splice(0, lobbyChatMessages.length - 100);
	}
}, 30_000).unref();

function createInitialState(): GameState {
	const s = engineCreateInitial();
	return s;
}

function toPublicState(state: GameState): GameStateSnapshot {
	return {
		pits: state.pits,
		currentPlayer: state.currentPlayer,
		captured: state.captured,
		ended: state.ended,
		winner: state.winner,
		version: state.version
	};
}

// Rate limiting (simple token bucket per connection)
const RATE_BURST = parseInt(process.env.RATE_LIMIT_BURST || '20', 10);
const RATE_REFILL_MS = parseInt(process.env.RATE_LIMIT_REFILL_MS || '1000', 10); // 1 token per second default
interface RateState { tokens: number; lastRefill: number; }
const rateMap = new WeakMap<WebSocket, RateState>();

function checkRate(ws: WebSocket): boolean {
	let rs = rateMap.get(ws);
	const now = Date.now();
	if (!rs) { rs = { tokens: RATE_BURST, lastRefill: now }; rateMap.set(ws, rs); }
	const elapsed = now - rs.lastRefill;
	if (elapsed >= RATE_REFILL_MS) {
		const refill = Math.floor(elapsed / RATE_REFILL_MS);
		rs.tokens = Math.min(RATE_BURST, rs.tokens + refill);
		rs.lastRefill = now;
	}
	if (rs.tokens <= 0) return false;
	rs.tokens -= 1;
	return true;
}

// Cleanup stale games
const STALE_FULL_DISCONNECT_MS = parseInt(process.env.STALE_DISCONNECT_MS || '300000', 10); // 5m
const MAX_GAME_AGE_MS = parseInt(process.env.MAX_GAME_AGE_MS || '3600000', 10); // 1h
setInterval(() => {
	const now = Date.now();
	for (const [id, g] of games) {
		const bothDisconnected = !g.host.connected && (!g.guest || !g.guest.connected);
		if (bothDisconnected && now - g.updatedAt > STALE_FULL_DISCONNECT_MS) {
			games.delete(id);
			continue;
		}
		if (now - g.createdAt > MAX_GAME_AGE_MS) {
			games.delete(id);
		}
	}
}, 60_000).unref();

// Periodic lobby metrics tracking
function trackLobbyMetrics() {
	const connections = Array.from(lobbyConnections.values());
	const availablePlayers = connections.filter(c => c.player.status === 'available').length;
	const inGamePlayers = connections.filter(c => c.player.status === 'in-game').length;
	
	analytics.trackLobbyMetrics({
		connectedPlayers: connections.length,
		availablePlayers,
		inGamePlayers,
		activeGames: games.size
	});
}

// Track metrics every 5 minutes
setInterval(trackLobbyMetrics, 5 * 60 * 1000).unref();

function send(ws: WebSocket, msg: ServerToClient) {
	ws.send(JSON.stringify(msg));
}

function broadcast(game: GameSession, msg: ServerToClient) {
	if (game.host.ws && game.host.connected) send(game.host.ws, msg);
	if (game.guest?.ws && game.guest.connected) send(game.guest.ws, msg);
}

function newToken() { return randomBytes(24).toString('base64url'); }
function newId() { return randomBytes(6).toString('hex'); }

const server = http.createServer((req, res) => {
	if (req.url === '/health') {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ status: 'ok', games: games.size }));
		return;
	}
	res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
	// Allow localhost origins for development, strict origin check for production
	if (ALLOWED_ORIGIN && req.headers.origin) {
		const origin = req.headers.origin;
		const isLocalhost = origin.includes('localhost:') || origin.includes('127.0.0.1:') || origin.includes('::1:');
		const isAllowedOrigin = origin === ALLOWED_ORIGIN;
		const isGitHubPages = origin.includes('.github.io');
		
		if (!isLocalhost && !isAllowedOrigin && !isGitHubPages) {
			console.log(`🚫 Origin not allowed: ${origin}`);
			ws.close(4001, 'origin not allowed');
			return;
		}
		console.log(`✅ Connection accepted from origin: ${origin}`);
	}

	ws.on('message', (data: any) => {
		let msg: ClientToServer;
		try { msg = JSON.parse(data.toString()); } catch { return send(ws, { type: 'error', code: 'BAD_JSON', message: 'Invalid JSON' }); }

		switch (msg.type) {
			// 🌐 Lobby System Messages
			case 'lobby': {
				if (!checkRate(ws)) return send(ws, { type: 'error', code: 'RATE_LIMIT', message: 'Too many messages' });
				
				switch (msg.action) {
					case 'join': {
						const player: LobbyPlayer = {
							id: msg.playerId,
							name: msg.playerName,
							avatar: msg.avatar,
							status: 'available',
							joinedAt: Date.now()
						};
						
						// Remove any existing connection for this player
						const existingConnection = lobbyConnections.get(player.id);
						if (existingConnection) {
							console.log('🌐 Removing existing connection for player:', player.name);
							broadcastToLobby({ type: 'lobby', action: 'player-left', playerId: player.id });
						}
						
						// Add new connection
						console.log('🌐 Adding new connection for player:', player.name);
						lobbyConnections.set(player.id, {
							ws,
							player,
							lastSeen: Date.now()
						});
						
						// Track lobby connection
						analytics.trackLobbyConnection(player.id, player.name, 'connect');
						
						// Send current lobby state to joining player
						const players = Array.from(lobbyConnections.values()).map(c => c.player);
						send(ws, { type: 'lobby', players, messages: lobbyChatMessages.slice(-50) });
						
						// Broadcast player joined to others
						broadcastToLobby({ type: 'lobby', action: 'player-joined', player });
						break;
					}
					
					case 'leave': {
						// Find the player by WebSocket connection
						for (const [playerId, connection] of lobbyConnections) {
							if (connection.ws === ws) {
								// Track lobby disconnection
								analytics.trackLobbyConnection(connection.player.id, connection.player.name, 'disconnect');
								
								lobbyConnections.delete(playerId);
								broadcastToLobby({ type: 'lobby', action: 'player-left', playerId });
								break;
							}
						}
						break;
					}
					
					case 'status': {
						// Find the player by WebSocket connection
						for (const [playerId, connection] of lobbyConnections) {
							if (connection.ws === ws) {
								connection.player.status = msg.status;
								connection.lastSeen = Date.now();
								broadcastToLobby({ 
									type: 'lobby', 
									action: 'player-status', 
									playerId, 
									status: msg.status 
								});
								break;
							}
						}
						break;
					}
					
					case 'chat': {
						// Find the player by WebSocket connection
						let senderConnection: LobbyConnection | undefined;
						for (const connection of lobbyConnections.values()) {
							if (connection.ws === ws) {
								senderConnection = connection;
								break;
							}
						}
						
						if (!senderConnection) {
							return send(ws, { type: 'error', code: 'NOT_IN_LOBBY', message: 'Not in lobby' });
						}
						
						const chatMessage: ChatMessage = {
							id: newId(),
							playerId: senderConnection.player.id,
							playerName: senderConnection.player.name,
							message: msg.message.slice(0, 500), // Limit message length
							timestamp: Date.now(),
							type: 'message'
						};
						
						lobbyChatMessages.push(chatMessage);
						broadcastToLobby({ type: 'lobby', action: 'chat-message', message: chatMessage });
						break;
					}
					
					case 'invite': {
						// Find sender by WebSocket connection
						let fromConnection: LobbyConnection | undefined;
						for (const connection of lobbyConnections.values()) {
							if (connection.ws === ws) {
								fromConnection = connection;
								break;
							}
						}
						
						if (!fromConnection) {
							return send(ws, { type: 'error', code: 'NOT_IN_LOBBY', message: 'Not in lobby' });
						}
						
						const toConnection = lobbyConnections.get(msg.targetPlayerId);
						if (!toConnection) {
							return send(ws, { type: 'error', code: 'PLAYER_NOT_FOUND', message: 'Player not in lobby' });
						}
						
						if (toConnection.player.status !== 'available') {
							return send(ws, { type: 'error', code: 'PLAYER_BUSY', message: 'Player is not available' });
						}
						
						// Create game session for the invitation
						const gameId = newId();
						const inviteId = newId();
						
						// Store invitation
						activeInvitations.set(inviteId, {
							from: fromConnection.player,
							to: toConnection.player,
							gameId,
							timestamp: Date.now()
						});
						
						// Track invitation sent
						analytics.trackInvitation(fromConnection.player.id, toConnection.player.id, 'sent');
						
						// Send invitation to target player
						send(toConnection.ws, { 
							type: 'lobby', 
							action: 'invitation', 
							from: fromConnection.player, 
							gameId, 
							inviteId 
						});
						
						// Update sender status to 'away' (waiting for response)
						fromConnection.player.status = 'away';
						broadcastToLobby({ 
							type: 'lobby', 
							action: 'player-status', 
							playerId: fromConnection.player.id, 
							status: 'away' 
						});
						
						break;
					}
					
					case 'accept-invite': {
						const invitation = activeInvitations.get(msg.inviteId);
						if (!invitation) {
							return send(ws, { type: 'error', code: 'INVITATION_NOT_FOUND', message: 'Invitation expired or not found' });
						}
						
						const respondingConnection = lobbyConnections.get(invitation.to.id);
						if (!respondingConnection || respondingConnection.ws !== ws) {
							return send(ws, { type: 'error', code: 'NOT_INVITED', message: 'You were not invited' });
						}
						
						const inviterConnection = lobbyConnections.get(invitation.from.id);
						
						// Clean up invitation
						activeInvitations.delete(msg.inviteId);
						
						// Track invitation accepted
						analytics.trackInvitation(invitation.from.id, invitation.to.id, 'accepted');
						
						if (inviterConnection) {
							// Create actual game session
							const token = newToken();
							const host: PlayerInfo = { 
								id: 'host', 
								name: invitation.from.name, 
								playerId: invitation.from.id,
								token, 
								connected: true, 
								ws: inviterConnection.ws, 
								lastSeen: Date.now() 
							};
							
							const game: GameSession = { 
								id: invitation.gameId, 
								host, 
								state: createInitialState(), 
								createdAt: Date.now(), 
								updatedAt: Date.now(), 
								moveSeq: 0 
							};
							
							games.set(invitation.gameId, game);
							
							// Update player statuses to 'in-game'
							inviterConnection.player.status = 'in-game';
							inviterConnection.player.gameId = invitation.gameId;
							respondingConnection.player.status = 'in-game';
							respondingConnection.player.gameId = invitation.gameId;
							
							// Broadcast status updates
							broadcastToLobby({ 
								type: 'lobby', 
								action: 'player-status', 
								playerId: invitation.from.id, 
								status: 'in-game' 
							});
							broadcastToLobby({ 
								type: 'lobby', 
								action: 'player-status', 
								playerId: invitation.to.id, 
								status: 'in-game' 
							});
							
							// Send game creation messages
							send(inviterConnection.ws, { type: 'created', gameId: invitation.gameId, playerToken: token });
							send(inviterConnection.ws, { type: 'state', gameId: invitation.gameId, version: game.state.version || 0, state: toPublicState(game.state) });
							
							// Auto-join guest
							const guestToken = newToken();
							const guest: PlayerInfo = { 
								id: 'guest', 
								name: invitation.to.name, 
								playerId: invitation.to.id,
								token: guestToken, 
								connected: true, 
								ws: respondingConnection.ws, 
								lastSeen: Date.now() 
							};
							
							game.guest = guest;
							game.updatedAt = Date.now();
							
							send(respondingConnection.ws, { type: 'joined', gameId: invitation.gameId, role: 'guest', opponent: invitation.from.name });
							send(respondingConnection.ws, { type: 'state', gameId: invitation.gameId, version: game.state.version || 0, state: toPublicState(game.state) });
							send(inviterConnection.ws, { type: 'joined', gameId: invitation.gameId, role: 'host', opponent: invitation.to.name });
							
							// Start the game with randomized first player
							const randomStart = Math.random() < 0.5;
							game.startingPlayer = randomStart ? 'host' : 'guest';
							
							if (game.startingPlayer === 'guest') {
								game.state = { ...game.state, currentPlayer: 'B' };
							}
							
							broadcast(game, { 
								type: 'gameStarting', 
								gameId: game.id, 
								startingPlayer: game.startingPlayer,
								message: `Random selection: ${game.startingPlayer === 'host' ? game.host.name : game.guest.name} starts first!`
							});
							
							broadcast(game, { 
								type: 'state', 
								gameId: game.id, 
								version: game.state.version || 0, 
								state: toPublicState(game.state) 
							});
						}
						
						// Send response back to both players
						if (inviterConnection) {
							send(inviterConnection.ws, { 
								type: 'lobby', 
								action: 'invitation-response', 
								accepted: true, 
								gameId: invitation.gameId, 
								inviteId: msg.inviteId 
							});
						}
						break;
					}
					
					case 'decline-invite': {
						const invitation = activeInvitations.get(msg.inviteId);
						if (!invitation) {
							return send(ws, { type: 'error', code: 'INVITATION_NOT_FOUND', message: 'Invitation expired or not found' });
						}
						
						const respondingConnection = lobbyConnections.get(invitation.to.id);
						if (!respondingConnection || respondingConnection.ws !== ws) {
							return send(ws, { type: 'error', code: 'NOT_INVITED', message: 'You were not invited' });
						}
						
						const inviterConnection = lobbyConnections.get(invitation.from.id);
						
						// Clean up invitation
						activeInvitations.delete(msg.inviteId);
						
						// Track invitation declined
						analytics.trackInvitation(invitation.from.id, invitation.to.id, 'declined');
						
						// Reset inviter status to available
						if (inviterConnection) {
							inviterConnection.player.status = 'available';
							broadcastToLobby({ 
								type: 'lobby', 
								action: 'player-status', 
								playerId: invitation.from.id, 
								status: 'available' 
							});
							
							// Send response back to inviter
							send(inviterConnection.ws, { 
								type: 'lobby', 
								action: 'invitation-response', 
								accepted: false, 
								gameId: invitation.gameId, 
								inviteId: msg.inviteId 
							});
						}
						break;
					}
				}
				break;
			}
			
			case 'create': {
				const gameId = newId();
				const token = newToken();
				const host: PlayerInfo = { 
					id: 'host', 
					name: msg.name || 'Host', 
					playerId: msg.playerId,
					token, 
					connected: true, 
					ws, 
					lastSeen: Date.now() 
				};
				const game: GameSession = { id: gameId, host, state: createInitialState(), createdAt: Date.now(), updatedAt: Date.now(), moveSeq: 0 };
				games.set(gameId, game);
				
				// Track game creation
				analytics.trackGameCreated(gameId, getGameType('create'), host.playerId || host.id);
				
				send(ws, { type: 'created', gameId, playerToken: token });
				send(ws, { type: 'state', gameId, version: game.state.version || 0, state: toPublicState(game.state) });
				break;
			}
			case 'join': {
				const game = games.get(msg.gameId);
				if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
				
				// Check for reconnection with same playerId
				if (msg.playerId) {
					// Check if this playerId is the host trying to reconnect
					if (game.host.playerId === msg.playerId) {
						console.log(`🔄 Host reconnecting with playerId: ${msg.playerId}`);
						game.host.ws = ws;
						game.host.connected = true;
						game.host.lastSeen = Date.now();
						send(ws, { type: 'joined', gameId: game.id, role: 'host', opponent: game.guest?.name });
						send(ws, { type: 'state', gameId: game.id, version: game.state.version || 0, state: toPublicState(game.state) });
						
						// Check if we need to randomize start (both players now connected)
						if (!game.startingPlayer && game.guest?.connected) {
							const randomStart = Math.random() < 0.5;
							game.startingPlayer = randomStart ? 'host' : 'guest';
							
							console.log(`🎲 Game ${game.id}: Random start on reconnection - ${game.startingPlayer} (${game.startingPlayer === 'host' ? game.host.name : game.guest.name}) goes first`);
							
							if (game.startingPlayer === 'guest') {
								game.state = { ...game.state, currentPlayer: 'B' };
							}
							
							broadcast(game, { 
								type: 'gameStarting', 
								gameId: game.id, 
								startingPlayer: game.startingPlayer,
								message: `Random selection: ${game.startingPlayer === 'host' ? game.host.name : game.guest.name} starts first!`
							});
							
							broadcast(game, { 
								type: 'state', 
								gameId: game.id, 
								version: game.state.version || 0, 
								state: toPublicState(game.state) 
							});
						}
						
						return;
					}
					
					// Check if this playerId is the guest trying to reconnect
					if (game.guest?.playerId === msg.playerId) {
						console.log(`🔄 Guest reconnecting with playerId: ${msg.playerId}`);
						game.guest.ws = ws;
						game.guest.connected = true;
						game.guest.lastSeen = Date.now();
						send(ws, { type: 'joined', gameId: game.id, role: 'guest', opponent: game.host.name });
						send(ws, { type: 'state', gameId: game.id, version: game.state.version || 0, state: toPublicState(game.state) });
						
						// Check if we need to randomize start (both players now connected)
						if (!game.startingPlayer && game.host.connected) {
							const randomStart = Math.random() < 0.5;
							game.startingPlayer = randomStart ? 'host' : 'guest';
							
							console.log(`🎲 Game ${game.id}: Random start on guest reconnection - ${game.startingPlayer} (${game.startingPlayer === 'host' ? game.host.name : game.guest.name}) goes first`);
							
							if (game.startingPlayer === 'guest') {
								game.state = { ...game.state, currentPlayer: 'B' };
							}
							
							broadcast(game, { 
								type: 'gameStarting', 
								gameId: game.id, 
								startingPlayer: game.startingPlayer,
								message: `Random selection: ${game.startingPlayer === 'host' ? game.host.name : game.guest.name} starts first!`
							});
							
							broadcast(game, { 
								type: 'state', 
								gameId: game.id, 
								version: game.state.version || 0, 
								state: toPublicState(game.state) 
							});
						}
						
						return;
					}
				}
				
				// Regular join logic (new player)
				if (game.guest) return send(ws, { type: 'error', code: 'FULL', message: 'Game full' });
				const token = newToken();
				const guest: PlayerInfo = { 
					id: 'guest', 
					name: msg.name || 'Guest', 
					playerId: msg.playerId,
					token, 
					connected: true, 
					ws, 
					lastSeen: Date.now() 
				};
				game.guest = guest; game.updatedAt = Date.now();
				
				// Track player joining
				analytics.trackPlayerJoined(game.id, guest.playerId || guest.id, 'guest', getGameType('join'));
				
				send(ws, { type: 'joined', gameId: game.id, role: 'guest', opponent: game.host.name });
				send(ws, { type: 'state', gameId: game.id, version: game.state.version || 0, state: toPublicState(game.state) });
				if (game.host.ws && game.host.connected) send(game.host.ws, { type: 'joined', gameId: game.id, role: 'host', opponent: guest.name });
				
				// Randomize starting player when both players are connected
				if (!game.startingPlayer && game.host.connected && game.guest.connected) {
					const randomStart = Math.random() < 0.5;
					game.startingPlayer = randomStart ? 'host' : 'guest';
					
					// Track game start
					analytics.trackGameStarted(
						game.id, 
						getGameType('join'), 
						game.host.playerId || game.host.id, 
						game.guest.playerId || game.guest.id
					);
					
					// Create appropriate messages
					const startMessages = {
						host: game.startingPlayer === 'host' 
							? `🎲 You have been randomly selected to start the game!` 
							: `🎲 ${game.guest.name} has been randomly selected to start the game.`,
						guest: game.startingPlayer === 'guest' 
							? `🎲 You have been randomly selected to start the game!` 
							: `🎲 ${game.host.name} has been randomly selected to start the game.`
					};
					
					console.log(`🎲 Game ${game.id}: Random start selected - ${game.startingPlayer} (${game.startingPlayer === 'host' ? game.host.name : game.guest.name}) goes first`);
					
					// If guest was selected to start, we need to modify the game state
					if (game.startingPlayer === 'guest') {
						// Switch the current player from 'A' to 'B' so guest starts
						game.state = { ...game.state, currentPlayer: 'B' };
						console.log(`🎲 Game state updated: guest (player B) starts first`);
					}
					
					// Notify both players about who starts
					broadcast(game, { 
						type: 'gameStarting', 
						gameId: game.id, 
						startingPlayer: game.startingPlayer,
						message: `Random selection: ${game.startingPlayer === 'host' ? game.host.name : game.guest.name} starts first!`
					});
					
					// Send updated state to reflect starting player change
					broadcast(game, { 
						type: 'state', 
						gameId: game.id, 
						version: game.state.version || 0, 
						state: toPublicState(game.state) 
					});
				}
				break;
			}
			case 'move': {
				if (!checkRate(ws)) return send(ws, { type: 'error', code: 'RATE_LIMIT', message: 'Too many messages' });
				const game = games.get(msg.gameId);
				if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
				if (game.state.ended) return send(ws, { type: 'error', code: 'ENDED', message: 'Game ended' });
				
				// Check if both players are present
				if (!game.guest || !game.guest.connected) {
					return send(ws, { type: 'error', code: 'WAITING_FOR_OPPONENT', message: 'Waiting for opponent to join' });
				}
				
				// Identify player
				const player = (game.host.ws === ws) ? 'host' : (game.guest?.ws === ws ? 'guest' : undefined);
				if (!player) return send(ws, { type: 'error', code: 'NOT_IN_GAME', message: 'Not part of this game' });
				// Map player to engine player
				const enginePlayer = player === 'host' ? 'A' : 'B';
				if (enginePlayer !== game.state.currentPlayer) return send(ws, { type: 'error', code: 'NOT_YOUR_TURN', message: 'Not your turn' });
				if (msg.pit < 0 || msg.pit > 11) return send(ws, { type: 'error', code: 'BAD_PIT', message: 'Invalid pit index' });
				// Ownership check using engine semantics
				if (enginePlayer === 'A' && msg.pit > 5) return send(ws, { type: 'error', code: 'BAD_SIDE', message: 'Wrong side' });
				if (enginePlayer === 'B' && msg.pit < 6) return send(ws, { type: 'error', code: 'BAD_SIDE', message: 'Wrong side' });
				const legal = getLegalMoves(game.state);
				if (!legal.includes(msg.pit)) return send(ws, { type: 'error', code: 'ILLEGAL', message: 'Illegal move' });
				try {
					const result = applyMove(game.state, msg.pit);
					game.state = result.state;
					game.moveSeq += 1; game.updatedAt = Date.now();
					broadcast(game, { type: 'moveApplied', gameId: game.id, seq: game.moveSeq, pit: msg.pit, player, version: game.state.version || 0, captured: result.capturedThisMove });
					broadcast(game, { type: 'state', gameId: game.id, version: game.state.version || 0, state: toPublicState(game.state) });
					if (game.state.ended) {
						// Track game completion
						const duration = calculateGameDuration(game.createdAt, Date.now());
						const winner = game.state.winner === 'A' ? 'host' : game.state.winner === 'B' ? 'guest' : 'draw';
						
						analytics.trackGameEnded(
							{
								gameId: game.id,
								gameType: getGameType('join'),
								playerCount: 2,
								duration,
								movesPlayed: game.moveSeq,
								endReason: 'natural-end',
								winner: winner as 'host' | 'guest' | 'draw'
							},
							game.host.playerId || game.host.id,
							game.guest?.playerId || game.guest?.id
						);
						
						broadcast(game, { type: 'gameEnded', gameId: game.id, reason: 'end', final: toPublicState(game.state) });
						
						// Return players to lobby as available
						const hostLobbyConnection = Array.from(lobbyConnections.values()).find(c => c.player.id === game.host.playerId);
						const guestLobbyConnection = game.guest ? Array.from(lobbyConnections.values()).find(c => c.player.id === game.guest?.playerId) : undefined;
						
						if (hostLobbyConnection) {
							hostLobbyConnection.player.status = 'available';
							hostLobbyConnection.player.gameId = undefined;
							broadcastToLobby({ 
								type: 'lobby', 
								action: 'player-status', 
								playerId: game.host.playerId!, 
								status: 'available' 
							});
						}
						
						if (guestLobbyConnection && game.guest) {
							guestLobbyConnection.player.status = 'available';
							guestLobbyConnection.player.gameId = undefined;
							broadcastToLobby({ 
								type: 'lobby', 
								action: 'player-status', 
								playerId: game.guest.playerId!, 
								status: 'available' 
							});
						}
					}
				} catch (e: any) {
					send(ws, { type: 'error', code: 'ENGINE_ERR', message: e.message });
				}
				break;
			}
			case 'resign': {
				const game = games.get(msg.gameId);
				if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
				if (!game.state.ended) {
					game.state.ended = true;
					game.updatedAt = Date.now();
					
					// Track resignation
					const duration = calculateGameDuration(game.createdAt, Date.now());
					const resigner = (ws === game.host.ws) ? 'host' : 'guest';
					const winner = resigner === 'host' ? 'guest' : 'host';
					
					analytics.trackGameEnded(
						{
							gameId: game.id,
							gameType: getGameType('join'),
							playerCount: 2,
							duration,
							movesPlayed: game.moveSeq,
							endReason: 'resignation',
							winner: winner as 'host' | 'guest'
						},
						game.host.playerId || game.host.id,
						game.guest?.playerId || game.guest?.id
					);
					
					broadcast(game, { type: 'gameEnded', gameId: game.id, reason: 'resign', final: toPublicState(game.state) });
					
					// Return players to lobby as available
					const hostLobbyConnection = Array.from(lobbyConnections.values()).find(c => c.player.id === game.host.playerId);
					const guestLobbyConnection = game.guest ? Array.from(lobbyConnections.values()).find(c => c.player.id === game.guest?.playerId) : undefined;
					
					if (hostLobbyConnection) {
						hostLobbyConnection.player.status = 'available';
						hostLobbyConnection.player.gameId = undefined;
						broadcastToLobby({ 
							type: 'lobby', 
							action: 'player-status', 
							playerId: game.host.playerId!, 
							status: 'available' 
						});
					}
					
					if (guestLobbyConnection && game.guest) {
						guestLobbyConnection.player.status = 'available';
						guestLobbyConnection.player.gameId = undefined;
						broadcastToLobby({ 
							type: 'lobby', 
							action: 'player-status', 
							playerId: game.guest.playerId!, 
							status: 'available' 
						});
					}
				}
				break;
			}
			case 'ping': {
				send(ws, { type: 'pong', latency: msg.ts ? Date.now() - msg.ts : undefined });
				break;
			}
			default:
				send(ws, { type: 'error', code: 'UNKNOWN', message: 'Unknown message type' });
		}
	});

	ws.on('close', () => {
		// Mark disconnected; do not delete game yet (allows reconnect logic later)
		for (const g of games.values()) {
			if (g.host.ws === ws) { 
				g.host.connected = false; 
				// Update lobby status if player was in lobby
				const lobbyConnection = Array.from(lobbyConnections.values()).find(c => c.player.id === g.host.playerId);
				if (lobbyConnection) {
					lobbyConnection.player.status = 'offline';
					broadcastToLobby({ 
						type: 'lobby', 
						action: 'player-status', 
						playerId: g.host.playerId!, 
						status: 'offline' 
					});
				}
			}
			if (g.guest && g.guest.ws === ws) { 
				g.guest.connected = false; 
				// Update lobby status if player was in lobby
				const lobbyConnection = Array.from(lobbyConnections.values()).find(c => c.player.id === g.guest?.playerId);
				if (lobbyConnection) {
					lobbyConnection.player.status = 'offline';
					broadcastToLobby({ 
						type: 'lobby', 
						action: 'player-status', 
						playerId: g.guest.playerId!, 
						status: 'offline' 
					});
				}
			}
		}
		
		// Handle lobby disconnections
		for (const [playerId, connection] of lobbyConnections) {
			if (connection.ws === ws) {
				lobbyConnections.delete(playerId);
				broadcastToLobby({ type: 'lobby', action: 'player-left', playerId });
				
				// Clean up any invitations from this player
				for (const [inviteId, invite] of activeInvitations) {
					if (invite.from.id === playerId || invite.to.id === playerId) {
						activeInvitations.delete(inviteId);
					}
				}
				break;
			}
		}
	});
});

server.listen(PORT, () => {
	console.log(JSON.stringify({ level: 'info', msg: 'server_listening', port: PORT }));
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
	console.log('📊 Shutting down server and flushing analytics...');
	await analytics.shutdown();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('📊 Shutting down server and flushing analytics...');
	await analytics.shutdown();
	process.exit(0);
});
// ...rest of file unchanged...