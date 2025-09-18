import { GameState } from '@awale/shared';
import { formatBoard } from '@awale/core/engine';

// Adaptive Card generator stub.
// Intent: Provide a minimal visual & interactive representation inside Teams chat.
// Future Enhancements:
// - Theming, colors, iconography
// - Pit selection disabled states styling
// - AI move indicators / animations (where feasible in cards)
// - Localized strings

// Basic Adaptive Card generator stub; will evolve with richer visuals.
export function createBoardCard(state: GameState) {
  const pitsTop = state.pits.slice(6, 12).slice().reverse();
  const pitsBottom = state.pits.slice(0, 6);
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      { type: 'TextBlock', text: 'Awale – Relax Mode', weight: 'Bolder', size: 'Medium' },
      { type: 'TextBlock', text: state.ended ? endgameText(state) : turnText(state), wrap: true },
      {
        type: 'ColumnSet',
  columns: pitsTop.map((seeds: number, i: number) => ({
          type: 'Column', width: 'auto', items: [
            { type: 'TextBlock', text: seeds.toString(), horizontalAlignment: 'Center' }
          ]
        }))
      },
      {
        type: 'ColumnSet',
  columns: pitsBottom.map((seeds: number, i: number) => ({
          type: 'Column', width: 'auto', items: [
            state.currentPlayer === 'A' ? moveButton(i, seeds, state) : { type: 'TextBlock', text: seeds.toString(), horizontalAlignment: 'Center' }
          ]
        }))
      },
      { type: 'TextBlock', spacing: 'Medium', text: 'Text Board:\n' + formatBoard(state), fontType: 'Monospace', wrap: true }
    ],
    actions: state.ended ? [] : actionRow(state)
  };
}

function moveButton(pitIndex: number, seeds: number, state: GameState) {
  if (seeds === 0) return { type: 'TextBlock', text: '·', horizontalAlignment: 'Center' };
  return {
    type: 'ActionSet',
    actions: [
      {
        type: 'Action.Submit',
        title: seeds.toString(),
        data: { type: 'move', pit: pitIndex, gameId: state.id, v: state.version }
      }
    ]
  };
}

function actionRow(state: GameState) {
  return [
    {
      type: 'Action.Submit',
      title: 'Refresh',
      data: { type: 'refresh', gameId: state.id, v: state.version }
    }
  ];
}

function turnText(state: GameState) {
  return `Turn ${state.turn} – Player ${state.currentPlayer}'s move | Captured A:${state.captured.A} B:${state.captured.B}`;
}

function endgameText(state: GameState) {
  return `Game Over – ${state.winner === 'Draw' ? 'Draw' : 'Winner: ' + state.winner} (A:${state.captured.A} B:${state.captured.B})`;
}
