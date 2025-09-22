/**
 * 🔍 PostHog Analytics Integration
 * Server-side analytics for Awale multiplayer game
 */

import { PostHog } from 'posthog-node';

// PostHog configuration
const POSTHOG_API_KEY = 'phc_witsM6gj8k6GOor3RUBiN7vUPId11R2LMShF8lTUcBD';
const POSTHOG_HOST = 'https://eu.i.posthog.com'; // EU instance

// Game types for analytics
export type GameType = 'pvp' | 'lobby-invitation' | 'direct-join';
export type GameEndReason = 'natural-end' | 'resignation' | 'timeout' | 'disconnect';

interface GameAnalytics {
  gameId: string;
  gameType: GameType;
  playerCount: number;
  duration?: number;
  movesPlayed?: number;
  endReason?: GameEndReason;
  winner?: 'host' | 'guest' | 'draw';
}

interface LobbyAnalytics {
  connectedPlayers: number;
  availablePlayers: number;
  inGamePlayers: number;
  activeGames: number;
}

class AnalyticsService {
  private posthog: PostHog | null = null;
  private enabled: boolean = false;

  constructor() {
    // Only initialize PostHog if API key is available
    if (POSTHOG_API_KEY && POSTHOG_API_KEY.startsWith('phc_')) {
      try {
        this.posthog = new PostHog(POSTHOG_API_KEY, {
          host: POSTHOG_HOST,
          flushAt: 20, // Batch events
          flushInterval: 10000, // 10 seconds
        });
        this.enabled = true;
        console.log('📊 PostHog analytics initialized (EU instance)');
      } catch (error) {
        console.error('❌ Failed to initialize PostHog:', error);
        this.enabled = false;
      }
    } else {
      console.log('⚪ PostHog analytics disabled (no API key)');
      this.enabled = false;
    }
  }

  /**
   * Track game creation event
   */
  trackGameCreated(gameId: string, gameType: GameType, hostId: string) {
    if (!this.enabled) return;

    this.posthog?.capture({
      distinctId: hostId,
      event: 'game_created',
      properties: {
        game_id: gameId,
        game_type: gameType,
        timestamp: Date.now(),
        server_region: 'eu',
      },
    });

    console.log(`📊 Analytics: Game created - ${gameId} (${gameType})`);
  }

  /**
   * Track when a player joins a game
   */
  trackPlayerJoined(gameId: string, playerId: string, role: 'host' | 'guest', gameType: GameType) {
    if (!this.enabled) return;

    this.posthog?.capture({
      distinctId: playerId,
      event: 'game_joined',
      properties: {
        game_id: gameId,
        player_role: role,
        game_type: gameType,
        timestamp: Date.now(),
      },
    });

    console.log(`📊 Analytics: Player joined - ${playerId} as ${role} in ${gameId}`);
  }

  /**
   * Track game start (when both players are present and first move made)
   */
  trackGameStarted(gameId: string, gameType: GameType, hostId: string, guestId: string) {
    if (!this.enabled) return;

    // Track for both players
    [hostId, guestId].forEach((playerId) => {
      this.posthog?.capture({
        distinctId: playerId,
        event: 'game_started',
        properties: {
          game_id: gameId,
          game_type: gameType,
          player_count: 2,
          timestamp: Date.now(),
        },
      });
    });

    console.log(`📊 Analytics: Game started - ${gameId} (${gameType})`);
  }

  /**
   * Track game completion
   */
  trackGameEnded(analytics: GameAnalytics, hostId: string, guestId?: string) {
    if (!this.enabled) return;

    const baseProperties = {
      game_id: analytics.gameId,
      game_type: analytics.gameType,
      game_duration: analytics.duration,
      moves_played: analytics.movesPlayed,
      end_reason: analytics.endReason,
      winner: analytics.winner,
      timestamp: Date.now(),
    };

    // Track for host
    this.posthog?.capture({
      distinctId: hostId,
      event: 'game_ended',
      properties: {
        ...baseProperties,
        player_role: 'host',
        player_won: analytics.winner === 'host',
      },
    });

    // Track for guest if present
    if (guestId) {
      this.posthog?.capture({
        distinctId: guestId,
        event: 'game_ended',
        properties: {
          ...baseProperties,
          player_role: 'guest',
          player_won: analytics.winner === 'guest',
        },
      });
    }

    console.log(`📊 Analytics: Game ended - ${analytics.gameId} (${analytics.endReason})`);
  }

  /**
   * Track lobby statistics periodically
   */
  trackLobbyMetrics(metrics: LobbyAnalytics) {
    if (!this.enabled) return;

    this.posthog?.capture({
      distinctId: 'server-metrics',
      event: 'lobby_metrics',
      properties: {
        connected_players: metrics.connectedPlayers,
        available_players: metrics.availablePlayers,
        in_game_players: metrics.inGamePlayers,
        active_games: metrics.activeGames,
        timestamp: Date.now(),
      },
    });

    console.log(`📊 Analytics: Lobby metrics - ${metrics.connectedPlayers} connected, ${metrics.activeGames} active games`);
  }

  /**
   * Track lobby connection events
   */
  trackLobbyConnection(playerId: string, playerName: string, action: 'connect' | 'disconnect') {
    if (!this.enabled) return;

    this.posthog?.capture({
      distinctId: playerId,
      event: `lobby_${action}`,
      properties: {
        player_name: playerName,
        timestamp: Date.now(),
      },
    });

    console.log(`📊 Analytics: Lobby ${action} - ${playerName} (${playerId})`);
  }

  /**
   * Track game invitations
   */
  trackInvitation(fromId: string, toId: string, action: 'sent' | 'accepted' | 'declined') {
    if (!this.enabled) return;

    this.posthog?.capture({
      distinctId: fromId,
      event: `invitation_${action}`,
      properties: {
        from_player: fromId,
        to_player: toId,
        action,
        timestamp: Date.now(),
      },
    });

    console.log(`📊 Analytics: Invitation ${action} - ${fromId} → ${toId}`);
  }

  /**
   * Flush any pending events (call on server shutdown)
   */
  async flush() {
    if (!this.enabled || !this.posthog) return;

    try {
      await this.posthog.flush();
      console.log('📊 Analytics: Flushed pending events');
    } catch (error) {
      console.error('❌ Failed to flush analytics:', error);
    }
  }

  /**
   * Shutdown analytics service
   */
  async shutdown() {
    if (!this.enabled || !this.posthog) return;

    try {
      await this.posthog.shutdown();
      console.log('📊 Analytics: Service shutdown');
    } catch (error) {
      console.error('❌ Failed to shutdown analytics:', error);
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Helper function to determine game type
export function getGameType(creationMethod: 'create' | 'join' | 'lobby-invitation'): GameType {
  switch (creationMethod) {
    case 'lobby-invitation':
      return 'lobby-invitation';
    case 'join':
      return 'direct-join';
    default:
      return 'pvp';
  }
}

// Helper to calculate game duration
export function calculateGameDuration(startTime: number, endTime: number): number {
  return Math.round((endTime - startTime) / 1000); // Duration in seconds
}