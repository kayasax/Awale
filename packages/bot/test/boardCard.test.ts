import { createInitialState } from '@awale/core/engine';
import { createBoardCard } from '../src/adaptiveCards/boardCard';

describe('Adaptive Card generator', () => {
  test('produces basic adaptive card structure', () => {
    const s = createInitialState();
    const card = createBoardCard(s);
    expect(card.type).toBe('AdaptiveCard');
    expect(Array.isArray(card.body)).toBe(true);
  });
});
