import { PriorityEvents } from './services/priority-events';
import { isExists } from './utils';
import { ReachBoundDirection } from './task/interfaces';
import { TaskEmitter } from './task/emitter';
import { TaskRootHandler } from './task/root-handler';

export interface RawItem {
  data: any;
  template: string;
}

export interface Chunk extends RawItem {
  id: number;
}

const mockChunk = {
  id: 0,
  data: {},
  template: 'test1',
};
const mockChunk2 = {
  id: 1,
  data: {},
  template: 'test2',
};

export class EasyListLib extends TaskRootHandler {
  private maxRenderedChunks = 5;
  private lastChunkIndex = 0;

  private chunks: Chunk[] = [];
  private renderedChunks: number[] = [];
  private headRenderedChunkIndex: number = 0;

  constructor(
    priorityEvents: PriorityEvents,
    private taskEmitter: TaskEmitter,
  ) {
    super(priorityEvents);

    this.onRootReachBound(event => {
      console.log('resolve root reach bound');
    });

    this.onRootRender(event => {
      console.log('resolve root render', event.detail.chunk.id);
    });

    this.onRootUnmount(event => {
      console.log('root unmount happened', event.detail.chunk.id);
    });
  }

  bind(): void {
    setTimeout(() => {
      this.taskEmitter.emitUnmount({
        chunk: mockChunk,
        renderedChunks: [mockChunk],
      });

      this.taskEmitter.emitRender({
        chunk: mockChunk,
        renderedChunks: [mockChunk],
      });

      setTimeout(() => {
        this.taskEmitter.emitRender({
          chunk: mockChunk2,
          renderedChunks: [mockChunk],
        });
      }, 300)

      /*
      this.taskEmitter.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [mockChunk],
      });

      setTimeout(() => {
        this.taskEmitter.emitReachBound({
          direction: ReachBoundDirection.TO_BOTTOM,
          forwardChunks: [mockChunk],
        });
      }, 300)
      */
    })
  }

  appendItems(items: RawItem[]): void {
    console.log('prepend items', items);
  }

  prependItems(items: RawItem[]): void {
    console.log('prepend items', items);
  }
}
