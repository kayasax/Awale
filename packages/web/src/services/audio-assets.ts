/**
 * 🎵 Audio Assets Configuration
 *
 * Defines all available audio tracks for the Awale ambient experience
 *
 * Note: This file lists audio assets that would be included in a production version.
 * For development, we'll use placeholder paths and gracefully handle missing files.
 */

import { AudioTrackConfig } from './ambient-audio';

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

export interface AudioAssetCollection {
  music: Record<string, AudioTrackConfig>;
  ambient: Record<string, AudioTrackConfig>;
  effects: Record<string, AudioTrackConfig>;
}

/**
 * All available audio assets organized by category
 */
export const AUDIO_ASSETS: AudioAssetCollection = {
  // 🎵 Background Music - Use the actual files that exist
  music: {
    'african-whistle': {
      url: `${getAudioBaseUrl()}/audio/music/african-whistle-398936.mp3`, // This file actually exists!
      loop: true,
      volume: 0.6,
      fadeInDuration: 2.0,
      fadeOutDuration: 1.5
    },
    'traditional-kora': {
      url: `${getAudioBaseUrl()}/audio/music/traditional-kora.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.5,
      fadeInDuration: 2.5,
      fadeOutDuration: 2.0
    },
    'peaceful-drums': {
      url: `${getAudioBaseUrl()}/audio/music/peaceful-drums.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.7,
      fadeInDuration: 1.5,
      fadeOutDuration: 1.5
    },
    'gentle-ambient': {
      url: `${getAudioBaseUrl()}/audio/music/gentle-ambient.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.4,
      fadeInDuration: 3.0,
      fadeOutDuration: 2.5
    }
  },

  // 🌿 Ambient Nature Sounds - African Wildlife/Jungle
  ambient: {
    'gentle-wind': {
      url: `${getAudioBaseUrl()}/audio/ambient/gentle-wind.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.2,
      fadeInDuration: 5.0,
      fadeOutDuration: 4.0
    },
    'savanna-evening': {
      url: `${getAudioBaseUrl()}/audio/ambient/savanna-evening.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.25,
      fadeInDuration: 3.5,
      fadeOutDuration: 3.0
    },
    'forest-birds': {
      url: `${getAudioBaseUrl()}/audio/ambient/forest-birds.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.3,
      fadeInDuration: 4.0,
      fadeOutDuration: 3.0
    },
    'desert-wind': {
      url: `${getAudioBaseUrl()}/audio/ambient/desert-wind.mp3`, // Fallback to tone if missing
      loop: true,
      volume: 0.15,
      fadeInDuration: 4.5,
      fadeOutDuration: 4.0
    }
  },

  // 🔊 Game Sound Effects - Enhanced Interaction Sounds
  effects: {
    'wood-click': {
      url: `${getAudioBaseUrl()}/audio/effects/wood-click.wav`, // This file exists
      loop: false,
      volume: 0.8,
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'success': {
      url: `${getAudioBaseUrl()}/audio/effects/success.wav`, // This file exists
      loop: false,
      volume: 0.9,
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'seed-drop': {
      url: `${getAudioBaseUrl()}/audio/effects/seed-drop.wav`, // Generated gentle WAV file
      loop: false,
      volume: 0.4, // Much quieter volume
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'seed-capture': {
      url: `${getAudioBaseUrl()}/audio/effects/seed-capture.mp3`, // Fallback to tone if missing
      loop: false,
      volume: 0.9,
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'game-start': {
      url: `${getAudioBaseUrl()}/audio/effects/game-start.mp3`, // Fallback to tone if missing
      loop: false,
      volume: 0.7,
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'game-end-win': {
      url: `${getAudioBaseUrl()}/audio/effects/game-end-win.mp3`, // Fallback to tone if missing
      loop: false,
      volume: 0.8,
      fadeInDuration: 0,
      fadeOutDuration: 0
    },
    'move-invalid': {
      url: `${getAudioBaseUrl()}/audio/effects/move-invalid.mp3`, // Fallback to tone if missing
      loop: false,
      volume: 0.4,
      fadeInDuration: 0,
      fadeOutDuration: 0
    }
  }
};

/**
 * Music Track Playlists for Different Moods
 */
export const MUSIC_PLAYLISTS = {
  // Default peaceful background music - ONLY use existing files
  peaceful: ['african-marimba'], // Only the file that actually exists

  // More rhythmic for active gameplay
  rhythmic: ['african-marimba'], // Only the file that actually exists

  // Ultra-calm for meditation/focus
  meditative: ['african-marimba'], // Only the file that actually exists

  // All tracks shuffled - ONLY existing files
  all: ['african-marimba'] // Only the file that actually exists
};

/**
 * Ambient Sound Combinations for Different Atmospheres
 */
export const AMBIENT_SCENES = {
  // Peaceful savanna evening
  savanna: ['african-birds', 'gentle-wind', 'savanna-evening'],

  // Tropical forest atmosphere
  forest: ['african-birds', 'water-stream', 'gentle-wind'],

  // Dramatic but calming weather
  storm: ['distant-thunder', 'gentle-wind', 'water-stream'],

  // Pure nature sounds
  nature: ['african-birds', 'water-stream'],

  // Minimal ambient for focus
  minimal: ['gentle-wind']
};

/**
 * Get a random track from a category
 */
export function getRandomTrack(category: keyof AudioAssetCollection): string {
  const tracks = Object.keys(AUDIO_ASSETS[category]);
  return tracks[Math.floor(Math.random() * tracks.length)];
}

/**
 * Get a random music playlist
 */
export function getRandomPlaylist(): string[] {
  const playlists = Object.values(MUSIC_PLAYLISTS);
  const playlist = playlists[Math.floor(Math.random() * playlists.length)];

  // Shuffle the selected playlist
  return [...playlist].sort(() => Math.random() - 0.5);
}

/**
 * Get a random ambient scene
 */
export function getRandomAmbientScene(): string[] {
  const scenes = Object.values(AMBIENT_SCENES);
  return scenes[Math.floor(Math.random() * scenes.length)];
}

/**
 * Check if an audio file exists (for graceful fallback)
 */
export async function checkAudioFileExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get fallback audio configuration for development/testing
 */
export function getFallbackAudioConfig(): AudioAssetCollection {
  // For development, we can use Web Audio API to generate simple tones
  // or provide silence/placeholder sounds
  return {
    music: {
      'placeholder-music': {
        url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUnBTSEx/DFdiMfD2ux5+CZSA0PVaLh8bllHgU7k9n0w3kjBSl+zPLZgjEGHm/A7+OZUQ0NTKXh8bVoIQc8kdry0HoqBSl9y/Hei0MLGGq+7eBUGg0RTqX4z7d9XwMjVMHq5pJQDg==', // Placeholder silence
        loop: true,
        volume: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0
      }
    },
    ambient: {
      'placeholder-ambient': {
        url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUnBTSEx/DFdiMfD2ux5+CZSA0PVaLh8bllHgU7k9n0w3kjBSl+zPLZgjEGHm/A7+OZUQ0NTKXh8bVoIQc8kdry0HoqBSl9y/Hei0MLGGq+7eBUGg0RTqX4z7d9XwMjVMHq5pJQDg==',
        loop: true,
        volume: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0
      }
    },
    effects: {
      'placeholder-effect': {
        url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUnBTSEx/DFdiMfD2ux5+CZSA0PVaLh8bllHgU7k9n0w3kjBSl+zPLZgjEGHm/A7+OZUQ0NTKXh8bVoIQc8kdry0HoqBSl9y/Hei0MLGGq+7eBUGg0RTqX4z7d9XwMjVMHq5pJQDg==',
        loop: false,
        volume: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0
      }
    }
  };
}