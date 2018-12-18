import { MoveDirection } from '../task/interfaces';

export interface StrategyMoveInfo {
  direction: MoveDirection;
  remainingDistance: number;
}

export interface Strategy {
  $chunksContainer: Element;
  destroy(): void;
  onMove(callback: (info: StrategyMoveInfo) => void)
}

export type StrategyFactory = ($target: Element) => Strategy;
