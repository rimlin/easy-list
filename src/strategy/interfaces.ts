import { ReachBoundDirection } from '../task/interfaces';

export interface StrategyMoveInfo {
  direction: ReachBoundDirection;
  remainingDistance: number;
}

export interface Strategy {
  $chunksContainer: Element;
  destroy(): void;
  onMove(callback: (info: StrategyMoveInfo) => void)
}

export type StrategyFactory = ($target: Element) => Strategy;
