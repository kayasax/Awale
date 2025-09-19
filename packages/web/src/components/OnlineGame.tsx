import React, { useEffect, useRef, useState } from 'react';
import { OnlineClient } from '../online/connection';
import type { GameStateSnapshot, ServerToClient } from '../online/protocol';
import { Game } from './Game';
import { BoardView } from './BoardView';

interface Props {
  mode: 'online-create' | 'online-join';
  code?: string; // Provided when joining
  name?: string;
  onExit: () => void;
  serverUrl: string;
}

interface LocalMeta {
  role?: 'host' | 'guest';
  gameId?: string;
  playerToken?: string;
}

// Reuse local Game component for rendering board, but we'll override state transitions later.
export const OnlineGame: React.FC<Props> = ({ mode, code, name='Player', onExit, serverUrl }) => {
  const clientRef = useRef<OnlineClient | null>(null);
  const metaRef = useRef<LocalMeta>({});
  const [meta, setMeta] = useState<LocalMeta>({});
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null);
  const [message, setMessage] = useState<string>('Connecting...');
  const [pendingMove, setPendingMove] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [theme, setTheme] = useState<'dark'|'wood'>('dark');

  useEffect(() => {
    const client = new OnlineClient({ url: serverUrl });
    clientRef.current = client;
    const off = client.on((msg: ServerToClient) => {
      console.log('🔍 Client received message:', msg);
      switch (msg.type) {
        case 'created':
          console.log('🎮 Game created, setting meta:', { gameId: msg.gameId, playerToken: msg.playerToken, role: 'host' });
          const createdMeta = { gameId: msg.gameId, playerToken: msg.playerToken, role: 'host' as const };
          metaRef.current = createdMeta;
          setMeta(createdMeta);
          setMessage(`Game created. Share code: ${msg.gameId}`);
          break;
        case 'joined':
          console.log('👥 Game joined, updating with:', { gameId: msg.gameId, role: msg.role });
          const joinedMeta = { ...metaRef.current, gameId: msg.gameId, role: metaRef.current.role || msg.role };
          metaRef.current = joinedMeta;
          setMeta(joinedMeta);
          setMessage(`Opponent: ${msg.opponent}`);
          break;
        case 'state':
          console.log('📊 State received for gameId:', msg.gameId, 'current tracked gameId:', metaRef.current.gameId);
          console.log('🎮 Game state:', { 
            currentPlayer: msg.state.currentPlayer, 
            ourRole: metaRef.current.role, 
            ourSide: metaRef.current.role === 'host' ? 'A' : 'B' 
          });
          setSnapshot(msg.state);
          break;
        case 'moveApplied':
          setMessage(`${msg.player} played pit ${msg.pit}${msg.captured? ' (captured '+msg.captured+')':''}`);
          break;
        case 'gameEnded':
          setSnapshot(msg.final);
          setMessage('Game over.');
          break;
        case 'error':
          console.error('❌ Server error:', msg);
          setError(msg.message);
          break;
      }
    });
    client.connect();
    // Initiate
    console.log('🚀 Initiating connection, mode:', mode, 'code:', code, 'name:', name);
    if (mode === 'online-create') {
      console.log('📤 Sending create message');
      client.send({ type: 'create', name });
    } else if (mode === 'online-join' && code) {
      console.log('📤 Sending join message for gameId:', code);
      client.send({ type: 'join', gameId: code, name });
    }
    return () => { off(); client.close(); };
  }, [mode, code, name, serverUrl]);

  // Translate local player perspective to pit clicks
  function handlePitClick(pit: number) {
    const currentMeta = metaRef.current;
    console.log('🎯 Pit click attempt:', { pit, currentMeta, snapshot: !!snapshot });
    
    if (!snapshot || !currentMeta.gameId) {
      console.log('🚫 Cannot play: missing snapshot or gameId', { snapshot: !!snapshot, gameId: currentMeta.gameId });
      return;
    }
    if (pendingMove !== null) {
      console.log('🚫 Cannot play: move pending');
      return;
    }
    // Determine if it's our turn based on role
    const ourSide = currentMeta.role === 'host' ? 'A' : 'B';
    console.log('🎮 Turn check:', { currentPlayer: snapshot.currentPlayer, ourSide, ourRole: currentMeta.role });
    if (snapshot.currentPlayer !== ourSide) {
      console.log('🚫 Not our turn:', { currentPlayer: snapshot.currentPlayer, ourSide });
      return;
    }
    // Side ownership
    if (ourSide === 'A' && pit > 5) {
      console.log('🚫 Wrong side for player A: pit', pit);
      return;
    }
    if (ourSide === 'B' && pit < 6) {
      console.log('🚫 Wrong side for player B: pit', pit);
      return;
    }
    console.log('🎯 Playing pit:', pit, 'for gameId:', currentMeta.gameId, 'as player:', ourSide);
    clientRef.current?.send({ type: 'move', gameId: currentMeta.gameId, pit });
    setPendingMove(pit);
    setTimeout(()=> setPendingMove(null), 600);
  }

  // Calculate scores and winner
  const ourRole = metaRef.current.role;
  const ourScore = snapshot ? (ourRole === 'host' ? snapshot.captured.A : snapshot.captured.B) : 0;
  const opponentScore = snapshot ? (ourRole === 'host' ? snapshot.captured.B : snapshot.captured.A) : 0;
  const winner = snapshot?.ended ? 
    (snapshot.winner === (ourRole === 'host' ? 'A' : 'B') ? 'You win!' : 
     snapshot.winner === (ourRole === 'host' ? 'B' : 'A') ? 'Opponent wins!' : 
     'Draw.') : '';

  const containerClass = "awale-container theme-"+theme;
  return (
    <div className={containerClass}>
      <header className="topbar">
        <h1 className="logo">Awale Online</h1>
        <div className="scorepanel" role="group" aria-label="Scores">
          <div className="scores">
            <span className="score you" aria-label="Your score">You <strong>{ourScore}</strong></span>
            <span className="score ai" aria-label="Opponent score">Opponent <strong>{opponentScore}</strong></span>
          </div>
          <div className="turn">
            Turn: <strong>
              {snapshot ? 
                (snapshot.currentPlayer === (ourRole === 'host' ? 'A' : 'B') ? 'You' : 'Opponent')
                : 'Connecting...'}
            </strong>
          </div>
          {winner && <div className="winner" role="status">{winner}</div>}
          <div className="msg" role="status">{message}</div>
          {meta.gameId && (
            <div className="code-display">
              Game Code: <code>{meta.gameId}</code>
            </div>
          )}
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <div className="controls">
          <button className="btn" onClick={onExit}>Home</button>
          <button className="btn mute" onClick={()=> setMuted(m => !m)} data-state={muted? 'off':'on'} aria-label={muted? 'Sound is muted, click to unmute':'Sound is on, click to mute'} title="Toggle sound">{muted? 'Unmute' : 'Mute'}</button>
          <button className="btn" onClick={()=> setTheme(t=> t==='dark'?'wood':'dark')} aria-pressed={theme==='wood' ? 'true' : 'false'} title="Toggle wood theme">{theme==='wood' ? 'Dark Mode' : 'Wood Theme'}</button>
        </div>
      </header>
      
      {!snapshot && (
        <div className="board-shell">
          <div className="loading">Waiting for game state...</div>
        </div>
      )}
      
      {snapshot && (
        <div className="board-shell">
          <BoardView
            state={{
              pits: snapshot.pits,
              currentPlayer: snapshot.currentPlayer,
              interactiveSide: metaRef.current.role === 'host' ? 'A' : 'B',
              ended: snapshot.ended,
              // legal: server does not send legal set yet; placeholder enable all owned pits with seeds >0
              legal: snapshot.pits
                .map((v,i)=>({i,v}))
                .filter(({i,v}) => v>0 && ((metaRef.current.role==='host' && i<6) || (metaRef.current.role==='guest' && i>=6)))
                .map(o=> o.i),
            }}
            onPit={handlePitClick}
          />
        </div>
      )}
    </div>
  );
};
