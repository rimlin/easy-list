export interface Strategy {
  $chunksContainer: Element;
  destroy(): void;
}

export type ScrollStrategyFactory = ($target: Element) => Strategy;
