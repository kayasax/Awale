/**
 * 🎵 Ambient Experience Manager
 * 
 * Orchestrates the complete immersive ambient experience including:
 * - Background music rotation
 * - Layered ambient sounds
 * - Contextual sound effects
 * - Smooth transitions between states
 */

import { ambientAudioService, AudioSettings } from './ambient-audio';
import { AudioDiscovery, DiscoveredAudioFile } from './audio-discovery';
import { 
  AUDIO_ASSETS, 
  MUSIC_PLAYLISTS, 
  AMBIENT_SCENES, 
  getRandomPlaylist, 
  getRandomAmbientScene,
  getFallbackAudioConfig,
  checkAudioFileExists 
} from './audio-assets';

export type AmbientMode = 'peaceful' | 'rhythmic' | 'meditative' | 'dynamic';
export type AmbientScene = 'savanna' | 'forest' | 'storm' | 'nature' | 'minimal';

export interface AmbientState {
  mode: AmbientMode;
  scene: AmbientScene;
  musicTrack: string | null;
  ambientTracks: string[];
  isPlaying: boolean;
  volume: {
    music: number;
    ambient: number;
    effects: number;
  };
}

/**
 * Main Ambient Experience Manager
 */
export class AmbientExperienceManager {
  private currentState: AmbientState = {
    mode: 'peaceful',
    scene: 'savanna',
    musicTrack: null,
    ambientTracks: [],
    isPlaying: false,
    volume: { music: 0.6, ambient: 0.4, effects: 0.8 }
  };

  private musicRotationTimer: number | null = null;
  private initialized = false;

  constructor() {
    this.loadState();
  }

  /**
   * Initialize the ambient experience
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if audio files exist, fallback to generated sounds if needed
      const hasAudioFiles = await this.checkAudioAvailability();
      
      if (!hasAudioFiles) {
        // Could generate simple tones using Web Audio API here if needed
      }

      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize ambient experience:', error);
    }
  }

  /**
   * Start the ambient experience
   */
  async start(mode: AmbientMode = 'peaceful', scene: AmbientScene = 'savanna'): Promise<void> {
    await this.initialize();
    
    this.currentState.mode = mode;
    this.currentState.scene = scene;
    this.currentState.isPlaying = true;

    await this.startBackgroundMusic(mode);
    await this.startAmbientSounds(scene);
    this.setupMusicRotation();

    this.saveState();
    console.log(`🎵 Started ambient experience: ${mode} mode with ${scene} scene`);
  }

  /**
   * Stop the ambient experience
   */
  stop(): void {
    this.currentState.isPlaying = false;
    
    // Stop all playing tracks
    if (this.currentState.musicTrack) {
      ambientAudioService.stopTrack(`music-${this.currentState.musicTrack}`, 2.0);
    }
    
    for (const track of this.currentState.ambientTracks) {
      ambientAudioService.stopTrack(`ambient-${track}`, 3.0);
    }

    if (this.musicRotationTimer) {
      clearInterval(this.musicRotationTimer);
      this.musicRotationTimer = null;
    }

    this.currentState.musicTrack = null;
    this.currentState.ambientTracks = [];
    this.saveState();
  }

  /**
   * Change ambient mode (music style)
   */
  async changeMode(mode: AmbientMode): Promise<void> {
    if (this.currentState.mode === mode) return;
    
    this.currentState.mode = mode;
    
    if (this.currentState.isPlaying) {
      await this.startBackgroundMusic(mode);
    }
    
    this.saveState();
  }

  /**
   * Change ambient scene (environmental sounds)
   */
  async changeScene(scene: AmbientScene): Promise<void> {
    if (this.currentState.scene === scene) return;
    
    this.currentState.scene = scene;
    
    if (this.currentState.isPlaying) {
      await this.startAmbientSounds(scene);
    }
    
    this.saveState();
  }

  /**
   * Start background music for a specific mode - uses dynamic file discovery
   */
  private async startBackgroundMusic(mode: AmbientMode): Promise<void> {
    // Stop current music
    if (this.currentState.musicTrack) {
      ambientAudioService.stopTrack(`music-${this.currentState.musicTrack}`, 1.5);
    }

    try {
      // Use dynamic discovery to find actual music files
      const musicFile = await AudioDiscovery.getRandomFile('music');
      
      if (!musicFile) return;

      // Create a dynamic config for the discovered file
      const trackConfig = {
        url: musicFile.url,
        loop: true,
        volume: 0.6,
        fadeInDuration: 2.0,
        fadeOutDuration: 1.5
      };

      await ambientAudioService.playTrack(`music-${musicFile.id}`, trackConfig, 'music');
      
      this.currentState.musicTrack = musicFile.id;
    } catch (error) {
      console.error(`Failed to play music:`, error);
    }
  }

  /**
   * Start ambient environmental sounds for a specific scene
   */
  private async startAmbientSounds(scene: AmbientScene): Promise<void> {
    // Stop current ambient sounds
    for (const track of this.currentState.ambientTracks) {
      ambientAudioService.stopTrack(`ambient-${track}`, 3.0);
    }

    try {
      // Use dynamic discovery to find actual ambient files
      const ambientFile = await AudioDiscovery.getRandomFile('ambient');
      
      if (!ambientFile) return;

      // Play the ambient sound
      const trackConfig = {
        url: ambientFile.url,
        loop: true,
        volume: 0.4,
        fadeInDuration: 3.0,
        fadeOutDuration: 3.0
      };

      await ambientAudioService.playTrack(`ambient-${ambientFile.id}`, trackConfig, 'ambient');
      this.currentState.ambientTracks = [ambientFile.id];
    } catch (error) {
      console.error(`Failed to play ambient sounds:`, error);
    }
  }

