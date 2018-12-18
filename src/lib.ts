import { PriorityEvents } from './services/priority-events';
import { isExists } from './utils';
import { MoveDirection } from './task/interfaces';
import { TaskEmitter } from './task/emitter';
import { TaskRootHandler } from './task/root-handler';
import { Strategy, StrategyFactory } from 'strategy/interfaces';

export interface EasyListOptions {
  strategy?: StrategyFactory;
}

export interface RawItem {
  template: string;
  data?: any;
}

export interface Chunk extends RawItem {
  id: number;
}

export type $ChunkEl = HTMLDivElement;

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
  private strategy: Strategy;
  private $target: Element;

  private maxRenderedChunks = 5;
  private lastChunkId = 0;

  private chunks: Chunk[] = [];
  private chunksToRender: Chunk[] = [];
  private renderedChunks: Chunk[] = [];
  private headRenderedChunkIndex: number = 0;

  constructor(
    private options: EasyListOptions,
    priorityEvents: PriorityEvents,
    private taskEmitter: TaskEmitter,
  ) {
    super(priorityEvents);

    this.onRootReachBound(event => {
      if (event.detail.direction === MoveDirection.TO_BOTTOM) {
        if (event.detail.forwardChunks.length > 0) {
          this.headRenderedChunkIndex++;
        }
      }

      if (event.detail.direction === MoveDirection.TO_TOP) {
        if (event.detail.forwardChunks.length > 0) {
          this.headRenderedChunkIndex--
        }
      }

      this.renderTree();
    });

    this.onRootRender(event => {
      this.renderChunk(event.detail.chunk);
    });

    this.onRootMount(event => {
      this.calcTree();
    });
  }

  bind($target: Element): void {
    this.$target = $target;

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
    const newChunksToRender = this.chunks.slice(this.headRenderedChunkIndex, this.headRenderedChunkIndex + this.maxRenderedChunks);
    const keepChunks: Chunk[] = [];

    // Get old chunks, that need to keep in tree
    newChunksToRender.forEach(chunk => {
      if (this.chunksToRender.find(chunkToRender => chunkToRender.id === chunk.id)) {
        keepChunks.push(chunk);
      }
    });

    const isKeepChunk = (chunkId) => keepChunks.findIndex(chunk => chunk.id === chunkId) !== -1;

    // Remove chunks that not needed now
    this.chunksToRender.forEach(renderedChunk => {
      if (isKeepChunk(renderedChunk.id) === false) {
        this.removeChunk(renderedChunk);
      }
    });

    this.chunksToRender = newChunksToRender;

    // Render new chunks
    newChunksToRender.forEach(chunk => {
      if (isKeepChunk(chunk.id) === false) {
        this.taskEmitter.emitRender({
          chunk,
        });
      }
    });
  }

  private renderChunk(chunk: Chunk): void {
    const chunkIndex = this.chunksToRender.findIndex(renderChunk => renderChunk.id === chunk.id);

    if (chunkIndex === -1) {
      return;
    }

    const $chunkEl = document.createElement('div');
    $chunkEl.dataset['chunk'] = chunk.id.toString();
    $chunkEl.innerHTML = chunk.template;

    this.insertChunkEl(chunkIndex, $chunkEl);

    this.renderedChunks.push(chunk);

    this.taskEmitter.emitMount({
      $el: $chunkEl,
      chunk,
      renderedChunks: this.renderedChunks,
    });
  }

  private insertChunkEl(chunkIndex: number, $chunkEl: $ChunkEl): void {
    if (chunkIndex === 0) {
      this.getChunksContainer().prepend($chunkEl);
    } else if (this.renderedChunks.length === 0) {
      this.getChunksContainer().appendChild($chunkEl);
    } else {
      let $prevChunk = this.getTailChunkEl();
      let $targetChunkEl: $ChunkEl;

      while($prevChunk) {
        const chunkId = +$prevChunk.dataset['id'];

        // Check chunksToRender collection to find index of future rendered chunk
        // between chunks, which will be render
        const chunkToRenderIndex = this.chunksToRender.findIndex(chunkToRender => chunkToRender.id === chunkId);

        if (chunkIndex > chunkToRenderIndex) {
          $targetChunkEl = $prevChunk;
          break;
        }

        $prevChunk = $prevChunk.previousElementSibling as $ChunkEl;
      }

      if ($targetChunkEl) {
        $targetChunkEl.after($chunkEl);
      } else {
        $prevChunk.before($chunkEl);
      }
    }
  }

  private removeChunk(chunk: Chunk): void {
    const $chunkEl = this.getChunkEl(chunk);

    if ($chunkEl) {
      $chunkEl.remove();

      this.renderedChunks.splice(this.renderedChunks.indexOf(chunk), 1);

      this.taskEmitter.emitUnmount({
        chunk,
        renderedChunks: this.renderedChunks,
      });
    }
  }

  private getTailChunkEl(): $ChunkEl {
    return this.getChunksContainer().lastElementChild as $ChunkEl;
  }

  private getChunksContainer(): Element {
    return this.strategy.$chunksContainer;
  }

  private calcTree(): void {
    console.log('calc tree');
  }

  private setupStrategy(): void {
    this.strategy = this.options.strategy(this.$target);

    this.strategy.onMove(info => {
      if (info.direction === MoveDirection.TO_BOTTOM && info.remainingDistance < 300) {
        const forwardChunks = this.chunks.slice(this.headRenderedChunkIndex + this.chunksToRender.length);

        this.taskEmitter.emitReachBound({
          direction: info.direction,
          forwardChunks,
        });
      } else if (info.direction === MoveDirection.TO_TOP && info.remainingDistance < 300) {
        const forwardChunks = this.chunks.slice(0, this.headRenderedChunkIndex);

        this.taskEmitter.emitReachBound({
          direction: info.direction,
          forwardChunks,
        });
      }
    });

    setTimeout(() => {
      this.taskEmitter.emitReachBound({
        direction: MoveDirection.TO_BOTTOM,
        forwardChunks: [],
      });
    })
  }

  private convertItemsToChunks(items: RawItem[]): Chunk[] {
    return items.map((item, index) => ({
      data: item.data,
      template: item.template,
      id: this.lastChunkId++,
    }));
  }

  private getChunkEl(chunk: Chunk): $ChunkEl {
    let $chunkEl: $ChunkEl;

    Array.from(this.getChunksContainer().children).forEach(($el: $ChunkEl) => {
      if ($el.dataset['chunk'] === chunk.id.toString()) {
        $chunkEl = $el;
      }
    });

    return $chunkEl;
  }
}
