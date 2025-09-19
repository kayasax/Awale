import { GameState, Strategy } from '@awale/shared';
export declare class GreedyCaptureStrategy implements Strategy {
    name: string;
    chooseMove(state: GameState): number;
}
export declare const greedyStrategy: GreedyCaptureStrategy;
