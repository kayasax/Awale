import {
  ActivityHandler,
  CardFactory,
  ConversationState,
  MessageFactory,
  StatePropertyAccessor,
  TurnContext,
} from 'botbuilder';
import { createInitialState, applyMove, getLegalMoves, formatBoard } from '../../core/dist/core/src/engine.js';
import { greedyStrategy } from '../../core/dist/core/src/ai/greedy.js';
import { GameState } from '../../shared/dist/types.js';

interface GameSession {
  state: GameState;
  playerAId: string;
  gameId: string;
  lastActivity: Date;
}

export class AwaleBot extends ActivityHandler {
  private gameStateAccessor: StatePropertyAccessor<GameSession>;

  constructor(conversationState: ConversationState) {
    super();

    // Create state accessor
    this.gameStateAccessor = conversationState.createProperty<GameSession>('GameSession');

    // Handle when members are added (bot or user joins conversation)
    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded || []) {
        if (member.id !== context.activity.recipient.id) {
          await this.sendWelcomeMessage(context);
        }
      }
      await next();
    });

    // Handle messages
    this.onMessage(async (context, next) => {
      const text = context.activity.text?.toLowerCase().trim() || '';
      
      // Check for commands
      if (text === 'new game' || text === 'start') {
        await this.startNewGame(context);
      } else if (text === 'help' || text === '?') {
        await this.sendHelp(context);
      } else if (text === 'quit' || text === 'stop') {
        await this.endGame(context);
      } else if (/^[0-5]$/.test(text)) {
        // User wants to make a move
        const pitIndex = parseInt(text);
        await this.makePlayerMove(context, pitIndex);
      } else {
        // Unknown command
        await context.sendActivity(MessageFactory.text(
          `I didn't understand "${text}". Try:\n` +
          `• Type **new game** to start playing\n` +
          `• Type **help** for instructions\n` +
          `• Type a number **0-5** to make a move`
        ));
      }

      await next();
    });
  }

  private async sendWelcomeMessage(context: TurnContext): Promise<void> {
    const welcomeCard = this.createWelcomeCard();
    await context.sendActivity(MessageFactory.attachment(welcomeCard));
  }

  private async sendHelp(context: TurnContext): Promise<void> {
    const helpText = `
🎮 **Awale (Oware) Game Rules:**

**Goal:** Capture the most seeds (need 25+ to win)

**How to Play:**
• You control pits 0-5 (bottom row)
• AI controls pits 6-11 (top row)
• Type a number 0-5 to select your pit
• Seeds are sown counter-clockwise
• Capture when you end in opponent's side with 2-3 seeds

**Commands:**
• **new game** - Start a new game
• **0-5** - Select pit to play
• **help** - Show this help
• **quit** - End current game

Ready to play? Type **new game**!`;

    await context.sendActivity(MessageFactory.text(helpText));
  }

  private async startNewGame(context: TurnContext): Promise<void> {
    const gameSession: GameSession = {
      state: createInitialState(),
      playerAId: context.activity.from.id,
      gameId: `game_${Date.now()}`,
      lastActivity: new Date()
    };

    await this.gameStateAccessor.set(context, gameSession);
    
    await context.sendActivity(MessageFactory.text('🎮 **New Awale Game Started!**'));
    await this.displayGameState(context, gameSession.state);
    await context.sendActivity(MessageFactory.text(
      `Your turn! You are Player A (bottom row). Select a pit by typing **0**, **1**, **2**, **3**, **4**, or **5**.`
    ));
  }

  private async makePlayerMove(context: TurnContext, pitIndex: number): Promise<void> {
    const gameSession = await this.gameStateAccessor.get(context);
    
    if (!gameSession) {
      await context.sendActivity(MessageFactory.text('No game in progress. Type **new game** to start!'));
      return;
    }

    if (gameSession.state.ended) {
      await context.sendActivity(MessageFactory.text('Game is over. Type **new game** to start a fresh game!'));
      return;
    }

    if (gameSession.state.currentPlayer !== 'A') {
      await context.sendActivity(MessageFactory.text('Wait for the AI to make its move!'));
      return;
    }

    try {
      // Make player move
      const moveResult = applyMove(gameSession.state, pitIndex);
      gameSession.state = moveResult.state;
      gameSession.lastActivity = new Date();

      if (moveResult.capturedThisMove > 0) {
        await context.sendActivity(MessageFactory.text(`🎉 Great move! You captured ${moveResult.capturedThisMove} seeds!`));
      }

      await this.displayGameState(context, gameSession.state);

      // Check if game ended
      if (gameSession.state.ended) {
        await this.announceGameEnd(context, gameSession.state);
        return;
      }

      // AI's turn
      await context.sendActivity(MessageFactory.text('🤖 AI is thinking...'));
      
      // Add a small delay for dramatic effect
      setTimeout(async () => {
        await this.makeAIMove(context, gameSession);
      }, 1500);

    } catch (error) {
      await context.sendActivity(MessageFactory.text(`❌ Invalid move: ${(error as Error).message}`));
      await this.showLegalMoves(context, gameSession.state);
    }

    await this.gameStateAccessor.set(context, gameSession);
  }

  private async makeAIMove(context: TurnContext, gameSession: GameSession): Promise<void> {
    if (gameSession.state.currentPlayer !== 'B' || gameSession.state.ended) {
      return;
    }

    try {
      const aiMove = greedyStrategy.chooseMove(gameSession.state);
      const moveResult = applyMove(gameSession.state, aiMove);
      gameSession.state = moveResult.state;
      gameSession.lastActivity = new Date();

      if (moveResult.capturedThisMove > 0) {
        await context.sendActivity(MessageFactory.text(`🤖 AI played pit ${aiMove} and captured ${moveResult.capturedThisMove} seeds!`));
      } else {
        await context.sendActivity(MessageFactory.text(`🤖 AI played pit ${aiMove}`));
      }

      await this.displayGameState(context, gameSession.state);

      // Check if game ended
      if (gameSession.state.ended) {
        await this.announceGameEnd(context, gameSession.state);
      } else {
        await context.sendActivity(MessageFactory.text('Your turn! Select a pit (0-5):'));
        await this.showLegalMoves(context, gameSession.state);
      }

      await this.gameStateAccessor.set(context, gameSession);

    } catch (error) {
      await context.sendActivity(MessageFactory.text(`🤖 AI encountered an error: ${(error as Error).message}`));
    }
  }

  private async displayGameState(context: TurnContext, state: GameState): Promise<void> {
    const boardDisplay = formatBoard(state);
    const score = `📊 **Score:** You: ${state.captured.A} | AI: ${state.captured.B}`;
    
    await context.sendActivity(MessageFactory.text(`\`\`\`\n${boardDisplay}\n\`\`\`\n${score}`));
  }

  private async showLegalMoves(context: TurnContext, state: GameState): Promise<void> {
    if (state.currentPlayer === 'A') {
      const legalMoves = getLegalMoves(state);
      await context.sendActivity(MessageFactory.text(`🎯 Your legal moves: **${legalMoves.join(', ')}**`));
    }
  }

  private async announceGameEnd(context: TurnContext, state: GameState): Promise<void> {
    let message = '🎊 **Game Over!**\n\n';
    
    if (state.winner) {
      if (state.winner === 'A') {
        message += '🎉 **Congratulations! You won!** 👑\n';
      } else {
        message += '🤖 **AI wins this time!** Better luck next game!\n';
      }
    } else {
      message += '🤝 **It\'s a tie!** Well played!\n';
    }
    
    message += `\n📊 Final Score: You: ${state.captured.A} | AI: ${state.captured.B}\n`;
    message += '\nType **new game** to play again!';
    
    await context.sendActivity(MessageFactory.text(message));
  }

  private async endGame(context: TurnContext): Promise<void> {
    await this.gameStateAccessor.delete(context);
    await context.sendActivity(MessageFactory.text('Game ended. Type **new game** whenever you want to play again!'));
  }

  private createWelcomeCard() {
    const card = {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '🎮 Welcome to Awale!',
          size: 'Large',
          weight: 'Bolder',
          color: 'Accent'
        },
        {
          type: 'TextBlock',
          text: 'The ancient African strategy game, now in Microsoft Teams!',
          wrap: true,
          spacing: 'Medium'
        },
        {
          type: 'TextBlock',
          text: '**How to play:** Capture seeds by sowing them around the board. You need 25+ seeds to win!',
          wrap: true,
          spacing: 'Medium'
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'ActionSet',
                  actions: [
                    {
                      type: 'Action.Submit',
                      title: '🎮 Start New Game',
                      data: { action: 'new_game' }
                    }
                  ]
                }
              ]
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'ActionSet',
                  actions: [
                    {
                      type: 'Action.Submit',
                      title: '❓ Help',
                      data: { action: 'help' }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }
}