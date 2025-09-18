import { GameState, Strategy } from '@awale/shared';
import { getLegalMoves, applyMove } from '../engine';

// Greedy capture strategy:
// Evaluates each legal move by simulating it (pure applyMove) and picks the one
// that yields the highest immediate capture count. Break ties by first occurrence
// to keep deterministic behavior.

export class GreedyCaptureStrategy implements Strategy {
  name = 'greedy-capture';
  chooseMove(state: GameState): number {
    const legal = getLegalMoves(state);
    if (legal.length === 0) throw new Error('No legal moves');
    let best = legal[0];
    let bestCapture = -1;
    for (const move of legal) {
      const { capturedThisMove } = applyMove(state, move); // state not mutated
      if (capturedThisMove > bestCapture) {
        bestCapture = capturedThisMove;
        best = move;
      }
    }
    // If all capture counts equal (e.g., none capture), prefer nearest-left deterministic choice
    return best;
  }
}

export const greedyStrategy = new GreedyCaptureStrategy();
