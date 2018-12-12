import { EventEmitter } from './event-emitter';
import { isExists } from './utils';
import { Handler, ReachBoundDirection } from './handler';

export interface RawItem {
  data: any;
  template: string;
}

export interface Chunk extends RawItem {
  id: number;
}

/**
 * onMount? - event after chunk rendered and mounted to list
 * onUnmount? - event after chunk is unmounted from the list
 * onReachBound? - get template of chunk
 */

const mockChunk = {
  id: 0,
  data: {},
  template: 'test',
}

export class EasyList extends Handler {
  private maxRenderedChunks = 5;
  private lastChunkIndex = 0;

  private chunks: Chunk[] = [];
  private renderedChunks: number[] = [];
  private headRenderedChunkIndex: number = 0;

  constructor() {
    super();

    this.onRootReachBound(event => {
      event.__onResolve(() => {
        console.log('resolve root reach bound');
      });

      if (isExists(event.__isPending) === false) {
        event.__resolve();
      }
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
      this.emitReachBound({
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
      this.emitReachBound({
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
