import { createInitialState, getLegalMoves, applyMove, formatBoard } from '../src/engine';

describe('Awale Engine', () => {
  test('initial state has 4 seeds per pit and player A to move', () => {
    const s = createInitialState();
  expect(s.pits.every((v: number) => v === 4)).toBe(true);
    expect(s.currentPlayer).toBe('A');
  });

  test('legal moves at start are six pits', () => {
    const s = createInitialState();
    const moves = getLegalMoves(s);
    expect(moves).toEqual([0,1,2,3,4,5]);
  });

  test('applyMove distributes seeds correctly (pit 0)', () => {
    const s = createInitialState();
    const { state: s2 } = applyMove(s, 0);
    // pit 0 emptied
    expect(s2.pits[0]).toBe(0);
    // next four pits incremented by one
  expect(s2.pits.slice(1,5).every((v: number) => v === 5)).toBe(true);
  });

  test('formatBoard returns a string with two lines plus capture line', () => {
    const s = createInitialState();
    const str = formatBoard(s);
    expect(str.split('\n').length).toBe(3);
  });
});
