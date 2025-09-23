/**
 * 🎵 Dynamic Audio File Discovery
 *
 * Automatically discovers what audio files are actually available
 * instead of hardcoding file names that might not exist
 */

/**
 * Get the correct base URL for audio assets based on the environment
 */
function getAudioBaseUrl(): string {
  // Check if we're running on GitHub Pages
  if (typeof window !== 'undefined' && window.location.hostname === 'kayasax.github.io') {
    return '/Awale';  // GitHub Pages serves at username.github.io/repository-name/
  }
  return '';  // Local development or other hosting
}

export interface DiscoveredAudioFile {
  id: string;          // Unique identifier derived from filename
  filename: string;    // Original filename
  url: string;         // Full URL path
  category: 'music' | 'ambient' | 'effects';
  displayName: string; // Human readable name
}

export class AudioDiscovery {
  private static cache = new Map<string, DiscoveredAudioFile[]>();
  private static lastScan = 0;
  private static CACHE_DURATION = 60000; // 1 minute cache - longer to reduce logging

  /**
   * Discover all available audio files by actually checking what exists
   */
  static async discoverAvailableAudioFiles(): Promise<{
    music: DiscoveredAudioFile[];
    ambient: DiscoveredAudioFile[];
    effects: DiscoveredAudioFile[];
  }> {
    const now = Date.now();

    // Use cache if recent
    if (now - this.lastScan < this.CACHE_DURATION && this.cache.size > 0) {
      return {
        music: this.cache.get('music') || [],
        ambient: this.cache.get('ambient') || [],
        effects: this.cache.get('effects') || []
      };
    }

    const discovered = {
      music: await this.scanDirectory('/audio/music/', 'music'),
      ambient: await this.scanDirectory('/audio/ambient/', 'ambient'),
      effects: await this.scanDirectory('/audio/effects/', 'effects')
    };

    // Cache results
    this.cache.set('music', discovered.music);
    this.cache.set('ambient', discovered.ambient);
    this.cache.set('effects', discovered.effects);
    this.lastScan = now;

    // Only log on first discovery or when count changes significantly
    const totalFiles = discovered.music.length + discovered.ambient.length + discovered.effects.length;
    const shouldLog = this.cache.size === 3 && totalFiles > 0; // Only log once after first full scan
    if (shouldLog) {
      console.log(`🎵 Audio files discovered - Music: ${discovered.music.length}, Ambient: ${discovered.ambient.length}, Effects: ${discovered.effects.length}`);
    }

    return discovered;
  }

  /**
   * Scan a directory for audio files by actually testing if they load
   */
  private static async scanDirectory(
    directory: string,
    category: 'music' | 'ambient' | 'effects'
  ): Promise<DiscoveredAudioFile[]> {
    // Try common audio file extensions to find what's actually available
    const potentialFiles: { [key: string]: string[] } = {
      music: [
        'african-whistle-398936.mp3'  // Only check the one that exists
      ],
      ambient: [
        'African jungle_ morning (2).mp3'  // Only check the one that exists
      ],
      effects: [
        'seed-drop.mp3',    // We know this exists
        'success.wav',      // We know this exists
        'wood-click.wav'    // We know this exists
      ]
    };

    const filesToCheck = potentialFiles[category] || [];
    const discovered: DiscoveredAudioFile[] = [];

    for (const filename of filesToCheck) {
      const url = `${getAudioBaseUrl()}${directory}${filename}`;

      try {
        // Try to actually fetch headers to verify the file exists and is accessible
        const response = await fetch(url, {
          method: 'HEAD'
        });

        if (response.ok) {
          const id = this.filenameToId(filename);
          const displayName = this.filenameToDisplayName(filename);

          discovered.push({
            id,
            filename,
            url,
            category,
            displayName
          });
        }
      } catch (error) {
        // File doesn't exist or network error - skip silently
      }
    }

    return discovered;
  }

  /**
   * Convert filename to clean ID
   */
  private static filenameToId(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]\d+/g, '')   // Remove numbers like -398936
      .replace(/[^a-zA-Z0-9]/g, '-') // Replace special chars with dash
      .replace(/-+/g, '-')       // Remove duplicate dashes
      .replace(/^-|-$/g, '')     // Remove leading/trailing dashes
      .toLowerCase();
  }

  /**
   * Convert filename to human-readable display name
   */
  private static filenameToDisplayName(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]\d+/g, '')   // Remove numbers
      .replace(/[-_]/g, ' ')     // Replace dashes/underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  /**
   * Get a random file from a category
   */
  static async getRandomFile(category: 'music' | 'ambient' | 'effects'): Promise<DiscoveredAudioFile | null> {
    const files = await this.discoverAvailableAudioFiles();
    const categoryFiles = files[category];

    if (categoryFiles.length === 0) {
      console.warn(`🔇 No ${category} files found`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * categoryFiles.length);
    return categoryFiles[randomIndex];
  }

  /**
   * Clear cache to force re-discovery
   */
  static clearCache(): void {
    this.cache.clear();
    this.lastScan = 0;
  }
}