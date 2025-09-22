/**
 * 🌍 Ambient Atmosphere Manager
 * 
 * Creates procedural background effects that respond to game state
 * and enhance cultural immersion with African-themed soundscapes.
 * 
 * Features:
 * - Game-state-responsive audio (tension, victory, contemplation)
 * - Cultural atmosphere layers (distant drums, village sounds)  
 * - Dynamic intensity based on game progression
 * - Subtle layered soundscapes
 */

import { ambientAudioService } from './ambient-audio';

export type GameMood = 'contemplative' | 'tense' | 'victorious' | 'neutral' | 'dramatic';
export type CulturalLayer = 'village-distant' | 'drums-soft' | 'market-far' | 'evening-fire' | 'wind-savanna';

interface AtmosphereState {
  currentMood: GameMood;
  intensity: number; // 0-1, how intense the atmosphere should be
  activeLayers: CulturalLayer[];
  gameProgression: number; // 0-1, how far into game we are
  lastMoodChange: number;
  isActive: boolean;
}

/**
 * Procedural Ambient Atmosphere Manager
 */
export class AmbientAtmosphereManager {
  private state: AtmosphereState = {
    currentMood: 'neutral',
    intensity: 0.3,
    activeLayers: [],
    gameProgression: 0,
    lastMoodChange: 0,
    isActive: false
  };

  private layerTimers: Map<string, number> = new Map();
  private moodTransitionTimer: number | null = null;

  /**
   * Initialize the atmosphere system
   */
  async initialize(): Promise<void> {
    console.log('🌍 Initializing Ambient Atmosphere Manager...');
    
    // Start with gentle baseline atmosphere
    await this.setMood('neutral');
    this.state.isActive = true;
    
    // Begin subtle cultural layer rotation
    this.startCulturalLayerRotation();
  }

  /**
   * Start the system
   */
  async start(): Promise<void> {
    if (!this.state.isActive) {
      await this.initialize();
    }
    
    // Add initial gentle cultural layer
    await this.addCulturalLayer('wind-savanna');
    
    console.log('🌍 Ambient atmosphere started');
  }

  /**
   * Stop the system
   */
  stop(): void {
    this.state.isActive = false;
    
    // Clear all timers
    this.layerTimers.forEach(timer => clearTimeout(timer));
    this.layerTimers.clear();
    
    if (this.moodTransitionTimer) {
      clearTimeout(this.moodTransitionTimer);
      this.moodTransitionTimer = null;
    }
    
    // Stop all atmosphere tracks
    this.stopAllAtmosphereLayers();
    
    console.log('🌍 Ambient atmosphere stopped');
  }

  /**
   * React to game events with appropriate mood changes
   */
  async onGameEvent(event: string, context: any = {}): Promise<void> {
    if (!this.state.isActive) return;

    const now = Date.now();
    
    switch (event) {
      case 'game-start':
        await this.setMood('contemplative');
        this.state.gameProgression = 0;
        await this.addCulturalLayer('village-distant');
        break;
        
      case 'move-made':
        // Subtle tension increase for critical moves
        if (context.seedsLeft && context.seedsLeft < 10) {
          await this.increaseTension(0.2);
        }
        this.updateGameProgression(context.moveCount || 0);
        break;
        
      case 'capture-made':
        if (context.captureSize > 5) {
          await this.setMood('dramatic', 3000); // Brief dramatic moment
          await this.addCulturalLayer('drums-soft');
        }
        break;
        
      case 'critical-moment':
        // When game is close or decisive moves
        await this.setMood('tense');
        await this.increaseTension(0.4);
        break;
        
      case 'game-end':
        if (context.won) {
          await this.setMood('victorious');
          await this.addCulturalLayer('village-distant'); // Celebration sounds
        } else {
          await this.setMood('contemplative');
        }
        break;
        
      case 'thinking-moment':
        // When AI or player is contemplating
        await this.setMood('contemplative');
        await this.addCulturalLayer('evening-fire');
        break;
    }
  }

