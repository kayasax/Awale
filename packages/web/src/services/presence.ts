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

export class PresenceService {
  private static client: OnlineClient | null = null;
  private static state: PresenceState = {
    isConnected: false,
    players: [],
    messages: [],
    pendingInvitations: []
  };
  private static listeners: Set<PresenceListener> = new Set();
  private static unsubscribe: (() => void) | null = null;

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
    
    // Subscribe to messages
    this.unsubscribe = this.client.on((msg: ServerToClient) => {
      this.handleMessage(msg);
    });

    // Connect and join lobby
    this.client.connect();
    
    // Wait a moment for connection, then join lobby
    setTimeout(() => {
      this.joinLobby();
    }, 1000);
  }

  /**
   * Disconnect from lobby
   */
  static disconnect(): void {
    if (this.client) {
      this.sendMessage({ type: 'lobby', action: 'leave' });
      this.client.close();
      this.client = null;
    }
    
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.state = {
      isConnected: false,
      players: [],
      messages: [],
      pendingInvitations: []
    };
    
    this.notifyListeners();
  }

  /**
   * Join the lobby with player profile
   */
  private static joinLobby(): void {
    const profile = ProfileService.getProfile();
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
   * Handle incoming WebSocket messages
   */
  private static handleMessage(msg: ServerToClient): void {
    console.log('🌐 Lobby message received:', msg);

    if (msg.type === 'lobby') {
      if ('players' in msg) {
        // Initial lobby state
        this.state.players = msg.players;
        this.state.messages = msg.messages || [];
        this.state.isConnected = true;
        
        // Find current player
        const profile = ProfileService.getProfile();
        this.state.currentPlayer = msg.players.find(p => p.id === profile.id);
        
        console.log('🌐 Lobby joined successfully:', this.state.players.length, 'players online');
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
        this.state.players.push(msg.player);
        console.log('🌐 Player joined:', msg.player.name);
        break;

      case 'player-left':
        this.state.players = this.state.players.filter(p => p.id !== msg.playerId);
        console.log('🌐 Player left:', msg.playerId);
        break;

      case 'player-status':
        const player = this.state.players.find(p => p.id === msg.playerId);
        if (player) {
          player.status = msg.status;
          console.log('🌐 Player status updated:', player.name, msg.status);
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
        console.log('🌐 Game invitation received from:', msg.from.name);
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
   * Notify all listeners of state changes
   */
  private static notifyListeners(): void {
    console.log('🌐 Notifying listeners with state:', { 
      isConnected: this.state.isConnected, 
      playersCount: this.state.players.length 
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