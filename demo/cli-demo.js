const { createInitialState, formatBoard, applyMove, getLegalMoves } = require('../packages/core/dist/core/src/engine.js');
const { greedyStrategy } = require('../packages/core/dist/core/src/ai/greedy.js');
const readline = require('readline');

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

function displayBoard(state) {
  console.log('\n📋 Current Board:');
  console.log(formatBoard(state));
  console.log(`🎯 Turn: Player ${state.currentPlayer}`);
  console.log(`📊 Score: Player A: ${state.captured.A}, Player B: ${state.captured.B}`);
}

function makeMove(pitIndex) {
  try {
    const result = applyMove(gameState, pitIndex);
    gameState = result.state;
    if (result.capturedThisMove > 0) {
      console.log(`🎉 Captured ${result.capturedThisMove} seeds!`);
    }
    return true;
  } catch (error) {
    console.log(`❌ Invalid move: ${error.message}`);
    return false;
  }
}

function playTurn() {
  displayBoard(gameState);

  if (gameState.ended) {
    console.log('\n🎊 Game Over!');
    if (gameState.winner) {
      console.log(`👑 Winner: Player ${gameState.winner}!`);
    } else {
      console.log('🤝 It\'s a tie!');
    }
    rl.close();
    return;
  }

  if (gameState.currentPlayer === 'A') {
    // Human player turn
    const legalMoves = getLegalMoves(gameState);
    console.log(`\n🎯 Your legal moves: [${legalMoves.join(', ')}]`);

    rl.question('Choose a pit (0-5): ', (answer) => {
      const move = parseInt(answer.trim());
      if (isNaN(move)) {
        console.log('❌ Please enter a valid number');
        playTurn();
        return;
      }

      if (makeMove(move)) {
        setTimeout(playTurn, 500); // Short pause before next turn
      } else {
        playTurn(); // Try again
      }
    });
  } else {
    // AI player turn
    console.log('\n🤖 AI is thinking...');
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