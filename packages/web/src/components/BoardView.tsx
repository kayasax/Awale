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
  canPlay?: boolean;
  prev?: number[];
  lastMovePit?: number;
  captured?: number[];
  pitRefs?: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

export const BoardView = React.forwardRef<HTMLDivElement, BoardViewProps>(({ 
  state, 
  onPit, 
  canPlay = true, 
  prev, 
  lastMovePit, 
  captured = [], 
  pitRefs 
}, ref) => {
  const { pits, legal = [], interactiveSide, currentPlayer, ended } = state;
  
  // Use props for lastMovePit and captured, falling back to state
  const effectiveLastMovePit = lastMovePit ?? state.lastMovePit;
  const effectiveCaptured = captured.length > 0 ? captured : (state.capturedPits || []);
  
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
    if (!canPlay) return false;
    return legal.includes(p);
  }
  
  return (
    <div className="board" ref={ref}>
      <div className="row opponent">
        {topRow.map(cell => (
          <Pit 
            key={cell.pit} 
            pitRef={pitRefs ? (el) => pitRefs.current[cell.pit] = el : undefined}
            label={cell.pit} 
            seeds={cell.seeds} 
            disabled 
            lastMove={cell.pit===effectiveLastMovePit} 
            captured={effectiveCaptured.includes(cell.pit)} 
            delta={prev ? cell.seeds - prev[cell.pit] : 0}
          />
        ))}
      </div>
      <div className="row player">
        {bottomRow.map(cell => (
          <Pit 
            key={cell.pit} 
            pitRef={pitRefs ? (el) => pitRefs.current[cell.pit] = el : undefined}
            label={cell.pit} 
            seeds={cell.seeds} 
            disabled={!canPit(cell.pit)} 
            highlight={canPit(cell.pit)} 
            lastMove={cell.pit===effectiveLastMovePit} 
            captured={effectiveCaptured.includes(cell.pit)} 
            delta={prev ? cell.seeds - prev[cell.pit] : 0}
            onClick={()=> canPit(cell.pit) && onPit?.(cell.pit)} 
          />
        ))}
      </div>
    </div>
  );
});

interface PitProps { 
  label:number; 
  seeds:number; 
  disabled?:boolean; 
  highlight?:boolean; 
  onClick?:()=>void; 
  lastMove?:boolean; 
  captured?:boolean; 
  delta?:number;
  pitRef?: (el: HTMLButtonElement | null) => void;
}

const Pit: React.FC<PitProps> = ({ label, seeds, disabled, highlight, onClick, lastMove, captured, delta, pitRef }) => {
  const showDelta = delta && delta !== 0;
  const maxSeeds = 10;
  const seedVisuals = Array.from({length: Math.min(seeds, maxSeeds)});
  const overflow = seeds - maxSeeds;
  
  // Seed variant options for realistic diversity
  const seedVariants = [
    'seed-dark-brown',
    'seed-medium-brown', 
    'seed-light-brown',
    'seed-speckled-tan',
    'seed-stone-gray'
  ];
  
  // Generate consistent seed variants based on pit position and seed index
  const getSeedVariant = (seedIndex: number) => {
    const variantIndex = (label + seedIndex) % seedVariants.length;
    return seedVariants[variantIndex];
  };
  
  // Android-safe touch handling
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!disabled && onClick) {
      e.currentTarget.classList.add('pressed');
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('pressed');
  };
  
  const handleTouchCancel = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('pressed');
  };
  
  return (
    <button 
      className={"pit" + (highlight? ' highlight':'') + (lastMove? ' last-move':'') + (captured? ' captured':'') + (showDelta? (delta>0?' gain':' loss'):'') + (seeds===0? ' empty':'')} 
      disabled={disabled} 
      onClick={onClick} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      ref={pitRef}
      aria-label={`Pit ${label} with ${seeds} seeds`}
    >
      {seeds>0 ? <span className="seeds-count" aria-hidden="true">{seeds}</span> : null}
      <span className="seeds-list" aria-hidden="true">
        {seedVisuals.map((_,i)=>(<span key={i} className={`seed ${getSeedVariant(i)}`} />))}
        {overflow > 0 && <span className="seed overflow">+{overflow}</span>}
      </span>
      {showDelta && <span className="delta" aria-hidden="true">{delta>0? '+'+delta : delta}</span>}
    </button>
  );
};
