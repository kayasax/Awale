/**
 * 🌐 Lobby View Component
 * Main lobby interface with online players, chat, and game invitations
 */

import React, { useEffect, useState } from 'react';
import { PresenceService, PresenceState } from '../services/presence';
import { ProfileService } from '../services/profile';
import { LobbyPlayer, ChatMessage, GameInvitation } from '../online/protocol';

interface LobbyViewProps {
  onStartGame: (gameId: string, role: 'host' | 'guest') => void;
  onExit: () => void;
  serverUrl: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onStartGame, onExit, serverUrl }) => {
  const [lobbyState, setLobbyState] = useState<PresenceState>(PresenceService.getState());
  const [renderKey, setRenderKey] = useState(0); // Force re-render key
  
  console.log('🌐 LobbyView rendering with state:', { 
    isConnected: lobbyState.isConnected, 
    playersCount: lobbyState.players.length,
    willShowSpinner: !lobbyState.isConnected,
    renderKey
  });
  
  const [chatMessage, setChatMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<LobbyPlayer | null>(null);

  // Connect to lobby on component mount
  useEffect(() => {
    console.log('🌐 LobbyView mounting, connecting to:', serverUrl);
    
    // Set the game start callback
    PresenceService.setGameStartCallback(onStartGame);
    
    const unsubscribe = PresenceService.subscribe((state) => {
      console.log('🌐 LobbyView received state update:', { 
        isConnected: state.isConnected, 
        playersCount: state.players.length 
      });
      setLobbyState(state);
      setRenderKey(prev => prev + 1); // Force re-render
    });

    PresenceService.connect(serverUrl);

    return () => {
      console.log('🌐 LobbyView unmounting, disconnecting');
      PresenceService.setGameStartCallback(null); // Clear callback
      unsubscribe();
      PresenceService.disconnect();
    };
  }, [serverUrl, onStartGame]);

  // Handle chat message submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      PresenceService.sendChatMessage(chatMessage);
      setChatMessage('');
    }
  };

  // Handle player invitation
  const handleInvitePlayer = (player: LobbyPlayer) => {
    setSelectedPlayer(player);
    setShowInviteModal(true);
  };

  // Send invitation
  const sendInvitation = () => {
    if (selectedPlayer) {
      PresenceService.sendInvitation(selectedPlayer.id);
      setShowInviteModal(false);
      setSelectedPlayer(null);
    }
  };

  // Handle invitation response
  const handleInvitationResponse = (inviteId: string, accept: boolean) => {
    if (accept) {
      PresenceService.acceptInvitation(inviteId);
    } else {
      PresenceService.declineInvitation(inviteId);
    }
  };

  const currentPlayer = ProfileService.getProfile();
  const onlinePlayers = lobbyState.players.filter(p => p.status !== 'offline');
  const availablePlayers = onlinePlayers.filter(p => 
    p.status === 'available' && p.id !== currentPlayer.id
  );

  // Force re-render when lobby state changes
  if (!lobbyState.isConnected) {
    console.log('🔄 LobbyView: Showing loading screen because isConnected =', lobbyState.isConnected);
    return (
      <div className="lobby-view loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  console.log('🔄 LobbyView: Showing lobby interface because isConnected =', lobbyState.isConnected);

  return (
    <div className="lobby-view" key={renderKey}>
      <header className="lobby-header">
        <h1 className="lobby-title">🌐 Awale Lobby</h1>
        <div className="lobby-stats">
          <span className="online-count">{onlinePlayers.length} players online</span>
        </div>
        <button className="btn lobby-exit" onClick={onExit}>
          ← Back
        </button>
      </header>

      <div className="lobby-content">
        {/* Players List */}
        <div className="lobby-players">
          <h2>Online Players</h2>
          
          {/* Show current player status */}
          <div className="current-player-status">
            <div className="player-card current-player">
              <div className="player-info">
                <div className="player-avatar">
                  {currentPlayer.avatar || '👤'}
                </div>
                <div className="player-details">
                  <div className="player-name">{currentPlayer.name} (You)</div>
                  <div className="player-status available">
                    🟢 Connected
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="players-list">
            {availablePlayers.map(player => (
              <div key={player.id} className={`player-card ${player.status}`}>
                <div className="player-info">
                  <div className="player-avatar">
                    {player.avatar || '👤'}
                  </div>
                  <div className="player-details">
                    <div className="player-name">{player.name}</div>
                    <div className={`player-status ${player.status}`}>
                      {player.status === 'available' ? '🟢 Available' : 
                       player.status === 'in-game' ? '🎮 In Game' : 
                       player.status === 'away' ? '🟡 Away' : '⚫ Offline'}
                    </div>
                  </div>
                </div>
                {player.status === 'available' && (
                  <button 
                    className="btn btn-invite"
                    onClick={() => handleInvitePlayer(player)}
                  >
                    Invite
                  </button>
                )}
              </div>
            ))}
            
            {availablePlayers.length === 0 && (
              <div className="empty-state">
                <p>No players available for games right now.</p>
                <p>Invite friends to join!</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lobby-chat">
          <h2>Lobby Chat</h2>
          <div className="chat-messages">
            {lobbyState.messages.map(message => (
              <div key={message.id} className={`chat-message ${message.type}`}>
                {message.type === 'system' ? (
                  <div className="system-message">{message.message}</div>
                ) : (
                  <>
                    <span className="message-author">{message.playerName}:</span>
                    <span className="message-content">{message.message}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <form className="chat-input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
              maxLength={200}
            />
            <button type="submit" className="btn send-btn" disabled={!chatMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Pending Invitations */}
      {lobbyState.pendingInvitations.length > 0 && (
        <div className="invitations-panel">
          <h3>Game Invitations</h3>
          {lobbyState.pendingInvitations.map(invitation => {
            const fromPlayer = lobbyState.players.find(p => p.id === invitation.from);
            return (
              <div key={invitation.id} className="invitation-card">
                <div className="invitation-info">
                  <span>🎮 Game invite from <strong>{fromPlayer?.name || 'Unknown'}</strong></span>
                </div>
                <div className="invitation-actions">
                  <button 
                    className="btn btn-accept"
                    onClick={() => handleInvitationResponse(invitation.id, true)}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn btn-decline"
                    onClick={() => handleInvitationResponse(invitation.id, false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedPlayer && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invite Player</h3>
            <p>Send a game invitation to <strong>{selectedPlayer.name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={sendInvitation}>
                Send Invite
              </button>
              <button className="btn" onClick={() => setShowInviteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};