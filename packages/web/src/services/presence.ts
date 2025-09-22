/**
 * 🌐 Lobby Presence Service
 * Manages WebSocket connection for lobby functionality including:
 * - Player presence and status
 * - Real-time chat
 * - Game invitations
 * - Online player list
 */

import { OnlineClient } from '../online/connection';
import { ServerToClient, ClientToServer, LobbyPlayer, ChatMessage, GameInvitation } from '../online/protocol';
import { ProfileService } from './profile';

export interface PresenceState {
  isConnected: boolean;
  players: LobbyPlayer[];
  messages: ChatMessage[];
  pendingInvitations: GameInvitation[];
  currentPlayer?: LobbyPlayer;
}

export type PresenceListener = (state: PresenceState) => void;
export type GameStartCallback = (gameId: string, role: 'host' | 'guest') => void;

export class PresenceService {
  private static client: OnlineClient | null = null;
  private static state: PresenceState = {
    isConnected: false,
    players: [],
    messages: [],
    pendingInvitations: []
  };
  private static listeners: Set<PresenceListener> = new Set();
  private static gameStartCallback: GameStartCallback | null = null;
  private static unsubscribe: (() => void) | null = null;
  private static initialPlayerIds: Set<string> = new Set(); // Track initial players

  /**
   * Connect to lobby with current player profile
   */
  static async connect(serverUrl: string): Promise<void> {
    if (this.client) {
      console.log('🌐 Already connected to lobby');
      return;
    }

    console.log('🌐 Connecting to lobby:', serverUrl);

    const profile = ProfileService.getProfile();
    this.client = new OnlineClient({ url: serverUrl });

    // Set up reconnection handler
    this.client.setOnReconnect(() => {
      console.log('🌐 WebSocket reconnected, rejoining lobby...');
      this.joinLobby();
    });

    // Subscribe to messages
    this.unsubscribe = this.client.on((msg: ServerToClient) => {
      this.handleMessage(msg);
    });

    // Connect and set up connection event handler
    this.client.connect();

    // Set up a connection check with better timing and timeout
    let attemptCount = 0;
    const maxAttempts = 50; // 5 seconds max wait
    const checkConnectionAndJoin = () => {
      attemptCount++;
      if (this.client && this.client.isConnected()) {
        console.log('🌐 WebSocket connected, joining lobby...');
        this.joinLobby();
      } else if (attemptCount < maxAttempts) {
        // Retry after a shorter interval if not connected yet
        setTimeout(checkConnectionAndJoin, 100);
      } else {
        console.warn('🌐 Failed to connect to lobby after', maxAttempts * 100, 'ms');
      }
    };

    // Start checking connection after a brief delay
    setTimeout(checkConnectionAndJoin, 200);
  }

