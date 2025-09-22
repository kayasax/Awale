/**
 * 🎵 Ambient Audio Service - Web Audio API Integration
 *
 * Provides immersive ambient experience with:
 * - Background music (Afrobeat/traditional)
 * - Nature ambient sounds (jungle, birds, wind)
 * - Enhanced game sound effects
 * - Individual volume controls
 * - Mobile-optimized performance
 */

export type AudioTrack = 'music' | 'ambient' | 'effects';

export interface AudioSettings {
  masterVolume: number;    // 0-1
  musicVolume: number;     // 0-1
  ambientVolume: number;   // 0-1
  effectsVolume: number;   // 0-1
  enabled: boolean;        // Master enable/disable
  musicEnabled: boolean;   // Background music on/off
  ambientEnabled: boolean; // Nature sounds on/off
  effectsEnabled: boolean; // Game sounds on/off
}

export interface AudioTrackConfig {
  url: string;
  loop: boolean;
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

/**
 * Main Audio Service Class
 */
export class AmbientAudioService {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;

  private loadedTracks = new Map<string, AudioBuffer>();
  private playingSources = new Map<string, AudioBufferSourceNode>();
  private trackTypes = new Map<string, AudioTrack>(); // Track what type each playing source is
  private failedTracks = new Set<string>(); // Track failed loads to avoid retry spam
  private lastEffectTime = new Map<string, number>(); // Rate limiting for effects

  private settings: AudioSettings = {
    masterVolume: 0.7,
    musicVolume: 0.6,
    ambientVolume: 0.4,
    effectsVolume: 0.3, // Lower default for effects
    enabled: true,
    musicEnabled: true,
    ambientEnabled: true,
    effectsEnabled: true
  };

  private initialized = false;
  private userInteracted = false;

  constructor() {
    // Listen for first user interaction to initialize audio context
    this.setupUserInteractionListener();
    this.loadSettings();
  }