  /**
   * Set the overall mood of the atmosphere
   */
  private async setMood(mood: GameMood, duration?: number): Promise<void> {
    if (this.state.currentMood === mood) return;
    
    const previousMood = this.state.currentMood;
    this.state.currentMood = mood;
    this.state.lastMoodChange = Date.now();
    
    console.log(`🌍 Mood transition: ${previousMood} → ${mood}`);
    
    // Adjust intensity based on mood
    switch (mood) {
      case 'contemplative':
        this.state.intensity = 0.2;
        break;
      case 'tense':
        this.state.intensity = 0.6;
        break;
      case 'dramatic':
        this.state.intensity = 0.8;
        break;
      case 'victorious':
        this.state.intensity = 0.7;
        break;
      default:
        this.state.intensity = 0.3;
    }
    
    // Apply mood-specific effects
    await this.applyMoodEffects(mood);
    
    // Auto-revert to neutral after duration
    if (duration && duration > 0) {
      if (this.moodTransitionTimer) {
        clearTimeout(this.moodTransitionTimer);
      }
      
      this.moodTransitionTimer = window.setTimeout(async () => {
        if (this.state.currentMood === mood) {
          await this.setMood('neutral');
        }
      }, duration);
    }
  }

  /**
   * Apply effects specific to current mood
   */
  private async applyMoodEffects(mood: GameMood): Promise<void> {
    // First, adjust volume of existing layers based on mood
    this.adjustExistingLayerVolumes();
    
    // Then add mood-specific layers
    switch (mood) {
      case 'contemplative':
        await this.addCulturalLayer('evening-fire');
        this.scheduleLayerRemoval('drums-soft', 2000);
        break;
        
      case 'tense':
        await this.addCulturalLayer('drums-soft');
        this.scheduleLayerRemoval('evening-fire', 1000);
        break;
        
      case 'dramatic':
        await this.addCulturalLayer('drums-soft');
        await this.addCulturalLayer('village-distant');
        break;
        
      case 'victorious':
        await this.addCulturalLayer('village-distant');
        await this.addCulturalLayer('market-far');
        break;
        
      default:
        // Neutral - just wind
        await this.addCulturalLayer('wind-savanna');
    }
  }

  /**
   * Add a cultural atmosphere layer
   */
  private async addCulturalLayer(layer: CulturalLayer): Promise<void> {
    if (this.state.activeLayers.includes(layer)) return;
    
    const layerConfig = this.getCulturalLayerConfig(layer);
    if (!layerConfig) return;
    
    try {
      // Adjust volume based on current intensity
      const adjustedConfig = {
        ...layerConfig,
        volume: layerConfig.volume * this.state.intensity
      };
      
      await ambientAudioService.playTrack(
        `atmosphere-${layer}`,
        adjustedConfig,
        'ambient'
      );
      
      this.state.activeLayers.push(layer);
      console.log(`🌍 Added cultural layer: ${layer}`);
      
    } catch (error) {
      console.warn(`Failed to add cultural layer ${layer}:`, error);
    }
  }

  /**
   * Remove a cultural atmosphere layer
   */
  private removeCulturalLayer(layer: CulturalLayer): void {
    const index = this.state.activeLayers.indexOf(layer);
    if (index === -1) return;
    
    ambientAudioService.stopTrack(`atmosphere-${layer}`, 2.0);
    this.state.activeLayers.splice(index, 1);
    
    console.log(`🌍 Removed cultural layer: ${layer}`);
  }

  /**
   * Get configuration for cultural layer (using procedural/generated tones for now)
   */
  private getCulturalLayerConfig(layer: CulturalLayer): any {
    // For now, we'll use the Web Audio API to generate subtle tones
    // Later can be replaced with actual cultural audio files
    
    const baseConfig = {
      loop: true,
      fadeInDuration: 4.0,
      fadeOutDuration: 3.0
    };
    
    switch (layer) {
      case 'wind-savanna':
        return {
          ...baseConfig,
          url: this.generateWindToneDataUrl(),
          volume: 0.1
        };
        
      case 'drums-soft':
        return {
          ...baseConfig,
          url: this.generateDrumToneDataUrl(),
          volume: 0.15
        };
        
      case 'village-distant':
        return {
          ...baseConfig,
          url: this.generateVillageAmbienceDataUrl(),
          volume: 0.08
        };
        
      case 'evening-fire':
        return {
          ...baseConfig,
          url: this.generateFireCrackleDataUrl(),
          volume: 0.12
        };
        
      case 'market-far':
        return {
          ...baseConfig,
          url: this.generateMarketAmbienceDataUrl(),
          volume: 0.06
        };
        
      default:
        return null;
    }
  }

