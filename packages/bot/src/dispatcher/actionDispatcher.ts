import { repo } from '@awale/bot/repository/inMemoryRepo';
import { createBoardCard } from '@awale/bot/adaptiveCards/boardCard';
import { getLegalMoves } from '@awale/core/engine';
import { greedyStrategy } from '@awale/core/ai/greedy';
import { GameState } from '@awale/shared';

export type ActionInput =
  | { type: 'new'; withAI?: boolean }
  | { type: 'move'; gameId: string; pit: number; v?: number; ai?: boolean }
  | { type: 'refresh'; gameId: string };

export interface DispatchResult {
  state: GameState;
  card: any; // Adaptive Card JSON
  message: string;
}

export function dispatchAction(action: ActionInput): DispatchResult {
  switch (action.type) {
    case 'new': {
      const st = repo.createGame();
      return { state: st, card: createBoardCard(st), message: 'New game created' };
    }
    case 'refresh': {
      const st = ensureGame(action.gameId);
      return { state: st, card: createBoardCard(st), message: 'Refreshed' };
    }
    case 'move': {
      const current = ensureGame(action.gameId);
      // Basic optimistic concurrency check
      if (action.v !== undefined && current.version !== action.v) {
        return { state: current, card: createBoardCard(current), message: 'Version mismatch – refresh' };
      }
      let resultMsg = '';
      let { state: afterMove } = repo.applyPlayerMove(action.gameId, action.pit);
      resultMsg = `Player ${current.currentPlayer} moved pit ${action.pit}`;
      // Optional AI reply if flagged and game not ended
      if (action.ai && !afterMove.ended && afterMove.currentPlayer === 'B') {
        const aiMove = greedyStrategy.chooseMove(afterMove);
        const { state: afterAI } = repo.applyPlayerMove(action.gameId, aiMove);
        afterMove = afterAI;
        resultMsg += ` | AI moved pit ${aiMove}`;
      }
      return { state: afterMove, card: createBoardCard(afterMove), message: resultMsg };
    }
    default:
      throw new Error('Unhandled action');
  }
}

function ensureGame(id: string): GameState {
  const g = repo.getGame(id);
  if (!g) throw new Error('Game not found');
  return g;
}

// Helper for future: check if AI should move automatically (e.g., queued turn)
export function shouldAIMove(state: GameState, aiEnabled: boolean): boolean {
  if (!aiEnabled || state.ended) return false;
  return state.currentPlayer === 'B' && getLegalMoves(state).length > 0;
}
