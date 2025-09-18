import { createInitialState, applyMove } from '../src/engine';
import { greedyStrategy } from '../src/ai/greedy';

describe('GreedyCaptureStrategy', () => {
  test('selects a move (any) on initial board where no captures possible', () => {
    const s = createInitialState();
    const move = greedyStrategy.chooseMove(s);
    expect([0,1,2,3,4,5]).toContain(move);
  });

  test('prefers capturing move when available', () => {
    // Craft a state where a specific move yields capture
    // Simplify: set up so pit 2 has enough seeds to land on opponent side producing 2 or 3 in last pit
    const s = createInitialState();
    // Force custom pits
    s.pits = [0,0,6,0,0,0, 1,1,1,1,1,1];
    // Move 2 will sow seeds over opponent creating capture chain likely
    const move = greedyStrategy.chooseMove(s);
    expect(move).toBe(2);
    const { capturedThisMove } = applyMove(s, move);
    expect(capturedThisMove).toBeGreaterThanOrEqual(1);
  });
});
