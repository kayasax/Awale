/**
 * Player Profile Management System
 * Handles localStorage persistence, CRUD operations, and profile utilities
 */

export interface PlayerProfile {
  id: string;           // Unique persistent ID
  name: string;         // Display name  
  avatar?: string;      // Base64 image or emoji/icon identifier
  createdAt: number;    // Profile creation timestamp
  stats: PlayerStats;
  preferences: PlayerPreferences;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;      // Calculated field (gamesWon / gamesPlayed * 100)
  totalSeeds: number;   // Seeds captured across all games
  averageGameTime: number; // In seconds
  lastPlayed?: number;  // Timestamp of last game
}

export interface PlayerPreferences {
  theme: 'dark' | 'wood';
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export interface GameResult {
  won: boolean;
  seedsCaptured: number;
  gameDuration: number; // In seconds
  opponent?: string;
  timestamp: number;
}

// Storage keys
const PROFILE_KEY = 'awale-player-profile';
const PROFILE_ID_KEY = 'awale-player-id'; // Keep existing for compatibility

/**
 * Profile Storage Service - handles localStorage operations
 */
export class ProfileService {
  
  /**
   * Get the current player profile or create a new one
   */
  static getProfile(): PlayerProfile {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) {
        const profile = JSON.parse(stored) as PlayerProfile;
        // Recalculate win rate in case of data inconsistency
        profile.stats.winRate = profile.stats.gamesPlayed > 0 
          ? (profile.stats.gamesWon / profile.stats.gamesPlayed) * 100 
          : 0;
        return profile;
      }
    } catch (error) {
      console.warn('Failed to load player profile:', error);
    }
    
    // Create new profile
    return this.createNewProfile();
  }
  
  /**
   * Create a new player profile with defaults
   */
  static createNewProfile(): PlayerProfile {
    // Check if we already have a player ID from previous system
    let playerId = localStorage.getItem(PROFILE_ID_KEY);
    if (!playerId) {
      playerId = 'player-' + Math.random().toString(36).substr(2, 8);
      localStorage.setItem(PROFILE_ID_KEY, playerId);
    }
    
    const profile: PlayerProfile = {
      id: playerId,
      name: 'Player', // Default name, user can change
      createdAt: Date.now(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalSeeds: 0,
        averageGameTime: 0,
        lastPlayed: undefined
      },
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        animationsEnabled: true
      }
    };
    
    this.saveProfile(profile);
    return profile;
  }
  
  /**
   * Save profile to localStorage
   */
  static saveProfile(profile: PlayerProfile): void {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      // Keep ID in separate key for compatibility
      localStorage.setItem(PROFILE_ID_KEY, profile.id);
    } catch (error) {
      console.error('Failed to save player profile:', error);
    }
  }
  
  /**
   * Update profile name
   */
  static updateName(name: string): PlayerProfile {
    const profile = this.getProfile();
    profile.name = name.trim() || 'Player';
    this.saveProfile(profile);
    return profile;
  }
  
  /**
   * Update profile avatar
   */
  static updateAvatar(avatar: string): PlayerProfile {
    const profile = this.getProfile();
    profile.avatar = avatar;
    this.saveProfile(profile);
    return profile;
  }
  
  /**
   * Update player preferences
   */
  static updatePreferences(preferences: Partial<PlayerPreferences>): PlayerProfile {
    const profile = this.getProfile();
    profile.preferences = { ...profile.preferences, ...preferences };
    this.saveProfile(profile);
    return profile;
  }
  
  /**
   * Record a game result and update statistics
   */
  static recordGameResult(result: GameResult): PlayerProfile {
    const profile = this.getProfile();
    
    // Update stats
    profile.stats.gamesPlayed++;
    if (result.won) {
      profile.stats.gamesWon++;
    }
    profile.stats.totalSeeds += result.seedsCaptured;
    profile.stats.lastPlayed = result.timestamp;
    
    // Recalculate derived stats
    profile.stats.winRate = (profile.stats.gamesWon / profile.stats.gamesPlayed) * 100;
    
    // Update average game time (rolling average)
    const currentAvg = profile.stats.averageGameTime;
    const gamesCount = profile.stats.gamesPlayed;
    profile.stats.averageGameTime = gamesCount === 1 
      ? result.gameDuration
      : ((currentAvg * (gamesCount - 1)) + result.gameDuration) / gamesCount;
    
    this.saveProfile(profile);
    return profile;
  }
  
  /**
   * Get player ID (for compatibility with existing multiplayer system)
   */
  static getPlayerId(): string {
    return this.getProfile().id;
  }
  
  /**
   * Get player name (for compatibility with existing multiplayer system)  
   */
  static getPlayerName(): string {
    return this.getProfile().name;
  }
  
  /**
   * Reset profile (for testing/development)
   */
  static resetProfile(): PlayerProfile {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_ID_KEY);
    return this.createNewProfile();
  }
  
  /**
   * Export profile as JSON (for backup/sharing)
   */
  static exportProfile(): string {
    const profile = this.getProfile();
    return JSON.stringify(profile, null, 2);
  }
  
  /**
   * Import profile from JSON (for backup/sharing)
   */
  static importProfile(profileJson: string): PlayerProfile {
    try {
      const profile = JSON.parse(profileJson) as PlayerProfile;
      
      // Validate required fields
      if (!profile.id || !profile.name || !profile.stats || !profile.preferences) {
        throw new Error('Invalid profile format');
      }
      
      // Ensure profile has all required fields with defaults
      const defaultStats: PlayerStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalSeeds: 0,
        averageGameTime: 0,
        lastPlayed: undefined
      };
      
      const defaultPreferences: PlayerPreferences = {
        theme: 'dark' as const,
        soundEnabled: true,
        animationsEnabled: true
      };
      
      const validatedProfile: PlayerProfile = {
        ...profile,
        stats: { ...defaultStats, ...profile.stats },
        preferences: { ...defaultPreferences, ...profile.preferences }
      };
      
      this.saveProfile(validatedProfile);
      return validatedProfile;
    } catch (error) {
      console.error('Failed to import profile:', error);
      throw new Error('Failed to import profile: Invalid format');
    }
  }
}

/**
 * Avatar utilities - predefined emoji/icon options
 */
export const AVATAR_OPTIONS = [
  '🌟', '🎮', '🏆', '🎯', '🔥', '⚡', '🎨', '🎭',
  '🚀', '💎', '👑', '🎲', '🎪', '🎊', '🎈', '🎁',
  '🌈', '🌟', '⭐', '✨', '💫', '🌞', '🌙', '⚽',
  '🏀', '🎾', '🏐', '🎳', '🎪', '🎨', '🎭', '🎬'
];

/**
 * Utility to format game time for display
 */
export function formatGameTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Utility to format win rate for display
 */
export function formatWinRate(winRate: number): string {
  return `${Math.round(winRate)}%`;
}