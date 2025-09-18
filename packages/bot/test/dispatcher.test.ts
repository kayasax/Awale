import { dispatchAction } from '../src/dispatcher/actionDispatcher';

describe('Action Dispatcher', () => {
  test('creates new game', () => {
    const res = dispatchAction({ type: 'new' });
    expect(res.state.pits.length).toBe(12);
    expect(res.message).toMatch(/New game/);
  });
  test('applies a move and optionally AI response', () => {
    const { state } = dispatchAction({ type: 'new', withAI: true });
    const res2 = dispatchAction({ type: 'move', gameId: state.id!, pit: 0, v: state.version, ai: true });
    expect(res2.state.turn).toBeGreaterThan(state.turn);
  });
});
