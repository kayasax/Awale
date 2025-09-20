import React, { useEffect, useRef, useState } from 'react';
import { OnlineClient } from '../online/connection';
import { ProfileService } from '../services/profile';
import type { GameStateSnapshot, ServerToClient } from '../online/protocol';
import { Game } from './Game';
import { BoardView } from './BoardView';

interface Props {
  mode: 'online-create' | 'online-join';
  code?: string; // Provided when joining
  name?: string;
  playerName?: string; // Consistent player name
  playerId?: string;   // Unique persistent player ID
  onExit: () => void;
  serverUrl: string;
}

interface LocalMeta {
  role?: 'host' | 'guest';
  gameId?: string;
  playerToken?: string;
}

// Animation and audio state for visual polish
interface AnimationState {
  animating: boolean;
  displayPits: number[] | null;
  handPos: {x: number; y: number} | null;
  lastMovePit?: number;
  lastCapturedPits: number[];
  prevPits?: number[];
}

// Reuse local Game component for rendering board, but we'll override state transitions later.
export const OnlineGame: React.FC<Props> = ({ 
  mode, 
  code, 
  name: propName, 
  playerName, 
  playerId, 
  onExit, 
  serverUrl 
}) => {
  // Get player profile and use the actual player name
  const profile = ProfileService.getProfile();
  const finalPlayerName = playerName || propName || profile.name || 'Player';
  const finalPlayerId = playerId || profile.id;
  
  const clientRef = useRef<OnlineClient | null>(null);
  const metaRef = useRef<LocalMeta>({});
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pitRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Track reconnection attempts to prevent infinite loop
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  // State
  const [meta, setMeta] = useState<LocalMeta>({});
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null);
  const [message, setMessage] = useState<string>('Connecting...');
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [pendingMove, setPendingMove] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [muted, setMuted] = useState(false);
  const [theme, setTheme] = useState<'dark'|'wood'>(profile.preferences.theme);
  const [bothPlayersConnected, setBothPlayersConnected] = useState(false);
  
  // Load user preferences on mount
  useEffect(() => {
    const userProfile = ProfileService.getProfile();
    setTheme(userProfile.preferences.theme);
    setMuted(!userProfile.preferences.soundEnabled);
  }, []);
  
  // Animation state for visual polish
  const [animState, setAnimState] = useState<AnimationState>({
    animating: false,
    displayPits: null,
    handPos: null,
    lastMovePit: undefined,
    lastCapturedPits: [],
    prevPits: undefined
  });

  // Game result tracking
  const [gameStartTime] = useState(Date.now());
  const [gameResultRecorded, setGameResultRecorded] = useState(false);

  // Audio system (matching single-player)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioReadyRef = useRef(false);
  
  // Helper function to set messages with success state
  const setSuccessMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setIsSuccessMessage(true);
    setTimeout(() => {
      setIsSuccessMessage(false);
      if (!bothPlayersConnected) {
        setMessage('Waiting for opponent to join...');
      }
    }, duration);
  };

  const setRegularMessage = (msg: string) => {
    setMessage(msg);
    setIsSuccessMessage(false);
  };
  
  useEffect(() => {
    if (audioReadyRef.current) return;
    if (typeof window === 'undefined') return;
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    audioCtxRef.current = new AC();
    audioReadyRef.current = true;
    // Resume audio context on first user interaction
    const unlock = () => {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(()=>{});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }, []);

  function playTone(kind: 'drop'|'capture'|'end') {
    if (muted) return;
    const ctx = audioCtxRef.current; 
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    let freq = 480;
    let dur = 0.18;
    let type: OscillatorType = 'sine';
    if (kind==='capture'){ freq=520; dur=0.35; type='sine'; }
    else if (kind==='end'){ freq=340; dur=0.9; type='sine'; }
    else { freq = 470 + Math.random()*25; dur=0.14; type='sine'; }
    osc.type = type;
    osc.frequency.value = freq;
    // Gentle attack & release
    const peak = kind==='end' ? 0.12 : kind==='capture' ? 0.09 : 0.06;
    gain.gain.setValueAtTime(0.00001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function moveHandToPit(pitIndex: number) {
    if (!boardRef.current) return;
    const el = pitRefs.current[pitIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const boardRect = boardRef.current.getBoundingClientRect();
    setAnimState(prev => ({
      ...prev,
      handPos: { 
        x: rect.left - boardRect.left + rect.width/2, 
        y: rect.top - boardRect.top + rect.height/2 
      }
    }));
  }

  useEffect(() => {
    // Prevent multiple connections in React StrictMode
    if (clientRef.current) {
      clientRef.current.close();
    }
    
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
          setRegularMessage(`Game created. Share code: ${msg.gameId}. Waiting for opponent...`);
          setBothPlayersConnected(false); // Host created, waiting for guest
          break;
        case 'joined':
          const joinedMeta = { ...metaRef.current, gameId: msg.gameId, role: metaRef.current.role || msg.role };
          metaRef.current = joinedMeta;
          setMeta(joinedMeta);
          if (msg.opponent) {
            setOpponentName(msg.opponent); // Store opponent name
          }
          setRegularMessage(`Opponent: ${msg.opponent}. Game ready!`);
          setBothPlayersConnected(true); // Both players now connected
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
          // Animate all moves and handle capture effects for both players
          if (snapshot && msg.pit !== undefined) {
            // Always animate moves for both players
            animateMove(msg.pit, snapshot.pits);
            
            const prevPits = snapshot.pits.slice();
            const capturedCount = msg.captured || 0;
            
            // Detect captured pits for visual effects
            let capturedPits: number[] = [];
            if (capturedCount > 0) {
              // Simple heuristic: find pits that went from >0 to 0 on opponent side
              const opponentSide = msg.player === 'host' ? [6,7,8,9,10,11] : [0,1,2,3,4,5];
              capturedPits = opponentSide.filter(p => prevPits[p] > 0 && prevPits[p] === 0);
            }
            
            setAnimState(prev => ({ 
              ...prev, 
              prevPits,
              lastMovePit: msg.pit,
              lastCapturedPits: capturedPits
            }));
            
            // Play sounds for all moves
            playTone('drop');
            if (capturedCount > 0) {
              setTimeout(() => playTone('capture'), 200);
            }
          }
          // Show actual player name instead of 'host'/'guest'
          const playerName = msg.player === ourRole ? finalPlayerName : opponentName;
          setRegularMessage(`${playerName} played pit ${msg.pit}${msg.captured? ' (captured '+msg.captured+')':''}`);
          break;
        case 'gameEnded':
          setSnapshot(msg.final);
          setRegularMessage('Game over.');
          playTone('end');
          break;
        case 'error':
          console.error('❌ Server error:', msg);
          
          // Handle "game full" with limited auto-reconnection attempts
          if (msg.message && msg.message.toLowerCase().includes('full') && finalPlayerId) {
            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current++;
              console.log(`🔄 Game full error detected, attempting reconnection ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} with same playerId...`);
              setError(`Game full - attempting to reconnect as existing player... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
              
              // Retry connection after short delay with same playerId
              setTimeout(() => {
                console.log('🔄 Retrying connection to potentially rejoin as existing player');
                if (mode === 'online-join' && code) {
                  client.send({ type: 'join', gameId: code, name: finalPlayerName, playerId: finalPlayerId, reconnect: true });
                }
              }, 2000);
              
            } else {
              console.log('❌ Max reconnection attempts reached, giving up');
              setError(`Game full - Unable to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts. The server may not support reconnection yet.`);
            }
          } else {
            setError(msg.message);
          }
          break;
      }
    });
    client.connect();
    // Initiate with persistent player ID for reconnection
    console.log('🚀 Initiating connection, mode:', mode, 'code:', code, 'finalPlayerName:', finalPlayerName, 'finalPlayerId:', finalPlayerId);
    if (mode === 'online-create') {
      console.log('📤 Sending create message with playerId for reconnection support');
      client.send({ type: 'create', name: finalPlayerName, playerId: finalPlayerId });
    } else if (mode === 'online-join' && code) {
      console.log('📤 Sending join message for gameId:', code, 'with playerId for reconnection');
      client.send({ type: 'join', gameId: code, name: finalPlayerName, playerId: finalPlayerId });
    }
    return () => { off(); client.close(); };
  }, [mode, code, finalPlayerName, finalPlayerId, serverUrl]);

  // Update CSS vars for hand position relative to board
  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const container = boardEl.parentElement; // board-shell
    if (!container) return;
    if (!animState.handPos) {
      container.style.removeProperty('--hand-x');
      container.style.removeProperty('--hand-y');
      return;
    }
    container.style.setProperty('--hand-x', animState.handPos.x + 'px');
    container.style.setProperty('--hand-y', animState.handPos.y + 'px');
  }, [animState.handPos]);

  // Clean up hand position when not animating
  useEffect(() => {
    if (!animState.animating) {
      setAnimState(prev => ({ ...prev, handPos: null }));
    }
  }, [animState.animating]);

  // Game result tracking - record statistics when multiplayer game ends
  useEffect(() => {
    if (snapshot?.ended && !gameResultRecorded) {
      const gameEndTime = Date.now();
      const gameDuration = (gameEndTime - gameStartTime) / 1000; // Convert to seconds
      
      const ourRole = metaRef.current.role;
      const isWinner = ourRole && snapshot.winner === (ourRole === 'host' ? 'A' : 'B');
      const ourScore = ourRole === 'host' ? snapshot.captured.A : snapshot.captured.B;
      
      const gameResult = {
        won: isWinner,
        seedsCaptured: ourScore,
        gameDuration,
        opponent: 'Human', // Multiplayer opponent
        timestamp: gameEndTime
      };
      
      try {
        ProfileService.recordGameResult(gameResult);
        console.log('🎮 Multiplayer game result recorded:', gameResult);
      } catch (error) {
        console.error('Failed to record multiplayer game result:', error);
      }
      
      setGameResultRecorded(true);
    }
  }, [snapshot?.ended, snapshot?.winner, snapshot?.captured, gameStartTime, gameResultRecorded]);

  function animateMove(pit: number, finalPits: number[]) {
    if (animState.animating) return;
    if (!snapshot) return;
    
    const seeds = snapshot.pits[pit];
    if (seeds <= 0) return;
    
    const order: number[] = [];
    for (let s=1; s<=seeds; s++) order.push((pit + s) % 12);
    
    const temp = snapshot.pits.slice();
    temp[pit] = 0;
    
    setAnimState(prev => ({
      ...prev,
      animating: true,
      displayPits: temp.slice(),
      prevPits: snapshot.pits.slice()
    }));
    
    moveHandToPit(pit);
    
    let step = 0;
    const per = 130; // ms per seed drop
    
    function tick() {
      if (step >= order.length) {
        // Animation complete - update to final state
        setAnimState(prev => ({
          ...prev,
          animating: false,
          displayPits: null,
          handPos: null,
          lastMovePit: pit
        }));
        return;
      }
      
      const target = order[step];
      temp[target] += 1;
      setAnimState(prev => ({
        ...prev,
        displayPits: temp.slice()
      }));
      
      moveHandToPit(target);
      playTone('drop');
      step++;
      setTimeout(tick, per);
    }
    
    // Start animation
    setTimeout(() => tick(), 10);
  }

  // Translate local player perspective to pit clicks
  function handlePitClick(pit: number) {
    const currentMeta = metaRef.current;
    console.log('🎯 Pit click attempt:', { pit, currentMeta, snapshot: !!snapshot, bothPlayersConnected });
    
    if (!snapshot || !currentMeta.gameId) {
      console.log('🚫 Cannot play: missing snapshot or gameId', { snapshot: !!snapshot, gameId: currentMeta.gameId });
      return;
    }
    
    // Check if both players are connected
    if (!bothPlayersConnected) {
      console.log('🚫 Cannot play: waiting for opponent to join');
      setMessage('Waiting for opponent to join...');
      return;
    }
    
    if (pendingMove !== null) {
      console.log('🚫 Cannot play: move pending');
      return;
    }
    
    if (animState.animating) {
      console.log('🚫 Cannot play: animation in progress');
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
    
    // Start local animation immediately for responsiveness
    if (snapshot) {
      const tempSnapshot = { ...snapshot };
      animateMove(pit, snapshot.pits);
    }
    
    clientRef.current?.send({ type: 'move', gameId: currentMeta.gameId, pit });
    setPendingMove(pit);
    setTimeout(()=> setPendingMove(null), 600);
  }

  // Calculate scores and winner
  const ourRole = metaRef.current.role;
  const ourScore = snapshot ? (ourRole === 'host' ? snapshot.captured.A : snapshot.captured.B) : 0;
  const opponentScore = snapshot ? (ourRole === 'host' ? snapshot.captured.B : snapshot.captured.A) : 0;
  const winner = snapshot?.ended ? 
    (snapshot.winner === (ourRole === 'host' ? 'A' : 'B') ? `${finalPlayerName} wins!` : 
     snapshot.winner === (ourRole === 'host' ? 'B' : 'A') ? `${opponentName} wins!` : 
     'Draw.') : '';

  // Copy invitation function
  const copyInvitation = async () => {
    if (!meta.gameId) return;
    
    const currentUrl = window.location.origin + window.location.pathname;
    const invitationMessage = `🎮 Join me for an Awale game!

Game Code: ${meta.gameId}
Direct Link: ${currentUrl}#join-${meta.gameId}

Click the link or go to ${currentUrl} and enter the game code to play!`;

    try {
      await navigator.clipboard.writeText(invitationMessage);
      setSuccessMessage('🎉 Invitation copied to clipboard! Share it with your friend.');
      playTone('capture'); // Play a pleasant sound for successful copy
    } catch (err) {
      console.error('Failed to copy invitation:', err);
      setRegularMessage('❌ Failed to copy invitation');
    }
  };

  // Copy URL only function
  const copyUrl = async () => {
    if (!meta.gameId) return;
    
    const currentUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${currentUrl}#join-${meta.gameId}`;

    try {
      await navigator.clipboard.writeText(joinUrl);
      setSuccessMessage('🔗 Game URL copied to clipboard!');
      playTone('capture'); // Play a pleasant sound for successful copy
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setRegularMessage('❌ Failed to copy URL');
    }
  };

  const containerClass = "awale-container theme-"+theme;
  
  return (
    <div className={containerClass}>
      <header className="topbar">
        <h1 className="logo">Awale Online</h1>
        <div className="scorepanel" role="group" aria-label="Scores">
          <div className="scores">
            <span className="score you" aria-label={`${finalPlayerName} score`}>{finalPlayerName} <strong>{ourScore}</strong></span>
            <span className="score ai" aria-label="Opponent score">{opponentName} <strong>{opponentScore}</strong></span>
          </div>
          <div className="turn">
            Turn: <strong>
              {snapshot ? 
                (snapshot.currentPlayer === (ourRole === 'host' ? 'A' : 'B') ? finalPlayerName : opponentName)
                : 'Connecting...'}
            </strong>
          </div>
          {winner && <div className="winner" role="status">{winner}</div>}
          <div className={`msg ${isSuccessMessage ? 'success' : ''}`} role="status">{message}</div>
          {meta.gameId && (
            <div className="code-display">
              <div>Game Code: <code>{meta.gameId}</code></div>
              <div className="copy-buttons">
                <button 
                  className="btn copy-invite" 
                  onClick={copyInvitation}
                  title="Copy invitation message with game code and link"
                >
                  📋 Share Invite
                </button>
                <button 
                  className="btn copy-url" 
                  onClick={copyUrl}
                  title="Copy game URL only"
                >
                  🔗 Copy URL
                </button>
              </div>
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
            ref={boardRef}
            pitRefs={pitRefs}
            state={{
              pits: animState.displayPits || snapshot.pits,
              currentPlayer: snapshot.currentPlayer,
              interactiveSide: metaRef.current.role === 'host' ? 'A' : 'B',
              ended: snapshot.ended,
              // legal: server does not send legal set yet; placeholder enable all owned pits with seeds >0
              legal: snapshot.pits
                .map((v,i)=>({i,v}))
                .filter(({i,v}) => v>0 && ((metaRef.current.role==='host' && i<6) || (metaRef.current.role==='guest' && i>=6)))
                .map(o=> o.i),
            }}
            canPlay={bothPlayersConnected && !pendingMove && !animState.animating && snapshot.currentPlayer === (metaRef.current.role === 'host' ? 'A' : 'B')}
            onPit={handlePitClick}
            prev={animState.prevPits}
            lastMovePit={animState.lastMovePit}
            captured={animState.lastCapturedPits}
          />
          {animState.animating && animState.handPos && (
            <div className="hand" aria-hidden="true">✋</div>
          )}
        </div>
      )}
    </div>
  );
};
