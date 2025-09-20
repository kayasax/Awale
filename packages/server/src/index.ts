import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { randomBytes } from 'crypto';
import { ClientToServer, ServerToClient, GameStateSnapshot } from './protocol.js';
import { createInitialState as engineCreateInitial, applyMove, getLegalMoves } from '@awale/core';
import type { GameState } from '@awale/shared';

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
}

const games = new Map<string, GameSession>();

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
				send(ws, { type: 'joined', gameId: game.id, role: 'guest', opponent: game.host.name });
				send(ws, { type: 'state', gameId: game.id, version: game.state.version || 0, state: toPublicState(game.state) });
				if (game.host.ws && game.host.connected) send(game.host.ws, { type: 'joined', gameId: game.id, role: 'host', opponent: guest.name });
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
						broadcast(game, { type: 'gameEnded', gameId: game.id, reason: 'end', final: toPublicState(game.state) });
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
					broadcast(game, { type: 'gameEnded', gameId: game.id, reason: 'resign', final: toPublicState(game.state) });
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
			if (g.host.ws === ws) { g.host.connected = false; }
			if (g.guest && g.guest.ws === ws) { g.guest.connected = false; }
		}
	});
});

server.listen(PORT, () => {
	console.log(JSON.stringify({ level: 'info', msg: 'server_listening', port: PORT }));
});
// ...rest of file unchanged...