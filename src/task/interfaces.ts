import { Chunk, $ChunkEl } from '../lib';

export type ExtendableEvent<T> = CustomEvent<T> & {
  readonly waitUntil: (promise: Promise<any>) => void;
  readonly __onResolve: (callback: () => void) => void;
  readonly __resolve: () => void;
  __isPending: boolean;
  __canceled: boolean;
};

export enum MoveDirection {
  TO_TOP,
  TO_BOTTOM,
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
  readonly direction: MoveDirection;
  readonly forwardChunks: Chunk[];
  readonly __remainingDistance: number;
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
