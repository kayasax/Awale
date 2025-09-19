import React from 'react';

export interface BoardViewState {
  pits: number[]; // length 12
  lastMovePit?: number;
  capturedPits?: number[];
  legal?: number[];
  interactiveSide?: 'A' | 'B';
  ended?: boolean;
  currentPlayer?: 'A' | 'B';
}

interface BoardViewProps {
  state: BoardViewState;
  onPit?(pit: number): void;
}

export const BoardView: React.FC<BoardViewProps> = ({ state, onPit }) => {
  const { pits, legal = [], lastMovePit, capturedPits = [], interactiveSide, currentPlayer, ended } = state;
  
  // Determine board perspective - Player B should see their pits (6-11) at the bottom
  const playerIsB = interactiveSide === 'B';
  
  // Configure rows based on player perspective
  let topRow, bottomRow;
  if (playerIsB) {
    // Player B perspective: their pits (6-11) at bottom, opponent pits (0-5) at top
    topRow = pits.slice(0,6).map((v,i)=>({ pit: i, seeds: v })).reverse(); // Opponent (A) pits, reversed for visual layout
    bottomRow = pits.slice(6,12).map((v,i)=>({ pit: 6+i, seeds: v })); // Player B pits
  } else {
    // Player A perspective: their pits (0-5) at bottom, opponent pits (6-11) at top
    topRow = pits.slice(6,12).map((v,i)=>({ pit: 6+i, seeds: v })).reverse(); // Opponent (B) pits, reversed for visual layout
    bottomRow = pits.slice(0,6).map((v,i)=>({ pit: i, seeds: v })); // Player A pits
  }
  
  function canPit(p:number){
    if (ended) return false;
    if (!onPit) return false;
    if (!interactiveSide) return false;
    if (interactiveSide==='A' && p>5) return false;
    if (interactiveSide==='B' && p<6) return false;
    if (currentPlayer && ((interactiveSide==='A' && currentPlayer!=='A') || (interactiveSide==='B' && currentPlayer!=='B'))) return false;
    return legal.includes(p);
  }
  
  return (
    <div className="board">
      <div className="row opponent">
        {topRow.map(cell => <Pit key={cell.pit} label={cell.pit} seeds={cell.seeds} disabled lastMove={cell.pit===lastMovePit} captured={capturedPits.includes(cell.pit)} />)}
      </div>
      <div className="row player">
        {bottomRow.map(cell => <Pit key={cell.pit} label={cell.pit} seeds={cell.seeds} disabled={!canPit(cell.pit)} highlight={canPit(cell.pit)} lastMove={cell.pit===lastMovePit} captured={capturedPits.includes(cell.pit)} onClick={()=> canPit(cell.pit) && onPit?.(cell.pit)} />)}
      </div>
    </div>
  );
};

interface PitProps { label:number; seeds:number; disabled?:boolean; highlight?:boolean; onClick?:()=>void; lastMove?:boolean; captured?:boolean; }
const Pit: React.FC<PitProps> = ({ label, seeds, disabled, highlight, onClick, lastMove, captured }) => {
  const maxSeeds = 10;
  const seedVisuals = Array.from({length: Math.min(seeds, maxSeeds)});
  const overflow = seeds - maxSeeds;
  return (
    <button className={"pit" + (highlight? ' highlight':'') + (lastMove? ' last-move':'') + (captured? ' captured':'') + (seeds===0? ' empty':'')} disabled={disabled} onClick={onClick} aria-label={`Pit ${label} with ${seeds} seeds`}>
      {seeds>0 ? <span className="seeds-count" aria-hidden="true">{seeds}</span> : null}
      <span className="seeds-list" aria-hidden="true">
        {seedVisuals.map((_,i)=>(<span key={i} className="seed" />))}
        {overflow > 0 && <span className="seed overflow">+{overflow}</span>}
      </span>
    </button>
  );
};
