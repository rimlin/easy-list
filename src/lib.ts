import { EventEmitter } from './event-emitter';
import { isExists } from './utils';
import { Logger } from './logger';
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
 * onReachBound? - get template of chunk
 *
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
      console.log('finish root reach bound');
    });
  }

  bind(): void {
    setTimeout(() => {
      this.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [mockChunk],
      });
    })
    setTimeout(() => {
      this.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [mockChunk],
      });
    }, 1000)
  }
}
