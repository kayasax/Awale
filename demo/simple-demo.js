console.log('🎮 Awale Game Demo');
console.log('==================');

import('../packages/core/dist/core/src/index.js').then((core) => {
  console.log('✅ Core engine loaded');
  
  // Test engine functions
  const { createInitialState, formatBoard, applyMove, getLegalMoves } = core;
  
  const state = createInitialState();
  console.log('\n📋 Initial game state:');
  console.log(formatBoard(state));
  
  console.log('\n🎯 Legal moves for player A:', getLegalMoves(state));
  
  // Make a move as Player A
  const { state: newState } = applyMove(state, 0);
  console.log('\n📋 After Player A moves pit 0:');
  console.log(formatBoard(newState));
  
  // Test AI on the new state (where currentPlayer is now 'B')
  return import('../packages/core/dist/core/src/ai/greedy.js');
}).then((ai) => {
  console.log('✅ AI strategy loaded');
  
  const { greedyStrategy } = ai;
  // Use the state after Player A moved, so AI plays as Player B
  const { state: afterPlayerA } = require('../packages/core/dist/core/src/index.js').applyMove(
    require('../packages/core/dist/core/src/index.js').createInitialState(),
    0
  );
  
  console.log('🎯 Current player in AI turn:', afterPlayerA.currentPlayer);
  const aiMove = greedyStrategy.chooseMove(afterPlayerA);
  console.log('🤖 AI (Player B) chooses pit:', aiMove, '(should be 6-11)');
  
  console.log('\n🎉 All systems working!');
}).catch((error) => {
  console.error('❌ Error:', error.message);
});