  /**
   * Disconnect from lobby
   */
  static disconnect(): void {
    console.log('🌐 Disconnecting from lobby...');
    
    if (this.client) {
      this.sendMessage({ type: 'lobby', action: 'leave' });
      this.client.close();
      this.client = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Reset all state to clean slate
    this.state = {
      isConnected: false,
      players: [],
      messages: [],
      pendingInvitations: [],
      currentPlayer: undefined
    };

    // Clear initial player tracking
    this.initialPlayerIds.clear();

    console.log('🌐 Lobby state reset');
    this.notifyListeners();
  }

  /**
   * Join the lobby with player profile
   */
  private static joinLobby(): void {
    const profile = ProfileService.getProfile();
    console.log('🌐 Joining lobby with profile:', { id: profile.id, name: profile.name });
    this.sendMessage({
      type: 'lobby',
      action: 'join',
      playerId: profile.id,
      playerName: profile.name,
      avatar: profile.avatar
    });
  }

  /**
   * Send chat message
   */
  static sendChatMessage(message: string): void {
    if (!message.trim()) return;

    this.sendMessage({
      type: 'lobby',
      action: 'chat',
      message: message.trim()
    });
  }

  /**
   * Send game invitation to another player
   */
  static sendInvitation(targetPlayerId: string): void {
    this.sendMessage({
      type: 'lobby',
      action: 'invite',
      targetPlayerId
    });
  }

  /**
   * Accept game invitation
   */
  static acceptInvitation(inviteId: string): void {
    const invitation = this.state.pendingInvitations.find(inv => inv.id === inviteId);
    console.log('🌐 Attempting to accept invitation:', inviteId);
    console.log('🌐 Found invitation in pending list:', invitation ? 'YES' : 'NO');

    if (invitation) {
      const ageMs = Date.now() - invitation.timestamp;
      console.log('🌐 Invitation age:', Math.floor(ageMs / 1000), 'seconds');
    }

    this.sendMessage({
      type: 'lobby',
      action: 'accept-invite',
      inviteId
    });
  }

  /**
   * Decline game invitation
   */
  static declineInvitation(inviteId: string): void {
    this.sendMessage({
      type: 'lobby',
      action: 'decline-invite',
      inviteId
    });
  }

  /**
   * Update player status
   */
  static updateStatus(status: 'available' | 'away'): void {
    this.sendMessage({
      type: 'lobby',
      action: 'status',
      status
    });
  }

  /**
   * Get current lobby state
   */
  static getState(): PresenceState {
    return { ...this.state };
  }

  /**
   * Subscribe to lobby state changes
   */
  static subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set callback for when a game starts
   */
  static setGameStartCallback(callback: GameStartCallback | null): void {
    this.gameStartCallback = callback;
  }

  /**
   * Deduplicate players by ID
   */
  private static deduplicatePlayers(players: LobbyPlayer[]): LobbyPlayer[] {
    const seen = new Set<string>();
    const result: LobbyPlayer[] = [];
    
    for (const player of players) {
      if (!seen.has(player.id)) {
        seen.add(player.id);
        result.push(player);
      } else {
        console.warn('🌐 Duplicate player detected and removed:', player.name, player.id);
      }
    }
    
    return result;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private static handleMessage(msg: ServerToClient): void {
    console.log('🌐 Lobby message received:', msg);

    // Handle error messages
    if (msg.type === 'error') {
      console.error('🌐 Server error:', msg.code, msg.message);

      // Handle specific error cases
      if (msg.code === 'INVITATION_NOT_FOUND') {
        console.warn('🌐 Invitation expired or not found - removing from pending invitations');
        // Clear any stale invitations that might be causing issues
        this.state.pendingInvitations = [];
      }

      // Still notify listeners so UI can show error state if needed
      this.notifyListeners();
      return;
    }

    // Handle game transition messages
    if (msg.type === 'joined' && 'gameId' in msg && 'role' in msg) {
      console.log('🎮 Game joined! GameId:', msg.gameId, 'Role:', msg.role);
      if (this.gameStartCallback) {
        this.gameStartCallback(msg.gameId, msg.role);
      }
      return; // Don't notify listeners for game messages
    }

    if (msg.type === 'lobby') {
      if ('players' in msg) {
        // Initial lobby state - apply deduplication
        const uniquePlayers = this.deduplicatePlayers(msg.players);
        this.state.players = uniquePlayers;
        this.state.messages = msg.messages || [];
        this.state.isConnected = true;

        // Track initial player IDs to avoid duplicating them on player-joined events
        this.initialPlayerIds.clear();
        uniquePlayers.forEach(player => this.initialPlayerIds.add(player.id));

        // Find current player
        const profile = ProfileService.getProfile();
        this.state.currentPlayer = uniquePlayers.find(p => p.id === profile.id);

        console.log('🌐 Lobby joined successfully:', uniquePlayers.length, 'players online');
        console.log('🌐 Initial player IDs tracked:', Array.from(this.initialPlayerIds));
        console.log('🌐 Player list:', uniquePlayers.map(p => ({ id: p.id, name: p.name, status: p.status })));
      } else if (msg.action) {
        this.handleLobbyAction(msg);
      }
    }

    this.notifyListeners();
  }

  /**
   * Handle specific lobby actions
   */
  private static handleLobbyAction(msg: any): void {
    switch (msg.action) {
      case 'player-joined':
        // Skip if this player was in the initial lobby state (server sends both initial + joined)
        if (this.initialPlayerIds.has(msg.player.id)) {
          console.log('🌐 Ignoring player-joined for initial player:', msg.player.name);
          break;
        }
        
        // Check if player already exists to prevent duplicates
        const existingPlayer = this.state.players.find(p => p.id === msg.player.id);
        if (!existingPlayer) {
          this.state.players.push(msg.player);
          console.log('🌐 New player joined:', msg.player.name);
        } else {
          console.log('🌐 Player already exists, updating info:', msg.player.name);
          // Update existing player info
          Object.assign(existingPlayer, msg.player);
        }
        // Apply deduplication after any modifications
        this.state.players = this.deduplicatePlayers(this.state.players);
        break;

      case 'player-left':
        this.state.players = this.state.players.filter(p => p.id !== msg.playerId);
        console.log('🌐 Player left:', msg.playerId);
        break;

      case 'player-status':
        const player = this.state.players.find(p => p.id === msg.playerId);
        if (player) {
          const oldStatus = player.status;
          player.status = msg.status;
          if (msg.gameId) player.gameId = msg.gameId;
          console.log('🌐 Player status updated:', player.name, `${oldStatus} → ${msg.status}`);
        } else {
          console.warn('🌐 Received status update for unknown player:', msg.playerId);
        }
        break;

      case 'chat-message':
        this.state.messages.push(msg.message);
        // Keep only last 100 messages
        if (this.state.messages.length > 100) {
          this.state.messages = this.state.messages.slice(-100);
        }
        console.log('🌐 Chat message:', msg.message.playerName, msg.message.message);
        break;

      case 'invitation':
        const invitation: GameInvitation = {
          id: msg.inviteId,
          from: msg.from.id,
          to: ProfileService.getProfile().id,
          gameId: msg.gameId,
          timestamp: Date.now(),
          status: 'pending'
        };
        this.state.pendingInvitations.push(invitation);
        console.log('🌐 Game invitation received from:', msg.from.name, 'InviteId:', msg.inviteId, 'GameId:', msg.gameId);
        console.log('🌐 Current pending invitations:', this.state.pendingInvitations.length);
        break;

      case 'invitation-response':
        this.state.pendingInvitations = this.state.pendingInvitations.filter(
          inv => inv.id !== msg.inviteId
        );
        console.log('🌐 Invitation response:', msg.accepted ? 'accepted' : 'declined');
        break;
    }
  }

  /**
   * Send message to server
   */
  private static sendMessage(msg: ClientToServer): void {
    if (!this.client) {
      console.warn('🌐 Cannot send message - not connected to lobby');
      return;
    }

    this.client.send(msg);
  }

  /**
   * Notify all listeners of state changes with validation
   */
  private static notifyListeners(): void {
    // Final validation and deduplication before notifying
    this.state.players = this.deduplicatePlayers(this.state.players);
    
    console.log('🌐 Notifying listeners with state:', {
      isConnected: this.state.isConnected,
      playersCount: this.state.players.length,
      playerSummary: this.state.players.map(p => ({ id: p.id, name: p.name, status: p.status }))
    });
    
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('🌐 Error in presence listener:', error);
      }
    });
  }
}