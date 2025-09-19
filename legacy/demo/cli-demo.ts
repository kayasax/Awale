import { createInitialState, formatBoard, applyMove, getLegalMoves } from '../packages/core/dist/core/src/engine.js';
import { greedyStrategy } from '../packages/core/dist/core/src/ai/greedy.js';
import { GameState } from '../packages/shared/dist/types.js';
import * as readline from 'readline';

// CLI Demo for Awale Game - Human vs AI
console.log('🎮 Welcome to Awale (Oware) - CLI Demo');
console.log('=========================================');
console.log('Rules: Select a pit (0-5) to sow seeds. Capture 2-3 seeds from opponent side.');
console.log('Player A (you) plays pits 0-5 (bottom row)');
console.log('Player B (AI) plays pits 6-11 (top row)');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let gameState = createInitialState();

function displayBoard(state: GameState) {
  console.log('\n' + formatBoard(state));
  console.log('');
  if (!state.ended) {
    const legal = getLegalMoves(state);
    if (state.currentPlayer === 'A') {
      console.log(`Your turn! Legal moves: ${legal.join(', ')}`);
      console.log('Pit numbers:    0  1  2  3  4  5');
    } else {
      console.log('AI is thinking...');
    }
  }
}

function makeMove(pit: number): boolean {
  try {
    const { state: newState } = applyMove(gameState, pit);
    gameState = newState;
    return true;
  } catch (error) {
    console.log(`❌ Invalid move: ${(error as Error).message}`);
    return false;
  }
}

async function playTurn() {
  displayBoard(gameState);

  if (gameState.ended) {
    console.log('\n🎊 Game Over!');
    if (gameState.winner === 'Draw') {
      console.log('🤝 It\'s a draw!');
    } else {
      console.log(`🏆 Winner: Player ${gameState.winner} ${gameState.winner === 'A' ? '(You!)' : '(AI)'}`);
    }
    console.log(`📊 Final Score - You: ${gameState.captured.A}, AI: ${gameState.captured.B}`);
    rl.close();
    return;
  }

  if (gameState.currentPlayer === 'A') {
    // Human player turn
    rl.question('Enter pit number (0-5) or "q" to quit: ', (input) => {
      if (input.toLowerCase() === 'q') {
        console.log('👋 Thanks for playing!');
        rl.close();
        return;
      }

      const pit = parseInt(input);
      if (isNaN(pit) || pit < 0 || pit > 5) {
        console.log('❌ Please enter a number between 0 and 5');
        playTurn();
        return;
      }

      if (makeMove(pit)) {
        console.log(`✅ You played pit ${pit}`);
        setTimeout(playTurn, 500); // Brief pause before next turn
      } else {
        playTurn(); // Try again
      }
    });
  } else {
    // AI player turn
    const aiMove = greedyStrategy.chooseMove(gameState);
    setTimeout(() => {
      makeMove(aiMove);
      console.log(`🤖 AI played pit ${aiMove}`);
      setTimeout(playTurn, 1000); // Pause to show AI move
    }, 1000);
  }
}

// Start the game
console.log('🎯 Starting new game...');
playTurn();