  /**
   * Initialize Web Audio API context and gain nodes
   * Must be called after user interaction due to browser autoplay policies
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.initialized || !this.userInteracted) return;

    try {
      // Clear any stale caches from previous sessions
      this.clearCaches();

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create gain nodes for volume control
      this.masterGainNode = this.audioContext.createGain();
      this.musicGainNode = this.audioContext.createGain();
      this.ambientGainNode = this.audioContext.createGain();
      this.effectsGainNode = this.audioContext.createGain();

      // Connect gain nodes
      this.musicGainNode.connect(this.masterGainNode);
      this.ambientGainNode.connect(this.masterGainNode);
      this.effectsGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioContext.destination);

      // Set initial volumes
      this.updateVolumes();

      this.initialized = true;

      // Only log initialization occasionally to keep console clean
      if (Math.random() < 0.1) { // Reduced from 0.2 to 0.1 for less noise
        console.log('🎵 Ambient Audio System initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  /**
   * Set up listener for first user interaction
   */
  private setupUserInteractionListener(): void {
    const handleUserInteraction = () => {
      this.userInteracted = true;
      this.initializeAudioContext();

      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
  }

  /**
   * Load audio file and return AudioBuffer (null if failed)
   */
  private async loadAudioFile(url: string): Promise<AudioBuffer | null> {
    if (this.loadedTracks.has(url)) {
      return this.loadedTracks.get(url)!;
    }

    // Skip if we already know this file failed
    if (this.failedTracks.has(url)) {
      return null;
    }

    if (!this.audioContext) {
      await this.initializeAudioContext();
      if (!this.audioContext) return null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Mark as failed and don't retry
        this.failedTracks.add(url);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.loadedTracks.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      // Mark as failed and don't retry
      this.failedTracks.add(url);
      return null;
    }
  }

  /**
   * Play an audio track with specified configuration
   */
  async playTrack(id: string, config: AudioTrackConfig, trackType: AudioTrack): Promise<void> {
    if (!this.settings.enabled) return;

    // Check if specific track type is enabled
    const trackEnabled = {
      music: this.settings.musicEnabled,
      ambient: this.settings.ambientEnabled,
      effects: this.settings.effectsEnabled
    }[trackType];

    if (!trackEnabled) return;

    // Rate limiting for effects to prevent spam
    if (trackType === 'effects') {
      const now = Date.now();
      const lastTime = this.lastEffectTime.get(id) || 0;
      if (now - lastTime < 100) { // 100ms minimum between same effect
        return;
      }
      this.lastEffectTime.set(id, now);
    }

    try {
      // Ensure audio context is resumed FIRST
      const isReady = await this.ensureAudioContextResumed();
      if (!isReady) return;

      // Stop existing track with same ID
      this.stopTrack(id);

      const audioBuffer = await this.loadAudioFile(config.url);

      // If audio file failed to load, just return (no fallback tones)
      if (!audioBuffer) return;

      // Create and configure audio nodes
      const source = this.audioContext!.createBufferSource();
      const gainNode = this.audioContext!.createGain();

      source.buffer = audioBuffer;
      source.loop = config.loop || false;

      // Connect to appropriate gain node
      const targetGain = {
        music: this.musicGainNode!,
        ambient: this.ambientGainNode!,
        effects: this.effectsGainNode!
      }[trackType];

      source.connect(gainNode);
      gainNode.connect(targetGain);

      // Set initial volume and fading
      const initialVolume = config.volume || 0.5;
      const currentTime = this.audioContext!.currentTime;

      if (config.fadeInDuration && config.fadeInDuration > 0) {
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(initialVolume, currentTime + config.fadeInDuration);
      } else {
        gainNode.gain.setValueAtTime(initialVolume, currentTime);
      }

      // Start playback
      source.start(currentTime);

      // Store the source AND its type for later control
      this.playingSources.set(id, source);
      this.trackTypes.set(id, trackType);

      // Handle source end
      source.addEventListener('ended', () => {
        this.playingSources.delete(id);
        this.trackTypes.delete(id);
      });

    } catch (error) {
      console.error(`Failed to play track ${id}:`, error);
    }
  }

  /**
   * Stop a playing track
   */
  stopTrack(id: string, fadeOutDuration: number = 0): void {
    const source = this.playingSources.get(id);
    if (!source || !this.audioContext) return;

    try {
      if (fadeOutDuration > 0) {
        // Fade out before stopping
        const gainNode = source.buffer ? this.getGainNodeForSource(source) : null;
        if (gainNode) {
          gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutDuration);
          setTimeout(() => {
            source.stop();
            this.playingSources.delete(id);
            this.trackTypes.delete(id);
          }, fadeOutDuration * 1000);
        } else {
          source.stop();
          this.playingSources.delete(id);
          this.trackTypes.delete(id);
        }
      } else {
        source.stop();
        this.playingSources.delete(id);
        this.trackTypes.delete(id);
      }
    } catch (error) {
      // Source might already be stopped
      this.playingSources.delete(id);
      this.trackTypes.delete(id);
    }
  }

  /**
   * Get gain node for a source (helper for fade out)
   */
  private getGainNodeForSource(source: AudioBufferSourceNode): GainNode | null {
    // This is a simplified approach - in practice we'd need to track connections
    return this.musicGainNode; // Default to music gain node
  }

