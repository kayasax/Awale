import { WebSocketServer } from 'ws';
import http from 'http';
import { randomBytes } from 'crypto';
import { ClientToServer, ServerToClient, GameStateSnapshot } from './protocol.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // Optional strict origin check

interface PlayerInfo { id: string; name: string; token: string; connected: boolean; ws?: WebSocket; lastSeen: number; }
interface GameSession {
  id: string;
  host: PlayerInfo;
  guest?: PlayerInfo;
  state: GameStateSnapshot;
  version: number;
  createdAt: number;
  updatedAt: number;
  moveSeq: number;
}

const games = new Map<string, GameSession>();

function createInitialState(): GameStateSnapshot {
  return { pits: Array(12).fill(4), scores: { host: 0, guest: 0 }, currentPlayer: 'host', phase: 'playing' };
}

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

wss.on('connection', (ws, req) => {
  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) {
    ws.close(4001, 'origin not allowed');
    return;
  }

  ws.on('message', (data) => {
    let msg: ClientToServer;
    try { msg = JSON.parse(data.toString()); } catch { return send(ws, { type: 'error', code: 'BAD_JSON', message: 'Invalid JSON' }); }

    switch (msg.type) {
      case 'create': {
        const gameId = newId();
        const token = newToken();
        const host: PlayerInfo = { id: 'host', name: msg.name || 'Host', token, connected: true, ws, lastSeen: Date.now() };
        const game: GameSession = { id: gameId, host, state: createInitialState(), version: 1, createdAt: Date.now(), updatedAt: Date.now(), moveSeq: 0 };
        games.set(gameId, game);
        send(ws, { type: 'created', gameId, playerToken: token });
        send(ws, { type: 'state', gameId, version: game.version, state: game.state });
        break;
      }
      case 'join': {
        const game = games.get(msg.gameId);
        if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
        if (game.guest) return send(ws, { type: 'error', code: 'FULL', message: 'Game full' });
        const token = newToken();
        const guest: PlayerInfo = { id: 'guest', name: msg.name || 'Guest', token, connected: true, ws, lastSeen: Date.now() };
        game.guest = guest; game.updatedAt = Date.now();
        send(ws, { type: 'joined', gameId: game.id, role: 'guest', opponent: game.host.name });
        send(ws, { type: 'state', gameId: game.id, version: game.version, state: game.state });
        if (game.host.ws && game.host.connected) send(game.host.ws, { type: 'joined', gameId: game.id, role: 'host', opponent: guest.name });
        break;
      }
      case 'move': {
        const game = games.get(msg.gameId);
        if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
        if (game.state.phase !== 'playing') return send(ws, { type: 'error', code: 'ENDED', message: 'Game ended' });
        // Identify player
        const player = (game.host.ws === ws) ? 'host' : (game.guest?.ws === ws ? 'guest' : undefined);
        if (!player) return send(ws, { type: 'error', code: 'NOT_IN_GAME', message: 'Not part of this game' });
        if (player !== game.state.currentPlayer) return send(ws, { type: 'error', code: 'NOT_YOUR_TURN', message: 'Not your turn' });
        // Basic legality checks (placeholder; integrate engine later)
        if (msg.pit < 0 || msg.pit > 11) return send(ws, { type: 'error', code: 'BAD_PIT', message: 'Invalid pit index' });
        // Ownership check: host controls pits 0-5, guest 6-11
        if (player === 'host' && msg.pit > 5) return send(ws, { type: 'error', code: 'BAD_SIDE', message: 'Wrong side' });
        if (player === 'guest' && msg.pit < 6) return send(ws, { type: 'error', code: 'BAD_SIDE', message: 'Wrong side' });
        if (game.state.pits[msg.pit] === 0) return send(ws, { type: 'error', code: 'EMPTY', message: 'Pit empty' });
        // Naive sow (placeholder); replace with engine call
        const seeds = game.state.pits[msg.pit];
        game.state.pits[msg.pit] = 0;
        let idx = msg.pit;
        for (let s = 0; s < seeds; s++) {
          idx = (idx + 1) % 12;
          game.state.pits[idx] += 1;
        }
        // Switch turn
        game.state.currentPlayer = player === 'host' ? 'guest' : 'host';
        game.version += 1; game.moveSeq += 1; game.updatedAt = Date.now();
        broadcast(game, { type: 'moveApplied', gameId: game.id, seq: game.moveSeq, pit: msg.pit, player, version: game.version });
        broadcast(game, { type: 'state', gameId: game.id, version: game.version, state: game.state });
        break;
      }
      case 'resign': {
        const game = games.get(msg.gameId);
        if (!game) return send(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
        game.state.phase = 'ended';
        game.version += 1; game.updatedAt = Date.now();
        broadcast(game, { type: 'gameEnded', gameId: game.id, reason: 'resign', final: game.state });
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
      if (g.guest?.ws === ws) { g.guest.connected = false; }
    }
  });
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'server_listening', port: PORT }));
});
