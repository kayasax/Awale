import React, { useEffect, useState } from 'react';
import { createInitialState, applyMove, getLegalMoves, formatBoard } from '../../../core/src/engine';
import { greedyStrategy } from '../../../core/src/ai/greedy';
import type { GameState } from '../../../shared/src/types';

interface ViewState {
  state: GameState;
  thinking: boolean;
  message: string;
}

export const Game: React.FC = () => {
  const [view, setView] = useState<ViewState>(() => ({
    state: createInitialState(),
    thinking: false,
    message: 'Your turn — choose a pit (0-5)'
  }));

  const legal = getLegalMoves(view.state);
  const canPlay = !view.state.ended && view.state.currentPlayer === 'A' && !view.thinking;

  function restart() {
    setView({ state: createInitialState(), thinking: false, message: 'New game started!' });
  }

  function play(pit: number) {
    if (!canPlay) return;
    try {
      const result = applyMove(view.state, pit);
      let newState = result.state;
      let message = result.capturedThisMove ? `Captured ${result.capturedThisMove} seeds!` : 'AI thinking...';
      setView(v => ({ ...v, state: newState, thinking: true, message }));
    } catch (e:any) {
      setView(v => ({ ...v, message: 'Invalid move: ' + e.message }));
    }
  }

  // AI turn effect
  useEffect(() => {
    if (view.state.ended) return;
    if (view.state.currentPlayer === 'B') {
      const t = setTimeout(() => {
        const aiMove = greedyStrategy.chooseMove(view.state);
        const result = applyMove(view.state, aiMove);
        const newState = result.state;
        let message = result.capturedThisMove ? `AI captured ${result.capturedThisMove} seeds.` : `AI played ${aiMove}`;
        if (newState.ended) {
          message += ' | Game over.';
        }
        setView(v => ({ ...v, state: newState, thinking: false, message }));
      }, 700);
      return () => clearTimeout(t);
    }
  }, [view.state]);

  const score = `You: ${view.state.captured.A} | AI: ${view.state.captured.B}`;
  const winner = view.state.ended ? (view.state.winner === 'A' ? 'You win!' : view.state.winner === 'B' ? 'AI wins.' : 'Draw.') : '';

  return (
    <div className="awale-container">
      <header>
        <h1>Awale</h1>
        <div className="status">Turn: {view.state.currentPlayer} | {score}</div>
        {winner && <div className="winner">{winner}</div>}
        <div className="message">{view.message}</div>
        <div className="actions">
          <button onClick={restart}>New Game</button>
          <button onClick={() => alert(rulesText)}>Rules</button>
        </div>
      </header>

      <Board state={view.state} canPlay={canPlay} onPlay={play} legal={legal} />

      <pre className="board-text">
{formatBoard(view.state)}
</pre>
    </div>
  );
};

const rulesText = `Goal: capture the most seeds (25+ to win).\nYour pits are 0-5 (bottom). Type the pit number or click its button. Seeds sow counter-clockwise; capture when ending in opponent side with 2-3 seeds.`;

interface BoardProps { state: GameState; canPlay: boolean; onPlay: (pit:number)=>void; legal:number[]; }
const Board: React.FC<BoardProps> = ({ state, canPlay, onPlay, legal }) => {
  // pits 6-11 (AI) top row reversed for natural view
  const aiRow = state.pits.slice(6,12).map((v,i)=>({ pit: 6+i, seeds: v })).reverse();
  const playerRow = state.pits.slice(0,6).map((v,i)=>({ pit: i, seeds: v }));
  return (
    <div className="board">
      <div className="row ai">
        {aiRow.map(cell => <Pit key={cell.pit} label={cell.pit} seeds={cell.seeds} disabled />)}
      </div>
      <div className="row player">
        {playerRow.map(cell => (
          <Pit
            key={cell.pit}
            label={cell.pit}
            seeds={cell.seeds}
            disabled={!canPlay || !legal.includes(cell.pit)}
            highlight={legal.includes(cell.pit) && canPlay}
            onClick={() => onPlay(cell.pit)}
          />
        ))}
      </div>
    </div>
  );
};

interface PitProps { label:number; seeds:number; disabled?:boolean; highlight?:boolean; onClick?:()=>void; }
const Pit: React.FC<PitProps> = ({ label, seeds, disabled, highlight, onClick }) => (
  <button
    className={"pit" + (highlight ? ' highlight' : '')}
    disabled={disabled}
    onClick={onClick}
    aria-label={`Pit ${label} with ${seeds} seeds`}
  >
    <span className="seeds">{seeds}</span>
    <span className="index">{label}</span>
  </button>
);
