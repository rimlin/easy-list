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
  template: 'test',
}

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
      event.__onResolve(() => {
        console.log('resolve root render');
      });

      if (isExists(event.__isPending) === false) {
        event.__resolve();
      }
    });
  }

  bind(): void {
    setTimeout(() => {
      this.taskEmitter.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [mockChunk],
      });

      /*this.emitRender({
        chunk: mockChunk,
        renderedChunks: [mockChunk],
      });

      setTimeout(() => {
        this.emitRender({
          chunk: mockChunk,
          renderedChunks: [mockChunk],
        });
      }, 300)
      */

     setTimeout(() => {
      this.taskEmitter.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [mockChunk],
      });
    }, 600)
    })
  }

  appendItems(items: RawItem[]): void {
    console.log('prepend items', items);
  }

  prependItems(items: RawItem[]): void {
    console.log('prepend items', items);
  }
}
