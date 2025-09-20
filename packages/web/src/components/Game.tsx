import React, { useEffect, useState, useRef } from 'react';
import { APP_VERSION } from '../version';
import { createInitialState, applyMove, getLegalMoves, formatBoard } from '../../../core/src/engine';
import { greedyStrategy } from '../../../core/src/ai/greedy';
import { ProfileService } from '../services/profile';
import type { GameState } from '../../../shared/src/types';

interface ViewState {
  state: GameState;
  thinking: boolean; // retained for AI sequencing, but no overlay now
  message: string;
  lastMovePit?: number;
  prevPits?: number[];
  lastCapturedPits?: number[];
}

interface GameProps { onExit?: () => void }
export const Game: React.FC<GameProps> = ({ onExit }) => {
  const [view, setView] = useState<ViewState>(() => ({
    state: createInitialState(),
    thinking: false,
    message: 'Your turn — choose a pit (0-5)',
    prevPits: undefined,
    lastMovePit: undefined,
    lastCapturedPits: []
  }));

  // Get player profile
  const playerProfile = ProfileService.getProfile();
  const playerName = playerProfile.name || 'Player';

  // Refs for animation positioning
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pitRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Animation state
  const [animating, setAnimating] = useState(false);
  const [displayPits, setDisplayPits] = useState<number[] | null>(null);
  const [handPos, setHandPos] = useState<{x:number;y:number}|null>(null);
  const [muted, setMuted] = useState(false);
  const [theme, setTheme] = useState<'dark'|'wood'>(playerProfile.preferences.theme);

  // Load user preferences on mount
  useEffect(() => {
    const profile = ProfileService.getProfile();
    setTheme(profile.preferences.theme);
    setMuted(!profile.preferences.soundEnabled);
  }, []);

  // Audio (top-level once)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioReadyRef = useRef(false);
  useEffect(() => {
    if (audioReadyRef.current) return;
    if (typeof window === 'undefined') return;
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    audioCtxRef.current = new AC();
    audioReadyRef.current = true;
    // Try to resume on first user gesture so first move produces sound
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
    const ctx = audioCtxRef.current; if (!ctx) return;
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

  const announceRef = useRef<HTMLDivElement | null>(null);

  const legal = getLegalMoves(view.state);
  const canPlay = !view.state.ended && view.state.currentPlayer === 'A' && !view.thinking && !animating;

  function restart() {
    setView({ state: createInitialState(), thinking: false, message: 'New game started!', prevPits: undefined, lastMovePit: undefined });
    setAnimating(false); setDisplayPits(null); setHandPos(null);
    setGameResultRecorded(false); // Reset for new game
  }

  function moveHandToPit(pitIndex: number) {
    if (!boardRef.current) return;
    const el = pitRefs.current[pitIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const boardRect = boardRef.current.getBoundingClientRect();
    setHandPos({ x: rect.left - boardRect.left + rect.width/2, y: rect.top - boardRect.top + rect.height/2 });
  }

  function animatePlayerMove(pit: number) {
    if (animating) return;
    const seeds = view.state.pits[pit];
    if (seeds <= 0) return;
    const order: number[] = [];
    for (let s=1; s<=seeds; s++) order.push((pit + s) % 12);
    const temp = view.state.pits.slice();
    temp[pit] = 0;
    setAnimating(true);
    setDisplayPits(temp.slice());
    moveHandToPit(pit);
    let step = 0;
    const per = 130; // ms per seed drop
    function tick() {
      if (step >= order.length) {
        // apply real move including captures
        try {
          const before = view.state.pits.slice();
          const beforeState = view.state;
          const result = applyMove(beforeState, pit);
          const newState = result.state;
          const message = result.capturedThisMove ? `Captured ${result.capturedThisMove} seeds!` : 'AI turn...';
          let capturedPits: number[] = [];
          if (result.capturedThisMove) {
            // Identify pits on opponent side that changed from >0 to 0 as heuristic
            for (let p=6;p<12;p++) if (beforeState.pits[p] > 0 && newState.pits[p] === 0) capturedPits.push(p);
          }
          setView(v => ({ ...v, prevPits: before, state: newState, thinking: true, message, lastMovePit: pit, lastCapturedPits: capturedPits }));
        } catch(e:any) {
          setView(v => ({ ...v, message: 'Invalid move: ' + e.message }));
        } finally {
          setAnimating(false);
          setHandPos(null);
          setDisplayPits(null);
        }
        return;
      }
      const target = order[step];
      temp[target] += 1;
      setDisplayPits(temp.slice());
      moveHandToPit(target);
      // Play a drop tone each seed including first (immediate feedback)
      playTone('drop');
      step++;
      setTimeout(tick, per);
    }
    // Prime immediate first tick rather than waiting full interval
    setTimeout(() => tick(), 10);
  }

  function play(pit: number) {
    if (!canPlay) return;
    animatePlayerMove(pit);
  }

  function animateAIMove(pit: number) {
    if (animating) return;
    const seeds = view.state.pits[pit];
    if (seeds <= 0) return;
    const order: number[] = [];
    for (let s=1; s<=seeds; s++) order.push((pit + s) % 12);
    const temp = view.state.pits.slice();
    temp[pit] = 0;
    setAnimating(true);
    setDisplayPits(temp.slice());
    moveHandToPit(pit);
    let step = 0;
    const per = 140;
    function tick() {
      if (step >= order.length) {
        try {
          const before = view.state.pits.slice();
          const beforeState = view.state;
          const result = applyMove(beforeState, pit);
          const newState = result.state;
          let message = result.capturedThisMove ? `AI captured ${result.capturedThisMove} seeds.` : `AI played ${pit}`;
          if (newState.ended) { message += ' | Game over.'; }
          let capturedPits: number[] = [];
          if (result.capturedThisMove) {
            for (let p=0;p<6;p++) if (beforeState.pits[p] > 0 && newState.pits[p] === 0) capturedPits.push(p);
          }
          setView(v => ({ ...v, prevPits: before, state: newState, thinking: false, message, lastMovePit: pit, lastCapturedPits: capturedPits }));
          if (result.capturedThisMove) playTone('capture');
          if (newState.ended) playTone('end');
        } catch(e:any) {
          setView(v => ({ ...v, thinking:false, message: 'AI error: ' + e.message }));
        } finally {
          setAnimating(false);
          setHandPos(null);
          setDisplayPits(null);
        }
        return;
      }
      const target = order[step];
      temp[target] += 1;
      setDisplayPits(temp.slice());
      moveHandToPit(target);
      playTone('drop');
      step++;
      setTimeout(tick, per);
    }
    setTimeout(tick, per);
  }

  // AI turn effect with animation
  useEffect(() => {
    if (view.state.ended) return;
    if (!animating && view.state.currentPlayer === 'B') {
      const t = setTimeout(() => {
        try {
          const aiMove = greedyStrategy.chooseMove(view.state);
          animateAIMove(aiMove);
        } catch(e:any) {
            setView(v => ({ ...v, thinking:false, message: 'AI error: ' + e.message }));
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [view.state, animating]);

  // Announce changes politely for screen readers
  useEffect(() => {
    if (!announceRef.current) return;
    announceRef.current.textContent = view.message;
  }, [view.message]);

  // Update CSS vars for hand position relative to board
  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const container = boardEl.parentElement; // board-shell
    if (!container) return;
    if (!handPos) {
      container.style.removeProperty('--hand-x');
      container.style.removeProperty('--hand-y');
      return;
    }
    container.style.setProperty('--hand-x', handPos.x + 'px');
    container.style.setProperty('--hand-y', handPos.y + 'px');
  }, [handPos]);

  // Hand only visible during an active sowing animation now
  useEffect(() => {
    if (!animating) setHandPos(null);
  }, [animating]);

  // Game result tracking - record statistics when game ends
  const [gameStartTime] = useState(Date.now());
  const [gameResultRecorded, setGameResultRecorded] = useState(false);
  
  useEffect(() => {
    if (view.state.ended && !gameResultRecorded) {
      const gameEndTime = Date.now();
      const gameDuration = (gameEndTime - gameStartTime) / 1000; // Convert to seconds
      
      const gameResult = {
        won: view.state.winner === 'A',
        seedsCaptured: view.state.captured.A,
        gameDuration,
        opponent: 'AI',
        timestamp: gameEndTime
      };
      
      try {
        ProfileService.recordGameResult(gameResult);
        console.log('🎮 Game result recorded:', gameResult);
      } catch (error) {
        console.error('Failed to record game result:', error);
      }
      
      setGameResultRecorded(true);
    }
  }, [view.state.ended, view.state.winner, view.state.captured.A, gameStartTime, gameResultRecorded]);

  const score = `${playerName}: ${view.state.captured.A} | AI: ${view.state.captured.B}`;
  const winner = view.state.ended ? (view.state.winner === 'A' ? `${playerName} wins!` : view.state.winner === 'B' ? 'AI wins.' : 'Draw.') : '';

  // Apply background image via CSS variable to satisfy lint rule
  const containerClass = "awale-container theme-"+theme;
  return (
  <div className={containerClass}>
      <header className="topbar">
        <h1 className="logo">Awale</h1>
        <div className="scorepanel" role="group" aria-label="Scores">
          <div className="scores"><span className="score you" aria-label={`${playerName} score`}>{playerName} <strong>{view.state.captured.A}</strong></span><span className="score ai" aria-label="AI score">AI <strong>{view.state.captured.B}</strong></span></div>
          <div className="turn">Turn: <strong>{view.state.currentPlayer === 'A' ? playerName : 'AI'}</strong></div>
          {winner && <div className="winner" role="status">{winner}</div>}
          <div className="msg" role="status">{view.message}</div>
        </div>
        <div className="controls">
          {onExit && <button className="btn" onClick={onExit}>Home</button>}
          <button className="btn" onClick={restart}>New Game</button>
          <button className="btn" onClick={() => alert(rulesText)}>Rules</button>
          <button className="btn mute" onClick={()=> setMuted((m:boolean)=> !m)} data-state={muted? 'off':'on'} aria-label={muted? 'Sound is muted, click to unmute':'Sound is on, click to mute'} title="Toggle sound">{muted? 'Unmute' : 'Mute'}</button>
          <button className="btn" onClick={()=> setTheme(t=> t==='dark'?'wood':'dark')} aria-pressed={theme==='wood'} title="Toggle wood theme">{theme==='wood' ? 'Dark Mode' : 'Wood Theme'}</button>
        </div>
      </header>
      <div className="board-shell">
        <Board
          ref={boardRef}
          pitRefs={pitRefs}
          state={view.state}
          displayPits={displayPits}
          canPlay={canPlay}
          onPlay={play}
          legal={legal}
          prev={view.prevPits}
          lastMovePit={view.lastMovePit}
          captured={view.lastCapturedPits}
        />
  {animating && handPos && <div className="hand" aria-hidden="true">✋</div>}
      </div>

      {/* Removed debug ASCII board */}
      <div aria-live="polite" className="sr-only" ref={announceRef} />
      <footer className="site-footer" aria-label="Credits and version">
        <span className="app-name">Awale</span>
        <span className="version">v{APP_VERSION}</span>
        <span className="sep" aria-hidden="true">•</span>
        <span className="credits">Greedy AI demo – captures & sowing animations</span>
        <span className="sep" aria-hidden="true">•</span>
        <span className="author">by <a href="https://github.com/kayasax/Awale" target="_blank" rel="noopener noreferrer">kayasax</a></span>
      </footer>
    </div>
  );
};

const rulesText = `Goal: capture the most seeds (25+ to win).\nYour pits are 0-5 (bottom). Type the pit number or click its button. Seeds sow counter-clockwise; capture when ending in opponent side with 2-3 seeds.`;

interface BoardProps { state: GameState; canPlay: boolean; onPlay: (pit:number)=>void; legal:number[]; prev?: number[]; lastMovePit?: number; displayPits?: number[] | null; pitRefs: React.MutableRefObject<(HTMLButtonElement|null)[]>; captured?: number[]; }
const Board = React.forwardRef<HTMLDivElement, BoardProps>(({ state, canPlay, onPlay, legal, prev, lastMovePit, displayPits, pitRefs, captured }, ref) => {
  // pits 6-11 (AI) top row reversed for natural view
  const aiRow = state.pits.slice(6,12).map((v,i)=>({ pit: 6+i, seeds: v })).reverse();
  const playerRow = state.pits.slice(0,6).map((v,i)=>({ pit: i, seeds: v }));
  return (
    <div className="board" ref={ref}>
      <div className="row ai">
  {aiRow.map(cell => <Pit key={cell.pit} pitRef={(el)=> pitRefs.current[cell.pit]=el} label={cell.pit} seeds={displayPits? displayPits[cell.pit] : cell.seeds} disabled lastMove={cell.pit===lastMovePit} captured={captured?.includes(cell.pit)} delta={prev? (displayPits? displayPits[cell.pit]-prev[cell.pit] : cell.seeds - prev[cell.pit]) : 0} />)}
      </div>
      <div className="row player">
        {playerRow.map(cell => (
          <Pit
            key={cell.pit}
            pitRef={(el)=> pitRefs.current[cell.pit]=el}
            label={cell.pit}
            seeds={displayPits? displayPits[cell.pit] : cell.seeds}
            disabled={!canPlay || !legal.includes(cell.pit)}
            highlight={legal.includes(cell.pit) && canPlay}
            lastMove={cell.pit===lastMovePit}
            delta={prev? (displayPits? displayPits[cell.pit]-prev[cell.pit] : cell.seeds - prev[cell.pit]) : 0}
            captured={captured?.includes(cell.pit)}
            onClick={() => onPlay(cell.pit)}
          />
        ))}
      </div>
    </div>
  );
});

interface PitProps { label:number; seeds:number; disabled?:boolean; highlight?:boolean; onClick?:()=>void; lastMove?:boolean; delta?:number; pitRef?:(el:HTMLButtonElement|null)=>void; captured?:boolean; }
const Pit: React.FC<PitProps> = ({ label, seeds, disabled, highlight, onClick, lastMove, delta, pitRef, captured }) => {
  const showDelta = delta && delta !== 0;
  const maxSeeds = 10;
  const seedVisuals = Array.from({length: Math.min(seeds, maxSeeds)});
  const overflow = seeds - maxSeeds;
  return (
    <button
  className={"pit" + (highlight ? ' highlight' : '') + (lastMove? ' last-move':'') + (captured? ' captured':'') + (showDelta? (delta>0?' gain':' loss'):'') + (seeds===0 ? ' empty':'')}
      disabled={disabled}
      onClick={onClick}
      ref={pitRef}
      aria-label={`Pit ${label} with ${seeds} seeds`}
    >
  {seeds>0 ? <span className="seeds-count" aria-hidden="true">{seeds}</span> : null}
      <span className="seeds-list" aria-hidden="true">
        {seedVisuals.map((_,i)=>(<span key={i} className="seed" />))}
        {overflow > 0 && <span className="seed overflow">+{overflow}</span>}
      </span>
      {showDelta && <span className="delta" aria-hidden="true">{delta>0? '+'+delta : delta}</span>}
      {/* index removed for visual polish; retained in aria-label */}
    </button>
  );
};
