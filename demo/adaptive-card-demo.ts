import { createBoardCard } from '../packages/bot/dist/adaptiveCards/boardCard';
import { dispatchAction } from '../packages/bot/dist/dispatcher/actionDispatcher';
import { createInitialState } from '../packages/core/src/engine';

console.log('🎴 Awale Adaptive Card Demo');
console.log('============================');

// Test 1: Create a new game
console.log('\n1. Creating new game...');
const newGameResult = dispatchAction({ type: 'new' });
console.log(`✅ ${newGameResult.message}`);
console.log('Game ID:', newGameResult.state.id);

// Test 2: Show initial board card (as JSON)
console.log('\n2. Initial Adaptive Card Structure:');
const card = createBoardCard(newGameResult.state);
console.log(JSON.stringify(card, null, 2));

// Test 3: Make a move
console.log('\n3. Making a move (pit 0)...');
const moveResult = dispatchAction({ 
  type: 'move', 
  gameId: newGameResult.state.id!, 
  pit: 0, 
  v: newGameResult.state.version 
});
console.log(`✅ ${moveResult.message}`);

// Test 4: Test PvE (Player vs AI)
console.log('\n4. Creating PvE game with AI...');
const pveGameResult = dispatchAction({ type: 'new', withAI: true });
console.log(`✅ ${pveGameResult.message}`);

console.log('\n5. Making move with AI response...');
const aiMoveResult = dispatchAction({ 
  type: 'move', 
  gameId: pveGameResult.state.id!, 
  pit: 1, 
  v: pveGameResult.state.version, 
  ai: true 
});
console.log(`✅ ${aiMoveResult.message}`);

console.log('\n🎉 Demo completed! The Teams bot framework is ready.');
console.log('📝 Next step: Integrate with Bot Framework SDK for Teams messaging.');

export {};