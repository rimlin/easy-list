import { MoveDirection } from '../task/interfaces';

export interface StrategyMoveInfo {
  direction: MoveDirection;
  remainingDistance: number;
}

export interface Strategy {
  $chunksContainer: HTMLElement;
  destroy(): void;
  onMove(callback: (info: StrategyMoveInfo) => void)
}

export type StrategyFactory = ($target: HTMLElement) => Strategy;
