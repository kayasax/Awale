import React, { useState } from 'react';

interface Props { onSelect: (mode: 'ai' | 'online-create' | 'online-join', joinId?: string) => void; }

export const ModeSelector: React.FC<Props> = ({ onSelect }) => {
  const [joinCode, setJoinCode] = useState('');
  return (
    <div className="mode-selector">
      <h2>Play Awale</h2>
      <div className="modes">
        <button className="btn primary" onClick={()=> onSelect('ai')}>Play vs AI</button>
        <button className="btn" onClick={()=> onSelect('online-create')}>Create Online Game</button>
        <div className="join-block">
          <input
            placeholder="Game Code"
            value={joinCode}
            onChange={e=> setJoinCode(e.target.value.trim())}
            aria-label="Enter game code to join"
            className="code-input"
          />
          <button className="btn" disabled={!joinCode} onClick={()=> onSelect('online-join', joinCode)}>Join Online Game</button>
        </div>
      </div>
      <p className="note">Online mode is experimental (feature branch). AI mode unchanged.</p>
    </div>
  );
};
