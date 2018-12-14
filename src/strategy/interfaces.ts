export interface Strategy {
  destroy(): void;
}

export type ScrollStrategyFactory = ($target: Element) => Strategy;
