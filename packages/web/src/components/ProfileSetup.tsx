import React, { useState, useEffect } from 'react';
import { ProfileService, PlayerProfile, AVATAR_OPTIONS } from '../services/profile';

interface ProfileSetupProps {
  onComplete?: (profile: PlayerProfile) => void;
  onCancel?: () => void;
  existingProfile?: PlayerProfile;
  isModal?: boolean;
}

/**
 * Profile Setup Component
 * Allows users to create or edit their player profile
 */
export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  onComplete,
  onCancel,
  existingProfile,
  isModal = false
}) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎮');
  const [theme, setTheme] = useState<'dark' | 'wood'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with existing profile data
  useEffect(() => {
    if (existingProfile) {
      setName(existingProfile.name);
      setSelectedAvatar(existingProfile.avatar || '🎮');
      setTheme(existingProfile.preferences.theme);
      setSoundEnabled(existingProfile.preferences.soundEnabled);
      setAnimationsEnabled(existingProfile.preferences.animationsEnabled);
      setVisualEffectsEnabled(existingProfile.preferences.visualEffectsEnabled ?? true);
    } else {
      // Load current profile if editing
      const currentProfile = ProfileService.getProfile();
      setName(currentProfile.name);
      setSelectedAvatar(currentProfile.avatar || '🎮');
      setTheme(currentProfile.preferences.theme);
      setSoundEnabled(currentProfile.preferences.soundEnabled);
      setAnimationsEnabled(currentProfile.preferences.animationsEnabled);
      setVisualEffectsEnabled(currentProfile.preferences.visualEffectsEnabled ?? true);
    }
  }, [existingProfile]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a player name');
      return;
    }

    setIsLoading(true);

    try {
      // Update profile with new data
      let profile = ProfileService.updateName(name);
      profile = ProfileService.updateAvatar(selectedAvatar);
      profile = ProfileService.updatePreferences({
        theme,
        soundEnabled,
        animationsEnabled,
        visualEffectsEnabled
      });

      if (onComplete) {
        onComplete(profile);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerClass = isModal
    ? 'profile-setup-modal'
    : 'profile-setup-page';

  return (
    <div className={containerClass}>
      <div className="profile-setup-content">
        <h2>✨ Player Profile</h2>

        {/* Player Name */}
        <div className="profile-field">
          <label htmlFor="player-name">Player Name</label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="profile-input"
          />
        </div>

        {/* Avatar Selection */}
        <div className="profile-field">
          <label>Choose Avatar</label>
          <div className="avatar-grid">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`avatar-option ${selectedAvatar === emoji ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(emoji)}
                title={`Select ${emoji} avatar`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="profile-field">
          <label>Theme</label>
          <div className="theme-selector">
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'wood' ? 'selected' : ''}`}
              onClick={() => setTheme('wood')}
            >
              🌳 Wood
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="profile-field">
          <label>Preferences</label>
          <div className="preferences">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span>🔊 Sound Effects</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
              />
              <span>✨ Animations</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={visualEffectsEnabled}
                onChange={(e) => setVisualEffectsEnabled(e.target.checked)}
              />
              <span>🌟 Visual Effects</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="btn primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Profile Display Component
 * Shows player profile information in a compact format
 */
export const ProfileDisplay: React.FC<{ profile: PlayerProfile; className?: string }> = ({
  profile,
  className = ''
}) => {
  const { stats } = profile;

  return (
    <div className={`profile-display ${className}`}>
      <div className="profile-header">
        <span className="profile-avatar">{profile.avatar || '🎮'}</span>
        <span className="profile-name">{profile.name}</span>
      </div>

      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-label">Games:</span>
          <span className="stat-value">{stats.gamesPlayed}</span>
        </div>

        {stats.gamesPlayed > 0 && (
          <>
            <div className="stat-item">
              <span className="stat-label">Wins:</span>
              <span className="stat-value">{stats.gamesWon}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Win Rate:</span>
              <span className="stat-value">{Math.round(stats.winRate)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Mini Profile Component
 * Compact profile display for navigation/header areas
 */
export const MiniProfile: React.FC<{
  profile: PlayerProfile;
  onClick?: () => void;
  className?: string;
}> = ({ profile, onClick, className = '' }) => {
  return (
    <button
      type="button"
      className={`mini-profile ${className}`}
      onClick={onClick}
      title={`${profile.name} - ${profile.stats.gamesPlayed} games played`}
    >
      <span className="mini-avatar">{profile.avatar || '🎮'}</span>
      <span className="mini-name">{profile.name}</span>
    </button>
  );
};