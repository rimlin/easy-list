import { Chunk, $ChunkEl } from '../lib';

export type ExtendableEvent<T> = CustomEvent<T> & {
  readonly waitUntil: (promise: Promise<any>) => void;
  readonly __onResolve: (callback: () => void) => void;
  readonly __resolve: () => void;
  __isPending: boolean;
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
};

export type TaskMountData = TaskData & {
  $el: $ChunkEl;
  isShadowPlaceholder: boolean;
};

export type TaskUnmountData = TaskData & {
  $el: $ChunkEl;
  isShadowPlaceholder: boolean;
};
