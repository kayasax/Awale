import React, { useState, useEffect } from 'react';
import { ambientAudioService, AudioSettings } from '../services/ambient-audio';

// CSS class names mapping (converted from CSS modules)
const styles = {
  audioContainer: 'audio-container',
  audioUnavailable: 'audio-unavailable', 
  audioControlsCompact: 'audio-controls-compact',
  audioControlsCollapsed: 'audio-controls-collapsed',
  audioControls: 'audio-controls',
  audioHeader: 'audio-header',
  audioTitle: 'audio-title', 
  expandButton: 'expand-button',
  controlGroup: 'control-group',
  controlLabel: 'control-label',
  controlLabelBlock: 'control-label-block',
  controlRow: 'control-row',
  testButton: 'test-button',
  toggleButton: 'toggle-button',
  toggleButtonEnabled: 'toggle-button-enabled',
  toggleButtonDisabled: 'toggle-button-disabled',
  volumeSlider: 'volume-slider',
  compactVolumeSlider: 'compact-volume-slider',
  boldText: 'bold-text',
  testing: 'testing',
  infoBox: 'info-box'
};

interface AudioControlsProps {
  className?: string;
  compact?: boolean; // For inline controls
}

export const AudioControls: React.FC<AudioControlsProps> = ({ className = '', compact = false }) => {
  const [settings, setSettings] = useState<AudioSettings>(ambientAudioService.getSettings());
  const [isAvailable, setIsAvailable] = useState(true);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  useEffect(() => {
    setIsAvailable(ambientAudioService.isAvailable());
  }, []);

  const updateSetting = (key: keyof AudioSettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ambientAudioService.updateSettings({ [key]: value });

    // Handle re-enabling audio categories - restart if ambient experience is active
    if (value === true) {
      handleAudioReEnable(key);
    }
  };

  const handleAudioReEnable = async (key: keyof AudioSettings) => {
    try {
      const { ambientExperience } = await import('../services/ambient-experience');

      if (key === 'musicEnabled') {
        // Restart background music if it was playing
        await ambientExperience.restartBackgroundMusic();
      } else if (key === 'ambientEnabled') {
        // Restart ambient sounds if they were playing
        await ambientExperience.restartAmbientSounds();
      }
    } catch (error) {
      // Silently fail if there are issues restarting
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Test audio function
  const testAudio = async () => {
    setIsTestingAudio(true);
    try {
      // First, make sure the ambient experience is initialized and started
      const { ambientExperience } = await import('../services/ambient-experience');
      await ambientExperience.initialize();

      // Force resume audio context
      await (ambientAudioService as any).ensureAudioContextResumed();

      // Try to start the ambient experience to get background music going
      if (!ambientExperience.getState().isPlaying) {
        console.log('🎵 Starting ambient experience...');
        await ambientExperience.start('peaceful', 'savanna');
      }

      // Also test direct audio playback
      const audioContext = (ambientAudioService as any).audioContext;
      const masterGain = (ambientAudioService as any).masterGainNode;

      console.log('🎵 Testing audio - Context state:', audioContext?.state);
      console.log('🎵 Testing audio - Master volume:', masterGain?.gain?.value);
      console.log('🎵 Testing audio - Settings enabled:', settings.enabled);

      if (audioContext && masterGain && audioContext.state === 'running') {
        // Try a quick test tone to verify Web Audio API is working
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);

        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        console.log('🎵 SUCCESS: Audio context working and test tone played!');
      } else {
        console.warn('🔇 Audio context not available or not running. State:', audioContext?.state);
      }
    } catch (error) {
      console.error('Failed to play test audio:', error);
    }

    setTimeout(() => setIsTestingAudio(false), 1000);
  };

  if (!isAvailable) {
    return (
      <div className={`${styles.audioUnavailable} ${className}`}>
        <p>🔇 Audio not supported in this browser</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`${styles.audioControlsCompact} ${className}`}>
        <button
          onClick={testAudio}
          disabled={!isAvailable || isTestingAudio}
          className={`${styles.testButton} ${isTestingAudio ? styles.testing : ''}`}
          title="Test Audio System"
        >
          {isTestingAudio ? '🔊' : '🎵'} Test
        </button>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`${styles.toggleButton} ${settings.enabled ? styles.toggleButtonEnabled : styles.toggleButtonDisabled}`}
        >
          {settings.enabled ? '🔊' : '🔇'} Audio
        </button>

        {settings.enabled && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.masterVolume}
            onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
            className={styles.compactVolumeSlider}
            title="Master Volume"
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.audioContainer}>
      {!isExpanded ? (
        <div
          className={`${styles.audioControlsCollapsed} ${className}`}
          onClick={toggleExpanded}
        >
          <div className={styles.audioHeader}>
            <span className={styles.audioTitle}>🎵 Audio Settings</span>
            <span className={styles.expandButton}>▶</span>
          </div>
        </div>
      ) : (
        <div className={`${styles.audioControls} ${className}`}>
          <div className={styles.audioHeader} onClick={toggleExpanded}>
            <span className={styles.audioTitle}>🎵 Audio Settings</span>
            <span className={styles.expandButton}>▼</span>
          </div>

          {/* Master Enable/Disable */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
              />
              <span className={styles.boldText}>Enable Ambient Audio</span>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Music Volume */}
              <div className={styles.controlGroup}>
                <label className={styles.controlLabelBlock} htmlFor="music-volume">
                  🎵 Music Volume ({Math.round(settings.musicVolume * 100)}%)
                </label>
                <input
                  id="music-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                  className={styles.volumeSlider}
                  title={`Music Volume: ${Math.round(settings.musicVolume * 100)}%`}
                />
              </div>

              {/* Effects Volume */}
              <div className={styles.controlGroup}>
                <label className={styles.controlLabelBlock} htmlFor="effects-volume">
                  🔊 Effects Volume ({Math.round(settings.effectsVolume * 100)}%)
                </label>
                <input
                  id="effects-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.effectsVolume}
                  onChange={(e) => updateSetting('effectsVolume', parseFloat(e.target.value))}
                  className={styles.volumeSlider}
                  title={`Effects Volume: ${Math.round(settings.effectsVolume * 100)}%`}
                />
              </div>

              {/* Background Music */}
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>
                  <input
                    type="checkbox"
                    checked={settings.musicEnabled}
                    onChange={(e) => updateSetting('musicEnabled', e.target.checked)}
                  />
                  <span className={styles.boldText}>🎵 Background Music</span>
                </label>
              </div>

              {/* Nature Sounds */}
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>
                  <input
                    type="checkbox"
                    checked={settings.ambientEnabled}
                    onChange={(e) => updateSetting('ambientEnabled', e.target.checked)}
                  />
                  <span className={styles.boldText}>🌿 Nature Sounds</span>
                </label>
              </div>

              {/* Game Sound Effects */}
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>
                  <input
                    type="checkbox"
                    checked={settings.effectsEnabled}
                    onChange={(e) => updateSetting('effectsEnabled', e.target.checked)}
                  />
                  <span className={styles.boldText}>🔊 Game Sound Effects</span>
                </label>
              </div>

              {/* Test Audio Button */}
              <div className={styles.controlGroup}>
                <button
                  onClick={testAudio}
                  disabled={isTestingAudio}
                  className={`${styles.testButton} ${isTestingAudio ? styles.testing : ''}`}
                >
                  {isTestingAudio ? '🔊 Testing...' : '🎵 Test Audio & Start Music'}
                </button>
              </div>

              {/* Info */}
              <div className={styles.infoBox}>
                💡 Audio will start after your first interaction with the page (browser requirement)
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};