  /**
   * Update all volume levels
   */
  private updateVolumes(): void {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(this.settings.masterVolume, currentTime);
    }
    if (this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(this.settings.musicVolume, currentTime);
    }
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.setValueAtTime(this.settings.ambientVolume, currentTime);
    }
    if (this.effectsGainNode) {
      this.effectsGainNode.gain.setValueAtTime(this.settings.effectsVolume, currentTime);
    }
  }

  /**
   * Update audio settings
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // EMERGENCY STOP: If disabled, stop everything immediately
    if (newSettings.enabled === false) {
      this.stopAllAudio();
      return;
    }

    this.updateVolumes();
    this.saveSettings();

    // Stop tracks if their categories are disabled
    if (newSettings.musicEnabled === false) {
      this.stopAllTracksOfType('music');
    }
    if (newSettings.ambientEnabled === false) {
      this.stopAllTracksOfType('ambient');
    }
    if (newSettings.effectsEnabled === false) {
      this.stopAllTracksOfType('effects');
    }
  }

  /**
   * EMERGENCY: Stop all audio immediately
   */
  private stopAllAudio(): void {
    try {
      // Stop all playing audio buffer sources (with safety check)
      if (this.playingSources && this.playingSources.size > 0) {
        this.playingSources.forEach((source, id) => {
          try {
            source.stop();
          } catch (error) {
            // Ignore errors from already stopped sources
          }
        });
        this.playingSources.clear();
        this.trackTypes.clear(); // Clear track type tracking
      }

      // Mute all gain nodes immediately
      const currentTime = this.audioContext?.currentTime || 0;
      if (this.masterGainNode) {
        this.masterGainNode.gain.setValueAtTime(0, currentTime);
      }
      if (this.musicGainNode) {
        this.musicGainNode.gain.setValueAtTime(0, currentTime);
      }
      if (this.ambientGainNode) {
        this.ambientGainNode.gain.setValueAtTime(0, currentTime);
      }
      if (this.effectsGainNode) {
        this.effectsGainNode.gain.setValueAtTime(0, currentTime);
      }

    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * Stop all tracks of a specific type
   */
  /**
   * Stop all tracks of a specific type (music, ambient, effects)
   */
  private stopAllTracksOfType(trackType: AudioTrack): void {
    const tracksToStop: string[] = [];

    // Find all tracks of this type
    this.trackTypes.forEach((type, id) => {
      if (type === trackType) {
        tracksToStop.push(id);
      }
    });

    // Stop each track
    tracksToStop.forEach(id => {
      this.stopTrack(id);
    });

    if (tracksToStop.length > 0) {
      console.log(`🔇 Stopped ${tracksToStop.length} ${trackType} track(s)`);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('awale-audio-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('awale-audio-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  /**
   * Play a fallback tone when audio file is missing - DISABLED FOR CLEAN EXPERIENCE
   */
  private async playFallbackTone(id: string, config: AudioTrackConfig, trackType: AudioTrack = 'effects'): Promise<void> {
    // DISABLED: No more fallback tones - just fail silently for a cleaner experience
    // If audio files don't exist, the game should work fine without them

    // Only log occasionally to avoid console spam (5% chance)
    if (Math.random() < 0.05) {
      console.log(`🔇 Audio file missing (silent): ${id}`);
    }

    return; // Exit immediately - no fallback audio
  }

  /**
   * Clear all caches and reset state
   */
  clearCaches(): void {
    this.loadedTracks.clear();
    this.failedTracks.clear();
    this.lastEffectTime.clear();
    this.trackTypes.clear(); // Clear track type tracking
  }

  /**
   * Cleanup - stop all tracks and disconnect audio context
   */
  dispose(): void {
    // Stop all playing sources
    for (const [id, source] of this.playingSources) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
    }
    this.playingSources.clear();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.initialized = false;
    console.log('🎵 Ambient Audio System disposed');
  }

  /**
   * Ensure audio context is resumed and ready
   */
  async ensureAudioContextResumed(): Promise<boolean> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🎵 Audio context resumed');
        return true;
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return false;
      }
    }

    return this.audioContext?.state === 'running';
  }

  /**
   * Check if audio is supported and enabled
   */
  isAvailable(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext) && this.settings.enabled;
  }

  /**
   * Quick play methods for common game sounds
   */
  async playSeedDropSound(): Promise<void> {
    // Will be implemented with actual sound files
    if (!this.settings.effectsEnabled) return;
    console.log('🔊 Seed drop sound');
  }

  async playCaptureSound(): Promise<void> {
    if (!this.settings.effectsEnabled) return;
    console.log('🔊 Capture sound');
  }

  async playGameStartSound(): Promise<void> {
    if (!this.settings.effectsEnabled) return;
    console.log('🔊 Game start sound');
  }

  async playGameEndSound(): Promise<void> {
    if (!this.settings.effectsEnabled) return;
    console.log('🔊 Game end sound');
  }
}

// Singleton instance
export const ambientAudioService = new AmbientAudioService();