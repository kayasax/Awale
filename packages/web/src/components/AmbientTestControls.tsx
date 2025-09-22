import React, { useState, useEffect } from 'react';
import { ambientExperience, AmbientMode, AmbientScene } from '../services/ambient-experience';
import { AudioControls } from './AudioControls';

interface AmbientTestControlsProps {
  className?: string;
}

export const AmbientTestControls: React.FC<AmbientTestControlsProps> = ({ className = '' }) => {
  const [state, setState] = useState(ambientExperience.getState());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize on mount
    ambientExperience.initialize();
  }, []);

  const handleStart = async (mode: AmbientMode, scene: AmbientScene) => {
    setLoading(true);
    try {
      await ambientExperience.start(mode, scene);
      setState(ambientExperience.getState());
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    ambientExperience.stop();
    setState(ambientExperience.getState());
  };

  const handleModeChange = async (mode: AmbientMode) => {
    setLoading(true);
    try {
      await ambientExperience.changeMode(mode);
      setState(ambientExperience.getState());
    } finally {
      setLoading(false);
    }
  };

  const handleSceneChange = async (scene: AmbientScene) => {
    setLoading(true);
    try {
      await ambientExperience.changeScene(scene);
      setState(ambientExperience.getState());
    } finally {
      setLoading(false);
    }
  };

  const testEffects = () => {
    console.log('Testing sound effects...');
    setTimeout(() => ambientExperience.onSeedDrop(), 0);
    setTimeout(() => ambientExperience.onValidMove(), 500);
    setTimeout(() => ambientExperience.onSeedCapture(), 1000);
    setTimeout(() => ambientExperience.onGameStart(), 1500);
  };

  return (
    <div className={`ambient-test-controls ${className}`} style={{
      background: 'rgba(139, 69, 19, 0.05)',
      border: '1px solid rgba(139, 69, 19, 0.2)',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '600px',
      margin: '1rem 0'
    }}>
      <h2 style={{ color: '#8B4513', marginTop: 0 }}>🎵 Ambient Experience Test Controls</h2>

      {/* Current State Display */}
      <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
        <strong>Current State:</strong> {state.isPlaying ? 'Playing' : 'Stopped'} |
        Mode: {state.mode} | Scene: {state.scene}
        {state.musicTrack && <span> | Music: {state.musicTrack}</span>}
        {state.ambientTracks.length > 0 && <span> | Ambient: {state.ambientTracks.join(', ')}</span>}
      </div>

      {/* Quick Start Presets */}
      <div style={{ marginBottom: '1rem' }}>
        <h3>🚀 Quick Start Presets:</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleStart('peaceful', 'savanna')}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #8B4513', background: '#F5DEB3', cursor: 'pointer' }}
          >
            🌅 Peaceful Savanna
          </button>
          <button
            onClick={() => handleStart('meditative', 'forest')}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #8B4513', background: '#F5DEB3', cursor: 'pointer' }}
          >
            🌲 Forest Meditation
          </button>
          <button
            onClick={() => handleStart('rhythmic', 'storm')}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #8B4513', background: '#F5DEB3', cursor: 'pointer' }}
          >
            ⛈️ Storm Rhythms
          </button>
          <button
            onClick={() => handleStart('dynamic', 'nature')}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #8B4513', background: '#F5DEB3', cursor: 'pointer' }}
          >
            🎲 Dynamic Nature
          </button>
        </div>
      </div>

      {/* Manual Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Music Mode Selection */}
        <div>
          <h4>🎵 Music Mode:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(['peaceful', 'rhythmic', 'meditative', 'dynamic'] as AmbientMode[]).map(mode => (
              <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="mode"
                  value={mode}
                  checked={state.mode === mode}
                  onChange={() => handleModeChange(mode)}
                  disabled={loading}
                />
                <span style={{ textTransform: 'capitalize' }}>{mode}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ambient Scene Selection */}
        <div>
          <h4>🌿 Ambient Scene:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(['savanna', 'forest', 'storm', 'nature', 'minimal'] as AmbientScene[]).map(scene => (
              <label key={scene} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scene"
                  value={scene}
                  checked={state.scene === scene}
                  onChange={() => handleSceneChange(scene)}
                  disabled={loading}
                />
                <span style={{ textTransform: 'capitalize' }}>{scene}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleStart(state.mode, state.scene)}
          disabled={loading || state.isPlaying}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: state.isPlaying ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.isPlaying ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Starting...' : '▶️ Start Experience'}
        </button>

        <button
          onClick={handleStop}
          disabled={loading || !state.isPlaying}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: !state.isPlaying ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !state.isPlaying ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          ⏹️ Stop Experience
        </button>

        <button
          onClick={testEffects}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔊 Test Effects
        </button>
      </div>

      {/* Audio Controls */}
      <div style={{ marginTop: '1rem' }}>
        <AudioControls />
      </div>

      {/* Development Note */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '4px',
        fontSize: '0.9em',
        color: '#1976D2',
        border: '1px solid rgba(33, 150, 243, 0.3)'
      }}>
        <strong>🛠️ Development Note:</strong> This is using placeholder audio (silence) since actual audio files aren't included in the repository.
        In production, you would add actual Afrobeat music tracks, nature sounds, and game effect sounds to the <code>/public/audio/</code> directories.
        The system is fully functional and will automatically switch to real audio files when they're available.
      </div>
    </div>
  );
};