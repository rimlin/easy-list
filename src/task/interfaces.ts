import { Chunk, $ChunkEl } from '../lib';
import { StrategyMoveInfo } from '../strategy/interfaces';

export type ExtendableEvent<T> = CustomEvent<T> & {
  readonly waitUntil: (promise: Promise<any>) => void;
  readonly __onResolve: (callback: () => void) => void;
  readonly __resolve: () => void;
  __isPending: boolean;
  __canceled: boolean;
};

export enum MoveDirection {
  TO_TOP = 'to_top',
  TO_BOTTOM = 'to_bottom',
}

export enum TaskType {
  MOUNT = 'mount',
  UNMOUNT = 'unmount',
  RENDER = 'render',
  REACH_BOUND = 'reach-bound',
}

export interface TaskData {
  readonly chunk: Chunk;
  readonly renderedChunks: Chunk[];
}

export interface TaskReachBoundData {
  readonly forwardChunks: Chunk[];
  readonly moveInfo: StrategyMoveInfo;
};

export type TaskRenderData = {
  readonly chunk: Chunk;
  readonly isShadowPlaceholder: boolean;
};

export type TaskMountData = TaskData & {
  readonly $el: $ChunkEl;
  readonly isShadowPlaceholder: boolean;
};

export type TaskUnmountData = TaskData & {
  readonly $el: $ChunkEl;
  readonly isShadowPlaceholder: boolean;
};