  /**
   * Generate subtle wind sound using Web Audio API
   */
  private generateWindToneDataUrl(): string {
    // Create a simple wind-like sound using white noise
    const length = 44100 * 4; // 4 seconds
    const sampleRate = 44100;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Generate filtered noise for wind effect
    for (let i = 0; i < length; i++) {
      const noise = (Math.random() - 0.5) * 0.1; // Very quiet
      const filtered = noise * (0.3 + 0.7 * Math.sin(i * 0.001)); // Filter
      view.setInt16(44 + i * 2, filtered * 32767, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Generate subtle drum rhythm using Web Audio API
   */
  private generateDrumToneDataUrl(): string {
    // Similar to wind but with rhythmic pulses
    const length = 44100 * 8; // 8 seconds for rhythm
    const sampleRate = 44100;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header (same as above)
    this.writeWavHeader(view, length, sampleRate);
    
    // Generate rhythmic drum-like pulses
    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      const beat = Math.sin(time * 2 * Math.PI * 0.8); // Slow rhythm
      const pulse = beat > 0.7 ? Math.sin(time * 100 * Math.PI) * 0.05 : 0;
      view.setInt16(44 + i * 2, pulse * 32767, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Generate other cultural layer sounds (placeholder implementations)
   */
  private generateVillageAmbienceDataUrl(): string {
    return this.generateWindToneDataUrl(); // Placeholder
  }

  private generateFireCrackleDataUrl(): string {
    return this.generateWindToneDataUrl(); // Placeholder
  }

  private generateMarketAmbienceDataUrl(): string {
    return this.generateWindToneDataUrl(); // Placeholder
  }

  /**
   * Helper to write WAV header
   */
  private writeWavHeader(view: DataView, length: number, sampleRate: number): void {
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
  }

  /**
   * Increase tension in the atmosphere
   */
  private async increaseTension(amount: number): Promise<void> {
    this.state.intensity = Math.min(1.0, this.state.intensity + amount);
    this.adjustExistingLayerVolumes();
  }

  /**
   * Adjust volumes of existing layers based on current intensity
   */
  private adjustExistingLayerVolumes(): void {
    // This would adjust volumes in the audio service
    // For now, we just log the change
    console.log(`🌍 Adjusting atmosphere intensity to ${this.state.intensity.toFixed(2)}`);
  }

  /**
   * Update game progression (affects atmosphere evolution)
   */
  private updateGameProgression(moveCount: number): void {
    // Estimate game progression based on moves (typical game ~30-60 moves)
    this.state.gameProgression = Math.min(1.0, moveCount / 50);
  }

  /**
   * Schedule removal of a layer after delay
   */
  private scheduleLayerRemoval(layer: CulturalLayer, delay: number): void {
    if (this.layerTimers.has(layer)) {
      clearTimeout(this.layerTimers.get(layer)!);
    }
    
    const timer = window.setTimeout(() => {
      this.removeCulturalLayer(layer);
      this.layerTimers.delete(layer);
    }, delay);
    
    this.layerTimers.set(layer, timer);
  }

  /**
   * Start rotation of cultural layers for variety
   */
  private startCulturalLayerRotation(): void {
    const rotateLayer = () => {
      if (!this.state.isActive) return;
      
      // Occasionally add/remove cultural layers for variety
      if (Math.random() < 0.3 && this.state.activeLayers.length < 2) {
        const availableLayers: CulturalLayer[] = [
          'village-distant', 'market-far', 'evening-fire'
        ];
        const newLayer = availableLayers[Math.floor(Math.random() * availableLayers.length)];
        this.addCulturalLayer(newLayer);
        
        // Remove it after some time
        this.scheduleLayerRemoval(newLayer, 30000 + Math.random() * 60000);
      }
      
      // Schedule next rotation
      setTimeout(rotateLayer, 45000 + Math.random() * 30000);
    };
    
    // Start rotation
    setTimeout(rotateLayer, 20000);
  }

  /**
   * Stop all atmosphere layers
   */
  private stopAllAtmosphereLayers(): void {
    for (const layer of this.state.activeLayers) {
      ambientAudioService.stopTrack(`atmosphere-${layer}`, 1.0);
    }
    this.state.activeLayers = [];
  }

  /**
   * Get current state
   */
  getState(): AtmosphereState {
    return { ...this.state };
  }
}

// Export singleton instance
export const ambientAtmosphere = new AmbientAtmosphereManager();