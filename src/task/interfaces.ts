import { Chunk, $ChunkEl } from '../lib';

export type ExtendableEvent<T> = CustomEvent<T> & {
  readonly waitUntil: (promise: Promise<any>) => void;
  readonly __onResolve: (callback: () => void) => void;
  readonly __resolve: () => void;
  __isPending: boolean;
};

export enum ReachBoundDirection {
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
  readonly direction: ReachBoundDirection;
  readonly forwardChunks: Chunk[];
};

export type TaskRenderData = {
  readonly chunk: Chunk;
};

export type TaskMountData = TaskData & {
  $el: $ChunkEl;
};

export type TaskUnmountData = TaskData;
