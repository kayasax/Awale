/**
 * ✨ Visual Ambient Atmosphere Manager
 *
 * Creates procedural visual effects that respond to game state
 * and enhance cultural immersion with African-themed atmospheric graphics.
 *
 * Features:
 * - Game-state-responsive visuals (tension, victory, contemplation)
 * - Cultural visual elements (floating seeds, dust motes, cultural symbols)
 * - Dynamic lighting and particle systems based on game progression
 * - Layered visual atmosphere with performance optimizations
 */

export type VisualMood = 'contemplative' | 'tense' | 'victorious' | 'neutral' | 'dramatic';
export type VisualLayer = 'dust-motes' | 'floating-seeds' | 'cultural-symbols' | 'wind-particles' | 'ambient-glow' | 'victory-sparkles' | 'fireflies';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  size: number;
  opacity: number;
  age: number;
  maxAge: number;
  type: VisualLayer;
  color: string;
  rotation: number;
  rotationSpeed: number;
  depth: number; // 0 (front) .. 1 (far)
  flickerPhase: number; // random phase for subtle brightness modulation
  baselineY: number; // anchored vertical band center
}

interface VisualAtmosphereState {
  currentMood: VisualMood;
  intensity: number; // 0-1, how intense the effects should be
  activeLayers: VisualLayer[];
  particles: Particle[];
  gameProgression: number; // 0-1, how far into game we are
  lastMoodChange: number;
  isActive: boolean;
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D | null;
  animationFrame?: number;
  lighting: {
    ambientColor: string;
    glowIntensity: number;
    warmth: number; // 0-1, cooler to warmer lighting
  };
}

/**
 * Visual Ambient Atmosphere Manager
 */
export class VisualAtmosphereManager {
  // Toggle to re-enable logging and control granularity
  private debug = false;
  private debugLevel: 0 | 1 | 2 = 1; // 0 silent, 1 minimal, 2 verbose
  private visibilityBoost = 1; // multiplier for particle size & opacity for troubleshooting
  private themeOpacityMultiplier = 1; // adjusts based on background brightness
  private themeAdaptTimer: ReturnType<typeof setInterval> | null = null;
  private resizeObserver?: ResizeObserver;
  private frameCounter = 0;
  private uniformDistribution = false; // when true, spread particles across full height
  private persistentAmbient = true; // keep baseline ambience alive
  private minAmbientParticles = 20;
  private state: VisualAtmosphereState = {
    currentMood: 'neutral',
  // Start very subtle
  intensity: 0.22, // slightly higher to ensure visibility after styling changes
    activeLayers: [],
    particles: [],
    gameProgression: 0,
    lastMoodChange: 0,
    isActive: false,
    lighting: {
      ambientColor: 'rgba(255, 180, 60, 0.03)',
      glowIntensity: 0.2,
      warmth: 0.4
    }
  };

  private layerTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private moodTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  private particleIdCounter = 0;
  // Much lower baseline; progression logic will further cap
  private maxParticles = 60; // slightly increased baseline

  /**
   * Initialize the visual atmosphere system
   */
  async initialize(container?: HTMLElement): Promise<void> {
    console.log('✨ Initializing Visual Ambient Atmosphere Manager...');
    // Early global exposure so console access works even if later steps abort
    (window as any).awaleAtmosphere = this;

    // Create canvas for atmospheric effects
    await this.setupCanvas(container);

    // Start with gentle baseline atmosphere
    await this.setMood('neutral');
    this.state.isActive = true;

    // Begin visual layer rotation
    this.startVisualLayerRotation();

    // Start animation loop
    this.startAnimationLoop();

    // Add global test function for debugging
    (window as any).testVisualAtmosphere = () => {
      console.log('🔥 Testing visual atmosphere visibility...');
      console.log('🔥 Current state:', {
        isActive: this.state.isActive,
        particleCount: this.state.particles.length,
        activeLayers: this.state.activeLayers,
        canvas: !!this.state.canvas,
        context: !!this.state.context
      });
      this.onGameEvent('capture-made', { captureSize: 3 });
      this.addVisualLayer('victory-sparkles');
      this.addVisualLayer('wind-particles');
      console.log('🔥 Test particles added. Check canvas!');
      setTimeout(() => {
        console.log('🔥 Particles after 1 second:', this.state.particles.length);
      }, 1000);
    };

    // Refresh global (idempotent)
    (window as any).awaleAtmosphere = this;
  }

  /**
   * Setup the canvas for atmospheric effects
   */
  private async setupCanvas(container?: HTMLElement): Promise<void> {
    let targetContainer = container;

    if (!targetContainer) {
      // Try multiple selectors to find the game container
      const selectors = [
        '.awale-container',
        '[class*="awale-container"]',
        '.game-container',
        '.board-shell'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element instanceof HTMLElement) {
          targetContainer = element;
          console.log(`✨ Found visual atmosphere container with selector: ${selector}`);
          break;
        }
      }
    }

    if (!targetContainer) {
      console.warn('✨ No container found for visual atmosphere canvas. Tried selectors:', [
        '.awale-container',
        '[class*="awale-container"]',
        '.game-container',
        '.board-shell'
      ]);
      return;
    }

    console.log('✨ Setting up canvas in container:', targetContainer.className);

    // Ensure container can host absolutely positioned children
    const containerStyle = window.getComputedStyle(targetContainer);
    if (containerStyle.position === 'static') {
      targetContainer.style.position = 'relative';
      console.log('✨ Set container position to relative');
    }

