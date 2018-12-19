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
  rendered: boolean;
  height?: number;
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
  private $target: HTMLElement;

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
      this.calcChunkHeight(event.detail.chunk);
      this.calcTree();
    });
  }

  bind($target: HTMLElement): void {
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

    const isKeepChunk = (chunkId) => this.getChunkIndex(chunkId, keepChunks) !== -1;

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
    const chunkIndex = this.getChunkIndex(chunk, this.chunksToRender);

    if (chunkIndex === -1) {
      return;
    }

    const $chunkEl = document.createElement('div');
    $chunkEl.dataset['chunk'] = chunk.id.toString();
    $chunkEl.innerHTML = chunk.template;

    this.insertChunkEl(chunkIndex, $chunkEl);

    this.renderedChunks.push(chunk);

    this.updateChunk(chunk, {
      rendered: true,
    });

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
        const chunkToRenderIndex = this.getChunkIndex(chunkId, this.chunksToRender);

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

      this.renderedChunks.splice(this.getChunkIndex(chunk, this.renderedChunks), 1);

      this.taskEmitter.emitUnmount({
        chunk,
        renderedChunks: this.renderedChunks,
      });
    }
  }

  private getTailChunkEl(): $ChunkEl {
    return this.getChunksContainer().lastElementChild as $ChunkEl;
  }

  private getChunksContainer(): HTMLElement {
    return this.strategy.$chunksContainer;
  }

  private calcChunkHeight(chunk: Chunk): void {
    const $el = this.getChunkEl(chunk);

    this.updateChunk(chunk, {
      height: $el.offsetHeight,
    });
  }

  private calcTree(): void {
    const headRenderedChunks = this.chunks.slice(0, this.headRenderedChunkIndex).filter(chunk => chunk.rendered);
    const tailRenderedChunks = this.chunks.slice(this.headRenderedChunkIndex + this.maxRenderedChunks).filter(chunk => chunk.rendered);

    const offsetTop = headRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);
    const offsetBottom = tailRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);

    this.getChunksContainer().style.paddingTop = `${offsetTop}px`;
    this.getChunksContainer().style.paddingBottom = `${offsetBottom}px`;
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
      rendered: false,
      template: item.template,
      height: 0,
      id: this.lastChunkId++,
    }));
  }

  private updateChunk(chunk: Chunk, partial: Partial<Chunk>): void {
    const chunkIndex = this.getChunkIndex(chunk);

    if (chunkIndex === -1) {
      throw new Error('Invalid chunk index at updateChunk()');
    }

    const oldChunk = this.chunks[chunkIndex];

    this.chunks[chunkIndex] = {
      ...oldChunk,
      ...partial,
      id: oldChunk.id,
    };
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

  private getChunkIndex(chunk: Chunk | number, collection = this.chunks) {
    if (typeof chunk === 'number') {
      return collection.findIndex(currChunk => currChunk.id === chunk);
    } else {
      return collection.findIndex(currChunk => currChunk.id === chunk.id);
    }
  }
}
