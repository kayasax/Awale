import React, { useState } from 'react';
import { ProfileBar } from './ProfileBar';
import { APP_VERSION } from '../version';

interface Props { onSelect: (mode: 'ai' | 'lobby' | 'online-create' | 'online-join', joinId?: string) => void; }

export const ModeSelector: React.FC<Props> = ({ onSelect }) => {
  const [joinCode, setJoinCode] = useState('');
  return (
    <div className="mode-selector">
      <ProfileBar className="mode-selector-profile" />
      <h2>Play Awale</h2>
      <div className="modes">
        <button className="btn primary" onClick={()=> onSelect('ai')}>Play vs AI</button>
        <button className="btn" onClick={()=> onSelect('lobby')}>🌐 Join Lobby</button>
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
      <p className="note">🌐 Lobby: Find players and chat in real-time. Online mode is experimental (feature branch).</p>
      <div className="version-info">v{APP_VERSION}</div>
    </div>
  );
};