    // Create canvas element
    this.state.canvas = document.createElement('canvas');
    this.state.canvas.className = 'visual-atmosphere-canvas';
    this.state.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5; /* raise above backgrounds but below overlays */
      opacity: 1.0;
    `; // Transparent; particles drawn above board background

    // Get 2D context
    this.state.context = this.state.canvas.getContext('2d');
    if (!this.state.context) {
      console.error('✨ Failed to get 2D context for visual atmosphere');
      return;
    }

    // Handle canvas sizing - force immediate resize
    this.resizeCanvas();

    // Force another resize after a brief delay to ensure proper sizing
    setTimeout(() => {
      this.resizeCanvas();
      console.log('✨ Canvas size after delayed resize:', `${this.state.canvas?.width}x${this.state.canvas?.height}`);
    }, 100);

    // Handle window + container resize
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(targetContainer);
    }

    // Insert canvas as the first child (behind all content)
    targetContainer.insertBefore(this.state.canvas, targetContainer.firstChild);

    if (this.debug && this.debugLevel > 0) {
      console.log('✨ Canvas created and inserted:', {
        canvasSize: `${this.state.canvas.width}x${this.state.canvas.height}`,
        containerSize: `${targetContainer.offsetWidth}x${targetContainer.offsetHeight}`,
        canvasStyle: this.state.canvas.style.cssText
      });
      console.log('✨ Visual atmosphere canvas created and inserted');
    }

    // Theme adaptation (initial + periodic)
    this.adaptToTheme();
  this.themeAdaptTimer = setInterval(() => this.adaptToTheme(), 18000);

    // Post-layout settle passes to catch late expansions
    let attempts = 0;
    const settle = () => {
      attempts++;
      this.resizeCanvas();
      if (attempts < 6) setTimeout(settle, 140 * attempts);
    };
    setTimeout(settle, 260);
  }

  /**
   * Resize canvas to match container
   */
  private resizeCanvas(): void {
    if (!this.state.canvas || !this.state.context) return;
    const isFullscreen = this.state.canvas.style.position === 'fixed';
    const dpr = window.devicePixelRatio || 1;
    let width: number;
    let height: number;
    if (isFullscreen) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      const container = this.state.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    this.state.canvas.width = Math.floor(width * dpr);
    this.state.canvas.height = Math.floor(height * dpr);
    this.state.canvas.style.width = width + 'px';
    this.state.canvas.style.height = height + 'px';
    // Reset transform before scaling to avoid cumulative scaling
    this.state.context.setTransform(1, 0, 0, 1, 0, 0);
    this.state.context.scale(dpr, dpr);
    if (this.debug) {
      console.log('✨ Canvas resized (with DPR):', {
        cssSize: `${width}x${height}`,
        backingStore: `${this.state.canvas.width}x${this.state.canvas.height}`,
        dpr
      });
    }
  }

  /** Get logical (CSS pixel) canvas size */
  private getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    if (!this.state.canvas) return { width: 0, height: 0, dpr };
    return { width: this.state.canvas.width / dpr, height: this.state.canvas.height / dpr, dpr };
  }

  /**
   * Start the visual atmosphere system
   */
  async start(): Promise<void> {
    console.log('✨ Starting visual atmosphere system...');

    if (!this.state.isActive) {
      console.log('✨ Visual atmosphere not initialized, initializing...');
      await this.initialize();
    }

    if (!this.state.canvas || !this.state.context) {
      console.warn('✨ Cannot start visual atmosphere: canvas or context missing');
      return;
    }

    // Add initial gentle visual layers
    if (this.debug) console.log('✨ Adding initial visual layers...');
    await this.addVisualLayer('dust-motes');
    await this.addVisualLayer('floating-seeds');

    if (this.debug) {
      console.log('✨ Visual ambient atmosphere started with initial layers:', this.state.activeLayers);
      console.log('✨ Current particle count:', this.state.particles.length);
    }
  }

  /**
   * Stop the visual atmosphere system
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

    // Stop animation loop
    if (this.state.animationFrame) {
      cancelAnimationFrame(this.state.animationFrame);
      this.state.animationFrame = undefined;
    }

    // Remove canvas
    if (this.state.canvas && this.state.canvas.parentElement) {
      this.state.canvas.parentElement.removeChild(this.state.canvas);
    }

    if (this.themeAdaptTimer) {
      clearInterval(this.themeAdaptTimer);
      this.themeAdaptTimer = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    // Clear particles
    this.state.particles = [];

    console.log('✨ Visual ambient atmosphere stopped');
  }

  /**
   * React to game events with appropriate visual mood changes
   */
  async onGameEvent(event: string, context: any = {}): Promise<void> {
    if (!this.state.isActive) return;

    const now = Date.now();

    switch (event) {
      case 'game-start':
        await this.setMood('contemplative');
        this.state.gameProgression = 0;
        await this.addVisualLayer('floating-seeds');
        break;

      case 'move-made':
        // Add subtle wind particles for movement
        await this.addVisualLayer('wind-particles');
        // Remove wind particles after a short time
        setTimeout(() => this.removeVisualLayer('wind-particles'), 2000);

        // Increase tension visually for critical moves
        if (context.seedsLeft && context.seedsLeft < 10) {
          await this.increaseTension(0.2);
        }
        this.updateGameProgression(context.moveCount || 0);
        break;

      case 'capture-made':
        if (context.captureSize > 5) {
          await this.setMood('dramatic', 3000); // Brief dramatic moment
          await this.addVisualLayer('victory-sparkles');
          // Remove sparkles after effect
          setTimeout(() => this.removeVisualLayer('victory-sparkles'), 4000);
        }
        break;

      case 'critical-moment':
        // When game is close or decisive moves
        await this.setMood('tense');
        await this.increaseTension(0.4);
        await this.addVisualLayer('cultural-symbols');
        break;

      case 'game-end':
        if (context.won) {
          await this.setMood('victorious');
          await this.addVisualLayer('victory-sparkles');
        } else {
          await this.setMood('contemplative');
          await this.addVisualLayer('floating-seeds');
        }
        break;

      case 'thinking-moment':
        // When AI or player is contemplating
        await this.setMood('contemplative');
        await this.addVisualLayer('dust-motes');
        break;
    }
  }

  /**
   * Set the overall visual mood of the atmosphere
   */
  private async setMood(mood: VisualMood, duration?: number): Promise<void> {
    if (this.state.currentMood === mood) return;

    const previousMood = this.state.currentMood;
    this.state.currentMood = mood;
    this.state.lastMoodChange = Date.now();

  if (this.debug) console.log(`✨ Visual mood transition: ${previousMood} → ${mood}`);

    // Adjust intensity and lighting based on mood
    switch (mood) {
      case 'contemplative':
        this.state.intensity = 0.2;
        this.state.lighting.ambientColor = 'rgba(200, 160, 100, 0.02)';
        this.state.lighting.warmth = 0.7;
        this.state.lighting.glowIntensity = 0.1;
        break;
      case 'tense':
        this.state.intensity = 0.6;
        this.state.lighting.ambientColor = 'rgba(120, 80, 60, 0.04)';
        this.state.lighting.warmth = 0.3;
        this.state.lighting.glowIntensity = 0.3;
        break;
      case 'dramatic':
        this.state.intensity = 0.8;
        this.state.lighting.ambientColor = 'rgba(180, 60, 40, 0.05)';
        this.state.lighting.warmth = 0.2;
        this.state.lighting.glowIntensity = 0.5;
        break;
      case 'victorious':
        this.state.intensity = 0.7;
        this.state.lighting.ambientColor = 'rgba(255, 200, 80, 0.06)';
        this.state.lighting.warmth = 0.8;
        this.state.lighting.glowIntensity = 0.4;
        break;
      default:
        this.state.intensity = 0.3;
        this.state.lighting.ambientColor = 'rgba(255, 180, 60, 0.03)';
        this.state.lighting.warmth = 0.4;
        this.state.lighting.glowIntensity = 0.2;
    }

    // Apply mood-specific visual effects
    await this.applyMoodEffects(mood);

    // Auto-revert to neutral after duration
    if (duration && duration > 0) {
      if (this.moodTransitionTimer) {
        clearTimeout(this.moodTransitionTimer);
      }

      this.moodTransitionTimer = setTimeout(async () => {
        if (this.state.currentMood === mood) {
          await this.setMood('neutral');
        }
      }, duration);
    }
  }

  /**
   * Apply visual effects specific to current mood
   */
  private async applyMoodEffects(mood: VisualMood): Promise<void> {
    // Adjust existing particle properties based on mood
    this.adjustExistingParticleProperties();

    // Add mood-specific particle layers
    switch (mood) {
      case 'contemplative':
        await this.addVisualLayer('dust-motes');
        await this.removeVisualLayer('victory-sparkles');
        break;
      case 'tense':
        await this.addVisualLayer('wind-particles');
        await this.removeVisualLayer('floating-seeds');
        break;
      case 'dramatic':
        await this.addVisualLayer('cultural-symbols');
        break;
      case 'victorious':
        await this.addVisualLayer('victory-sparkles');
        await this.addVisualLayer('floating-seeds');
        break;
    }
  }

  /**
   * Add a visual layer (particle type)
   */
  private async addVisualLayer(layer: VisualLayer): Promise<void> {
    if (this.state.activeLayers.includes(layer)) return;

    this.state.activeLayers.push(layer);
  if (this.debug && this.debugLevel > 1) console.log(`✨ Added visual layer: ${layer}`);

    // Seed a few initial particles so the layer is immediately perceptible
    const seedCounts: Record<string, number> = {
      'dust-motes': 10,
      'floating-seeds': 8,
      'fireflies': 6,
      'wind-particles': 4,
      'cultural-symbols': 2,
      'victory-sparkles': 4,
      'ambient-glow': 2
    };
    const seedCount = seedCounts[layer] || 4;
    for (let i = 0; i < seedCount; i++) {
      const seeded = this.createParticle(layer);
      if (seeded) this.state.particles.push(seeded);
    }
  if (this.debug && this.debugLevel > 1) console.log(`✨ Seeded ${seedCount} initial particles for layer ${layer}`);

    // Start spawning particles for this layer
    this.startParticleSpawning(layer);
  }

  /**
   * Remove a visual layer
   */
  private removeVisualLayer(layer: VisualLayer): void {
    const index = this.state.activeLayers.indexOf(layer);
    if (index === -1) return;

    this.state.activeLayers.splice(index, 1);

    // Stop spawning new particles of this type
    const timer = this.layerTimers.get(layer);
    if (timer) {
      clearTimeout(timer);
      this.layerTimers.delete(layer);
    }

    // Mark existing particles of this type for removal
    this.state.particles.forEach(particle => {
      if (particle.type === layer) {
        particle.maxAge = Math.min(particle.maxAge, particle.age + 2000); // Fade out over 2s
      }
    });

  if (this.debug && this.debugLevel > 1) console.log(`✨ Removed visual layer: ${layer}`);
  }

  /**
   * Start spawning particles for a specific layer
   */
  private startParticleSpawning(layer: VisualLayer): void {
  if (this.debug && this.debugLevel > 1) console.log(`✨ Starting particle spawning for layer: ${layer}`);

    const spawnParticle = () => {
      if (!this.state.activeLayers.includes(layer) || !this.state.isActive) {
  if (this.debug && this.debugLevel > 1) console.log(`✨ Stopping spawn for ${layer}: not active or layer removed`);
        return;
      }
      if (this.state.particles.length >= this.maxParticles) {
        // Remove oldest particles if at limit (subtle – do not spam logs)
        this.state.particles.sort((a, b) => b.age - a.age);
        this.state.particles = this.state.particles.slice(0, this.maxParticles - 1);
      }

      const particle = this.createParticle(layer);
      if (particle) {
        this.state.particles.push(particle);
  if (this.debug && this.debugLevel > 1) console.log(`✨ Created particle for ${layer}: total now ${this.state.particles.length}`);
      } else {
  if (this.debug && this.debugLevel > 0) console.warn(`✨ Failed to create particle for layer: ${layer}`);
      }

      // Schedule next particle spawn
      const spawnRate = this.getSpawnRate(layer);
      const timer = setTimeout(spawnParticle, spawnRate);
      this.layerTimers.set(layer, timer);
    };

    // Start spawning immediately
    spawnParticle();
  }

  /**
   * Create a particle for a specific layer type
   */
  private createParticle(layer: VisualLayer): Particle | null {
    if (!this.state.canvas) return null;

    const baseConfig = this.getParticleConfig(layer);
    if (!baseConfig) return null;

    const { width: logicalW, height: logicalH } = this.getLogicalSize();

    const particle: Particle = {
      id: `${layer}-${++this.particleIdCounter}`,
      x: Math.random() * logicalW,
      // Bias baseline vertical distribution for subtle layers toward the upper/mid region so they aren't lost in darker lower wood
  y: this.computeInitialY(layer, logicalH),
      vx: (Math.random() - 0.5) * baseConfig.velocity.x,
      vy: (Math.random() - 0.5) * baseConfig.velocity.y,
      size: baseConfig.size.min + Math.random() * (baseConfig.size.max - baseConfig.size.min),
      opacity: baseConfig.opacity.min + Math.random() * (baseConfig.opacity.max - baseConfig.opacity.min),
      age: 0,
      maxAge: baseConfig.lifespan,
      type: layer,
      color: baseConfig.colors[Math.floor(Math.random() * baseConfig.colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      depth: Math.random(),
      flickerPhase: Math.random() * Math.PI * 2,
  baselineY: this.computeInitialY(layer, logicalH)
    };

    // Apply slight color jitter for natural variation (except cultural-symbols & victory-sparkles which rely on curated colors)
    if (['dust-motes', 'floating-seeds', 'fireflies', 'wind-particles'].includes(layer)) {
      particle.color = this.jitterColor(particle.color, 0.08); // 8% jitter
    }

    return particle;
  }

  /**
   * Get particle configuration for each layer type
   */
  private getParticleConfig(layer: VisualLayer) {
    switch (layer) {
      case 'dust-motes':
        // Very small, faint warm motes
        return {
          velocity: { x: 0.14, y: 0.01 }, // minimal vertical drift
          size: { min: 2, max: 4 }, // slightly larger for visibility
          opacity: { min: 0.38, max: 0.55 }, // lifted range for better contrast
          lifespan: 18000,
          colors: [
            'rgba(215,180,120,0.35)',
            'rgba(200,165,110,0.30)',
            'rgba(190,150,100,0.28)'
          ]
        };

      case 'floating-seeds':
        // Soft drifting pale seeds (slightly elongated ellipse when rendered)
        return {
            velocity: { x: 0.38, y: 0.005 }, // almost purely horizontal
            size: { min: 2, max: 6 },
            opacity: { min: 0.34, max: 0.50 },
            lifespan: 26000,
            colors: [
              'rgba(230,205,150,0.34)',
              'rgba(225,200,145,0.30)',
              'rgba(240,210,160,0.32)'
            ]
        };

      case 'cultural-symbols':
        return {
          velocity: { x: 0.3, y: 0.2 },
          size: { min: 8, max: 15 },
          opacity: { min: 0.05, max: 0.15 },
          lifespan: 25000,
          colors: ['rgba(255, 200, 80, 0.1)', 'rgba(200, 160, 60, 0.08)', 'rgba(180, 140, 50, 0.12)']
        };

      case 'wind-particles':
        // Keep wind hints minimal – thin, faint streaks
        return {
          velocity: { x: 2.0, y: 0.6 },
          size: { min: 2, max: 3 },
          opacity: { min: 0.14, max: 0.24 },
          lifespan: 4000,
          colors: ['rgba(255,255,255,0.15)', 'rgba(230,240,255,0.12)']
        };

      case 'victory-sparkles':
        // Still celebratory but toned down
        return {
          velocity: { x: 1.4, y: 1.4 },
          size: { min: 5, max: 9 },
          opacity: { min: 0.30, max: 0.60 },
          lifespan: 9000,
          colors: [
            'rgba(255,215,120,0.55)',
            'rgba(255,240,180,0.45)',
            'rgba(255,200,90,0.50)'
          ]
        };

      case 'fireflies':
        // Soft glowing intermittent green/gold pulses (vert-luisants style)
        return {
          velocity: { x: 0.25, y: 0.01 },
          size: { min: 3, max: 6 },
          opacity: { min: 0.65, max: 1.0 },
          lifespan: 9000 + Math.random() * 5000,
          colors: [
            'rgba(190,255,150,1.0)',
            'rgba(210,255,170,0.95)',
            'rgba(170,240,130,0.95)',
            'rgba(255,255,180,0.95)'
          ]
        };

      case 'ambient-glow':
        return {
          velocity: { x: 0.2, y: 0.1 },
          size: { min: 20, max: 40 }, // Large glowing orbs
          opacity: { min: 0.1, max: 0.3 },
          lifespan: 30000,
          colors: ['rgba(255, 200, 100, 0.2)', 'rgba(200, 150, 80, 0.15)', 'rgba(255, 180, 120, 0.25)']
        };

      default:
        return null;
    }
  }

  /** Bias initial vertical placement so subtle particles cluster where contrast is higher */
  private computeInitialY(layer: VisualLayer, logicalH: number): number {
    if (this.uniformDistribution) {
      return Math.random() * logicalH;
    }
    if (layer === 'dust-motes' || layer === 'floating-seeds' || layer === 'fireflies') {
      // Mild bias (less extreme than before) to keep some activity near focal area
      const r = Math.random();
      const eased = 0.35 + r * 0.65; // allow full range but slightly favor mid/upper
      return eased * logicalH;
    }
    return Math.random() * logicalH;
  }

  /**
   * Get spawn rate for different layer types
   */
  private getSpawnRate(layer: VisualLayer): number {
    const baseRate = {
      'dust-motes': 1090,
      'floating-seeds': 1400,
      'cultural-symbols': 6000,
      'wind-particles': 2000,
      'victory-sparkles': 900,
      'ambient-glow': 8000,
      'fireflies': 1800
    }[layer] || 4000;

    // Adjust by intensity
    return baseRate / (0.5 + this.state.intensity);
  }

  /**
   * Adjust existing particle properties based on current mood
   */
  private adjustExistingParticleProperties(): void {
    this.state.particles.forEach(particle => {
      // Adjust opacity based on mood intensity
      const targetOpacity = particle.opacity * (0.5 + this.state.intensity * 0.5);
      particle.opacity = targetOpacity;

      // Adjust velocity based on mood
      const velocityMultiplier = this.state.currentMood === 'tense' ? 1.5 :
                                 this.state.currentMood === 'dramatic' ? 2.0 :
                                 this.state.currentMood === 'victorious' ? 1.3 : 1.0;

      particle.vx *= velocityMultiplier;
      particle.vy *= velocityMultiplier;
    });
  }

  /**
   * Start the visual layer rotation (subtle changes over time)
   */
  private startVisualLayerRotation(): void {
    const rotate = () => {
      if (!this.state.isActive) return;

      // Occasionally add/remove subtle layers for variety
      if (Math.random() < 0.1) {
        const possibleLayers: VisualLayer[] = ['dust-motes', 'floating-seeds'];
        const layer = possibleLayers[Math.floor(Math.random() * possibleLayers.length)];

        if (!this.state.activeLayers.includes(layer)) {
          this.addVisualLayer(layer);
          // Remove after some time for variation
          setTimeout(() => this.removeVisualLayer(layer), 10000 + Math.random() * 20000);
        }
      }

      // Schedule next rotation check
      setTimeout(rotate, 15000 + Math.random() * 30000);
    };

    // Start rotation
    setTimeout(rotate, 10000);
  }

  /**
   * Increase visual tension
   */
  private async increaseTension(amount: number): Promise<void> {
    this.state.intensity = Math.min(1.0, this.state.intensity + amount);

    // Add more particles and change lighting
    if (this.state.intensity > 0.7) {
      await this.addVisualLayer('wind-particles');
    }

    // Gradually decrease tension over time
    setTimeout(() => {
      this.state.intensity = Math.max(0.2, this.state.intensity - amount * 0.7);
    }, 5000);
  }

  /**
   * Update game progression (affects particle behavior)
   */
  private updateGameProgression(moveCount: number): void {
    // Estimate progression based on move count (typical game ~30-60 moves)
    this.state.gameProgression = Math.min(1.0, moveCount / 50);

    // Adjust max particles based on progression
  // Keep particle ceiling low for subtle ambience
  this.maxParticles = Math.floor(18 + this.state.gameProgression * 15); // 18 → ~33 max
  }

  /**
   * Main animation loop
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (!this.state.isActive) return;

      this.updateParticles();
      // If particles unexpectedly cleared (e.g., hot reload or external cleanup) restore baseline layers
      if (this.state.particles.length === 0 && this.state.activeLayers.length === 0) {
        this.ensureBaselineLayers();
      }
      this.renderFrame();

      this.frameCounter++;
      if (this.debug && this.debugLevel > 1 && this.frameCounter % 120 === 0) {
        const logical = this.getLogicalSize();
        console.log('✨ Atmos:', {
          particles: this.state.particles.length,
          layers: this.state.activeLayers,
          logicalSize: `${logical.width}x${logical.height}`,
          backing: this.state.canvas ? `${this.state.canvas.width}x${this.state.canvas.height}` : 'no',
          max: this.maxParticles
        });
      }

      this.state.animationFrame = requestAnimationFrame(animate);
    };

  if (this.debug && this.debugLevel > 1) console.log('✨ Starting animation loop');
    animate();
  }

  /**
   * Update all particles
   */
  private updateParticles(): void {
    const now = Date.now();
    const { width: logicalW, height: logicalH } = this.getLogicalSize();

    // Update and filter particles
    this.state.particles = this.state.particles.filter(particle => {
      // Update age
      particle.age = now - (now - particle.age);
      particle.age += 16; // ~60fps

      // Update position
      const depthSpeedFactor = 0.35 + (1 - particle.depth) * 0.65; // front layers move slightly faster
      particle.x += particle.vx * depthSpeedFactor;
      // Local vertical band behavior
      if (!this.uniformDistribution) {
        const bandSize = particle.type === 'floating-seeds'
          ? 50 + (1 - particle.depth) * 40
          : 40 + (1 - particle.depth) * 25;
        const verticalOsc = Math.sin((particle.age * 0.0006) + particle.flickerPhase) * (bandSize * 0.25);
        const baselineDrift = Math.sin((particle.age * 0.00015) + particle.flickerPhase) * 5;
        const targetY = particle.baselineY + verticalOsc + baselineDrift;
        particle.y += (targetY - particle.y) * 0.08;
        if (particle.y < particle.baselineY - bandSize) particle.y = particle.baselineY - bandSize;
        if (particle.y > particle.baselineY + bandSize) particle.y = particle.baselineY + bandSize;
      } else {
        // Free drift (slight vertical wander)
        particle.y += Math.sin((particle.age * 0.0004) + particle.flickerPhase) * 0.3;
      }

      // Occasionally (rare) reposition baseline to a nearby location to prevent stasis
      if (Math.random() < 0.0005) {
        particle.baselineY = Math.min(logicalH - 20, Math.max(20, particle.baselineY + (Math.random() - 0.5) * 80));
      }

      // Horizontal sway (wind) stronger for seeds
      if (particle.type === 'floating-seeds' || particle.type === 'dust-motes') {
        const sway = Math.sin((particle.age * 0.0005) + particle.flickerPhase) * 0.25 * (1 - particle.depth);
        particle.x += sway;
      }

      // Slight velocity damping to reduce drift accumulation
      particle.vx *= 0.992;
      particle.vy *= 0.992;

      // Update rotation
      particle.rotation += particle.rotationSpeed;

      // Apply gravity/wind effects based on particle type
      if (particle.type === 'floating-seeds') {
        particle.vy += 0.01; // Gentle gravity
      }

      // Fade out over lifetime
      if (particle.age > particle.maxAge * 0.7) {
        const fadeProgress = (particle.age - particle.maxAge * 0.7) / (particle.maxAge * 0.3);
        particle.opacity *= (1 - fadeProgress);
      }

      // Wrap around screen edges for some particle types
      // Wrap using logical size (CSS pixels)
      if (particle.x < -30) particle.x = logicalW + 30;
      if (particle.x > logicalW + 30) particle.x = -30;
      if (particle.y < -30) particle.y = logicalH + 30;
      if (particle.y > logicalH + 30) particle.y = -30;

      // Keep particle if not expired
      return particle.age < particle.maxAge && particle.opacity > 0.01;
    });

    // Persistent ambient safeguard: if ambience supposed to exist and count dropped, seed more
    if (this.persistentAmbient && this.state.particles.length < this.minAmbientParticles) {
      const needed = this.minAmbientParticles - this.state.particles.length;
      const layerPool: VisualLayer[] = this.state.activeLayers.length ? this.state.activeLayers : ['dust-motes','floating-seeds'];
      for (let i = 0; i < needed; i++) {
        const layer = layerPool[i % layerPool.length];
        const p = this.createParticle(layer);
        if (p) this.state.particles.push(p);
      }
    }
  }

  /**
   * Render the current frame
   */
  private renderFrame(): void {
    if (!this.state.context || !this.state.canvas) {
      console.warn('✨ Cannot render frame: missing context or canvas');
      return;
    }

    // Clear canvas
    this.state.context.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);

    // Apply ambient lighting overlay
    this.renderAmbientLighting();

    // Render all particles
    let renderedCount = 0;
    this.state.particles.forEach(particle => {
      this.renderParticle(particle);
      renderedCount++;
    });

    // Debug logging for rendering issues
    if (renderedCount !== this.state.particles.length) {
      console.warn('✨ Particle render mismatch:', {
        totalParticles: this.state.particles.length,
        renderedParticles: renderedCount
      });
    }
  }

  /**
   * Render ambient lighting effects
   */
  private renderAmbientLighting(): void {
    if (!this.state.context || !this.state.canvas) return;
    const { width: w, height: h } = this.getLogicalSize();
    const gradient = this.state.context.createRadialGradient(
      w * 0.5, h * 0.3,
      0,
      w * 0.5, h * 0.3,
      Math.max(w, h)
    );

    gradient.addColorStop(0, this.state.lighting.ambientColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.state.context.fillStyle = gradient;
    const { width: lw, height: lh } = this.getLogicalSize();
    this.state.context.fillRect(0, 0, lw, lh);
    // Lighten lower zone very subtly so particles there aren't completely lost
    const lowerFade = this.state.context.createLinearGradient(0, h * 0.55, 0, h);
    lowerFade.addColorStop(0, 'rgba(255,255,255,0)');
    lowerFade.addColorStop(1, 'rgba(255,255,255,0.04)');
    this.state.context.fillStyle = lowerFade;
    this.state.context.fillRect(0, h * 0.55, w, h * 0.45);
  }

  /**
   * Render a single particle
   */
  private renderParticle(particle: Particle): void {
    if (!this.state.context) return;

    this.state.context.save();

    // Set particle properties
  // Apply visibility boost (clamped) mainly for debugging/adjustments
  const boostedOpacity = Math.min(1, particle.opacity * this.visibilityBoost);
  const baseSize = particle.size * (0.6 + (1 - particle.depth) * 0.8); // depth-based scaling
  const boostedSize = baseSize * this.visibilityBoost;
  // Flicker + depth dimming
  const flicker = 0.85 + 0.15 * Math.sin((particle.age * 0.001) + particle.flickerPhase);
  let finalOpacity = Math.min(1, boostedOpacity * flicker * (0.65 + (1 - particle.depth) * 0.35) * this.themeOpacityMultiplier);
  // Ensure a slightly higher minimum for core subtle layers so they remain perceivable over textured wood
  if (finalOpacity < 0.12 && (particle.type === 'dust-motes' || particle.type === 'floating-seeds')) {
    finalOpacity = 0.12;
  } else if (finalOpacity < 0.08) {
    finalOpacity = 0.08;
  }
  this.state.context.globalAlpha = finalOpacity;
    this.state.context.fillStyle = particle.color;

    // Translate to particle position
    this.state.context.translate(particle.x, particle.y);
    this.state.context.rotate(particle.rotation);

    // Render based on particle type
    switch (particle.type) {
      case 'dust-motes': {
        // Soft radial gradient mote
        const g = this.state.context.createRadialGradient(0, 0, 0, 0, 0, boostedSize);
        // Warmer core -> transparent edge
        const core = particle.color;
        const edge = particle.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0)');
        g.addColorStop(0, core);
        g.addColorStop(1, edge);
        this.state.context.fillStyle = g;
        this.state.context.beginPath();
        this.state.context.arc(0, 0, boostedSize, 0, Math.PI * 2);
        this.state.context.fill();
        break; }

      case 'wind-particles': {
        this.state.context.beginPath();
        this.state.context.arc(0, 0, boostedSize * 0.8, 0, Math.PI * 2);
        this.state.context.fill();
        break; }

      case 'floating-seeds': {
        const g2 = this.state.context.createRadialGradient(0, 0, 0, 0, 0, boostedSize);
        const core2 = particle.color;
        const edge2 = particle.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0)');
        g2.addColorStop(0, core2);
        g2.addColorStop(1, edge2);
        this.state.context.fillStyle = g2;
        this.state.context.beginPath();
        this.state.context.ellipse(0, 0, boostedSize * 1.1, boostedSize * 0.5, 0, 0, Math.PI * 2);
        this.state.context.fill();
        break; }

      case 'fireflies': {
        // Additive blended pulse with bright core
        const pulse = 0.55 + 0.45 * Math.sin((particle.age * 0.004) + particle.flickerPhase);
        const fireflySize = boostedSize * (0.9 + pulse * 0.9);
        const coreSize = fireflySize * 0.35;
        const base = particle.color;
        const haloColor = base.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0)');
        this.state.context.globalCompositeOperation = 'lighter';
        const gOuter = this.state.context.createRadialGradient(0, 0, 0, 0, 0, fireflySize);
        gOuter.addColorStop(0, base.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, 'rgba($1,$2,$3,0.9)'));
        gOuter.addColorStop(0.5, base.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, 'rgba($1,$2,$3,0.25)'));
        gOuter.addColorStop(1, haloColor);
        this.state.context.fillStyle = gOuter;
        this.state.context.beginPath();
        this.state.context.arc(0, 0, fireflySize, 0, Math.PI * 2);
        this.state.context.fill();
        // Core
        const gCore = this.state.context.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        gCore.addColorStop(0, '#fff');
        gCore.addColorStop(1, base.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, 'rgba($1,$2,$3,0)'));
        this.state.context.fillStyle = gCore;
        this.state.context.beginPath();
        this.state.context.arc(0, 0, coreSize, 0, Math.PI * 2);
        this.state.context.fill();
        this.state.context.globalCompositeOperation = 'source-over';
        break; }

      case 'cultural-symbols':
        // Render simple geometric symbol
        this.state.context.beginPath();
        this.state.context.moveTo(-boostedSize/2, -boostedSize/2);
        this.state.context.lineTo(boostedSize/2, -boostedSize/2);
        this.state.context.lineTo(0, boostedSize/2);
        this.state.context.closePath();
        this.state.context.fill();
        break;

      case 'victory-sparkles':
        // Render sparkle as star shape
        this.renderStar(0, 0, boostedSize, 5);
        this.state.context.fill();
        break;

      default:
        this.state.context.beginPath();
        this.state.context.arc(0, 0, boostedSize, 0, Math.PI * 2);
        this.state.context.fill();
    }

    if (this.debug && this.visibilityBoost > 1) {
      this.state.context.strokeStyle = 'rgba(255,255,255,0.4)';
      this.state.context.lineWidth = 0.5;
      this.state.context.stroke();
    }

    this.state.context.restore();
  }

  /** Safety: if layers got cleared externally, re-add minimal ambient set */
  private ensureBaselineLayers() {
    if (this.state.activeLayers.length === 0) {
      this.addVisualLayer('dust-motes');
      this.addVisualLayer('floating-seeds');
      // fireflies only if dark enough (theme adaptation will catch later)
    }
  }

  /**
   * Render star shape for sparkles
   */
  private renderStar(x: number, y: number, radius: number, points: number): void {
    if (!this.state.context) return;

    this.state.context.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;

      if (i === 0) {
        this.state.context.moveTo(px, py);
      } else {
        this.state.context.lineTo(px, py);
      }
    }

    this.state.context.closePath();
  }

  /**
   * Get current state for debugging
   */
  getState(): VisualAtmosphereState {
    return { ...this.state };
  }

  /** Enable or disable verbose debugging/logging */
  setDebug(enabled: boolean) {
    this.debug = !!enabled;
  }

  /** Adjust visibility boost (e.g., awaleAtmosphere.setVisibilityBoost(2)) */
  setVisibilityBoost(multiplier: number) {
    this.visibilityBoost = Math.max(0.1, Math.min(4, multiplier || 1));
  }

  /** Set debug verbosity externally (0 silent,1 minimal,2 verbose) */
  setDebugLevel(level: 0 | 1 | 2) { this.debugLevel = level; }

  /** Spawn a burst of particles for a given layer for quick visual testing */
  burst(layer: VisualLayer = 'floating-seeds', count = 25) {
    for (let i = 0; i < count; i++) {
      const p = this.createParticle(layer);
      if (p) this.state.particles.push(p);
    }
  if (this.debug && this.debugLevel > 1) console.log(`✨ Burst spawned ${count} ${layer} (now ${this.state.particles.length} total)`);
  }

  /** Adapt opacity multiplier based on container background brightness */
  private adaptToTheme() {
    if (!this.state.canvas) return;
    let node: HTMLElement | null = this.state.canvas.parentElement;
    let bg = 'rgba(0,0,0,0)';
    while (node) {
      const cs = window.getComputedStyle(node);
      bg = cs.backgroundColor;
      if (!/rgba?\(0,\s*0,\s*0,\s*0\)/.test(bg)) break;
      node = node.parentElement;
    }
    if (!node) bg = window.getComputedStyle(document.body).backgroundColor;
    let luminance = 0.5;
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const r = parseInt(m[1], 10) / 255;
      const g = parseInt(m[2], 10) / 255;
      const b = parseInt(m[3], 10) / 255;
      luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    this.themeOpacityMultiplier = luminance < 0.38 ? 1.5 : luminance > 0.78 ? 0.8 : 1.0;
    if (luminance < 0.5) {
      this.maxParticles = 74;
      if (!this.state.activeLayers.includes('fireflies')) this.addVisualLayer('fireflies');
    } else {
      this.maxParticles = 60;
      if (this.state.activeLayers.includes('fireflies') && luminance > 0.62) this.removeVisualLayer('fireflies');
    }
    if (this.debug && this.debugLevel > 1) console.log('✨ Theme adaptation:', { bg, lum: luminance.toFixed(2), mul: this.themeOpacityMultiplier });
  }

  /** Jitter RGBA color slightly for natural variation */
  private jitterColor(rgba: string, amount: number): string {
    const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([0-9\.]+)?\)/);
    if (!m) return rgba;
    const r = this.jitterChannel(parseInt(m[1], 10), amount);
    const g = this.jitterChannel(parseInt(m[2], 10), amount);
    const b = this.jitterChannel(parseInt(m[3], 10), amount);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    return `rgba(${r},${g},${b},${a})`;
  }
  private jitterChannel(v: number, amount: number) {
    const delta = (Math.random() * 2 - 1) * amount;
    const nv = Math.min(255, Math.max(0, Math.round(v + v * delta)));
    return nv;
  }

  /** Public helper to ensure fireflies layer is active */
  enableFireflies() {
    if (!this.state.activeLayers.includes('fireflies')) {
      // Use internal addVisualLayer via bracket access if private
      (this as any).addVisualLayer('fireflies');
    }
  }

  /** Spawn a dramatic firefly burst for debugging */
  fireflyBurst(count = 15) {
    this.enableFireflies();
    this.burst('fireflies', count);
  }

  /** Expand distribution to full screen and reseed */
  enableUniformDistribution() {
    this.uniformDistribution = true;
    // Reassign baselines so existing particles can drift freely
    const { height } = this.getLogicalSize();
    this.state.particles.forEach(p => { p.baselineY = Math.random() * height; });
    // Seed extra to fill lower region immediately
    for (let i = 0; i < 12; i++) {
      const p = this.createParticle('dust-motes');
      if (p) this.state.particles.push(p);
    }
  }

  /** Force baseline ambient layers & reseed particles */
  forceAmbient() {
    this.ensureBaselineLayers();
    for (let i = 0; i < 25; i++) {
      const p = this.createParticle(i % 2 === 0 ? 'dust-motes' : 'floating-seeds');
      if (p) this.state.particles.push(p);
    }
  }

  /** Strongly reseed dust motes for visibility tuning */
  reinforceDust(count = 35) {
    if (!this.state.activeLayers.includes('dust-motes')) {
      (this as any).addVisualLayer('dust-motes');
    }
    for (let i = 0; i < count; i++) {
      const p = this.createParticle('dust-motes');
      if (p) {
        p.opacity *= 1.2;
        p.size *= 1.15;
        this.state.particles.push(p);
      }
    }
  }

  /** Promote canvas to fullscreen overlay (if container too small) */
  promoteToFullscreen() {
    if (!this.state.canvas) return;
    const cv = this.state.canvas;
    if (cv.parentElement !== document.body) {
      cv.parentElement?.removeChild(cv);
      document.body.appendChild(cv);
    }
    cv.style.position = 'fixed';
    cv.style.top = '0';
    cv.style.left = '0';
    cv.style.width = '100vw';
    cv.style.height = '100vh';
    cv.style.zIndex = '7';
    this.resizeCanvas();
    if (this.debug && this.debugLevel > 0) console.log('✨ Canvas promoted to fullscreen overlay');
  }

  /** High-contrast debug flash to verify canvas visibility */
  flashTest() {
    for (let i = 0; i < 12; i++) {
      const p = this.createParticle('dust-motes');
      if (p) {
        p.opacity = 1;
        p.size = 12 + Math.random() * 10;
        p.color = 'rgba(255,255,255,1)';
        this.state.particles.push(p);
      }
    }
    console.log('✨ flashTest injected high-contrast particles (white)');
  }
}

// Export singleton instance
export const visualAtmosphere = new VisualAtmosphereManager();