  /**
   * Setup automatic music rotation
   */
  private setupMusicRotation(): void {
    if (this.musicRotationTimer) {
      clearInterval(this.musicRotationTimer);
    }

    // Rotate music every 5-8 minutes for variety
    const rotationInterval = (5 + Math.random() * 3) * 60 * 1000;
    
    this.musicRotationTimer = window.setInterval(() => {
      if (this.currentState.isPlaying && this.currentState.musicTrack) {
        this.startBackgroundMusic(this.currentState.mode);
      }
    }, rotationInterval);
  }

  /**
   * Play a contextual sound effect using dynamic file discovery
   */
  async playEffect(effectId: string): Promise<void> {
    try {
      // Map effect IDs to actual available files
      const effectMap: { [key: string]: string } = {
        'seed-drop': 'seed-drop',
        'seed-capture': 'success', // Use success.wav for captures
        'game-start': 'wood-click',
        'success': 'success',
        'move-invalid': 'wood-click', // Use wood-click as fallback
        'wood-click': 'wood-click'
      };

      const actualEffectId = effectMap[effectId] || 'wood-click';
      
      // Find the effect file using dynamic discovery
      const availableEffects = await AudioDiscovery.discoverAvailableAudioFiles();
      const effectFile = availableEffects.effects.find(f => f.id === actualEffectId);
      
      if (!effectFile) return;

      const trackConfig = {
        url: effectFile.url,
        loop: false,
        volume: 0.8, // Increased volume for effects
        fadeInDuration: 0,
        fadeOutDuration: 0.1
      };

      await ambientAudioService.playTrack(`effect-${effectId}-${Date.now()}`, trackConfig, 'effects');
    } catch (error) {
      // Silently fail - don't spam console with effect errors
    }
  }

  /**
   * Quick effect methods for common game events
   */
  async onSeedDrop(): Promise<void> {
    await this.playEffect('seed-drop');
  }

  async onSeedCapture(): Promise<void> {
    await this.playEffect('seed-capture');
  }

  async onGameStart(): Promise<void> {
    await this.playEffect('game-start');
  }

  async onGameEnd(won: boolean): Promise<void> {
    await this.playEffect(won ? 'success' : 'move-invalid');
  }

  async onValidMove(): Promise<void> {
    await this.playEffect('wood-click');
  }

  async onInvalidMove(): Promise<void> {
    await this.playEffect('move-invalid');
  }

  /**
   * Reset and reinitialize the entire audio system
   */
  async reset(): Promise<void> {
    // Stop everything
    this.stop();
    
    // Clear audio service caches
    ambientAudioService.clearCaches();
    
    // Reinitialize
    await this.initialize();
  }

  /**
   * Restart background music if ambient experience is playing
   */
  async restartBackgroundMusic(): Promise<void> {
    if (this.currentState.isPlaying) {
      await this.startBackgroundMusic(this.currentState.mode);
    }
  }

  /**
   * Restart ambient sounds if ambient experience is playing
   */
  async restartAmbientSounds(): Promise<void> {
    if (this.currentState.isPlaying) {
      await this.startAmbientSounds(this.currentState.scene);
    }
  }

  /**
   * Get current state
   */
  getState(): AmbientState {
    return { ...this.currentState };
  }

  /**
   * Check if audio files are available
   */
  private async checkAudioAvailability(): Promise<boolean> {
    try {
      // Check a sample of files
      const sampleMusic = Object.values(AUDIO_ASSETS.music)[0];
      const sampleAmbient = Object.values(AUDIO_ASSETS.ambient)[0];
      const sampleEffect = Object.values(AUDIO_ASSETS.effects)[0];

      const results = await Promise.all([
        checkAudioFileExists(sampleMusic.url),
        checkAudioFileExists(sampleAmbient.url),
        checkAudioFileExists(sampleEffect.url)
      ]);

      return results.some(Boolean); // Return true if at least one file exists
    } catch {
      return false;
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      const stateToSave = {
        mode: this.currentState.mode,
        scene: this.currentState.scene,
        isPlaying: this.currentState.isPlaying,
        volume: this.currentState.volume
      };
      localStorage.setItem('awale-ambient-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save ambient state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem('awale-ambient-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentState = {
          ...this.currentState,
          ...parsed,
          musicTrack: null, // Never persist playing tracks
          ambientTracks: [],
          isPlaying: false // Always start stopped
        };
      }
    } catch (error) {
      console.warn('Failed to load ambient state:', error);
    }
  }

  /**
   * Update volume for a category
   */
  updateVolume(category: 'music' | 'ambient' | 'effects', volume: number): void {
    this.currentState.volume[category] = volume;
    this.saveState();
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    if (this.musicRotationTimer) {
      clearInterval(this.musicRotationTimer);
      this.musicRotationTimer = null;
    }
  }
}

// Singleton instance
export const ambientExperience = new AmbientExperienceManager();