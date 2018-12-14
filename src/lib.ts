import { PriorityEvents } from './services/priority-events';
import { isExists } from './utils';
import { ReachBoundDirection } from './task/interfaces';
import { TaskEmitter } from './task/emitter';
import { TaskRootHandler } from './task/root-handler';
import { Strategy, ScrollStrategyFactory } from 'strategy/interfaces';

export interface EasyListOptions {
  strategy?: ScrollStrategyFactory;
}

export interface RawItem {
  template: string;
  data?: any;
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
  private $target: Element;
  private options: EasyListOptions;

  private maxRenderedChunks = 5;
  private lastChunkId = 0;

  private chunks: Chunk[] = [];
  private renderedChunks: Chunk[] = [];
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
      this.renderChunk(event.detail.chunk);
    });

    this.onRootMount(event => {
      this.calcTree();
    });
  }

  bind($target: Element, options: EasyListOptions): void {
    this.$target = $target;
    this.options = options;

    this.setupStrategy();
  }

  appendItems(items: RawItem[]): void {
    const chunks = this.convertItemsToChunks(items);

    this.chunks.push(...chunks);
    this.renderTree();
  }

  prependItems(items: RawItem[]): void {
    const chunks = this.convertItemsToChunks(items);

    this.chunks.unshift(...chunks);
    this.renderTree();
  }

  private renderTree(): void {
    const chunksToRender = this.chunks.slice(this.headRenderedChunkIndex, this.maxRenderedChunks);
    const keepChunkIds: number[] = [];

    chunksToRender.forEach(chunk => {
      if (this.renderedChunks.find(renderedChunk => renderedChunk.id === chunk.id)) {
        keepChunkIds.push(chunk.id);
      }
    });

    this.renderedChunks.forEach(renderedChunk => {
      if (keepChunkIds.includes(renderedChunk.id) === false) {
        this.removeChunk(renderedChunk);
      }
    });

    chunksToRender.forEach(chunk => {
      if (keepChunkIds.includes(chunk.id) === false) {
        this.taskEmitter.emitRender({
          chunk,
        });
      }
    });

    this.renderedChunks = chunksToRender;
  }

  private renderChunk(chunk: Chunk): void {
    const $chunkEl = document.createElement('div');
    $chunkEl.dataset['chunk'] = chunk.id.toString();
    $chunkEl.innerHTML = chunk.template;

    // In future need check order of chunk in chunks array
    this.$target.appendChild($chunkEl);

    this.taskEmitter.emitMount({
      $el: $chunkEl,
      chunk,
      renderedChunks: this.renderedChunks,
    });
  }

  private removeChunk(chunk: Chunk): void {
    const $chunkEl = this.$target.querySelector(`[data-chunk=${chunk.id}]`);

    if ($chunkEl) {
      $chunkEl.remove();

      this.taskEmitter.emitUnmount({
        chunk,
        renderedChunks: this.renderedChunks,
      });
    }
  }

  private calcTree(): void {
    console.log('calc tree');
  }

  private setupStrategy(): void {
    const strategy = this.options.strategy(this.$target);

    setTimeout(() => {
      this.taskEmitter.emitReachBound({
        direction: ReachBoundDirection.TO_BOTTOM,
        forwardChunks: [],
      });
    })
  }

  private convertItemsToChunks(items: RawItem[]): Chunk[] {
    return items.map((item, index) => ({
      ...item,
      id: this.lastChunkId++,
    }));
  }
}
