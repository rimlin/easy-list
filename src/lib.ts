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
  calculated: boolean;
  height: number;
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
  private lockMoveHandler = false;

  private maxRenderedChunks = 5;
  private lastChunkId = 0;

  private chunks: Chunk[] = [];
  private toRenderChunkIds: number[] = [];
  private renderedChunkIds: number[] = [];
  private headRenderedChunkIndex: number = 0;

  constructor(
    private options: EasyListOptions,
    priorityEvents: PriorityEvents,
    private taskEmitter: TaskEmitter,
  ) {
    super(priorityEvents);

    this.onRootReachBound(event => {
      this.lockMoveHandler = false;

      /**
       * If direction to top, remaining distance can be negative value
       * if scroll is over of top chunks box;
       *
       * If direction to bottom, remaining distance can be negative value
       * if scroll is over of bottom chunks box;
       */

      let remainHeight = Math.abs(event.detail.__remainingDistance);

      if (event.detail.direction === MoveDirection.TO_BOTTOM) {
        if (event.detail.forwardChunks.length > 0) {
          const reduceDelta = () => {
            const lastRenderedIndex = this.headRenderedChunkIndex + this.maxRenderedChunks + 1;

            if (lastRenderedIndex >= this.chunks.length) {
              return;
            }

            this.headRenderedChunkIndex++;

            remainHeight -= this.chunks[lastRenderedIndex].height;

            if (remainHeight > 0) {
              reduceDelta();
            }
          };

          reduceDelta();
        }
      }

      if (event.detail.direction === MoveDirection.TO_TOP) {
        if (event.detail.forwardChunks.length > 0) {
          const reduceDelta = () => {
            if (this.headRenderedChunkIndex <= 0) {
              return;
            }

            this.headRenderedChunkIndex--;

            remainHeight -= this.chunks[this.headRenderedChunkIndex].height;

            if (remainHeight > 0) {
              reduceDelta();
            }
          };

          reduceDelta();
        }
      }

      this.renderTree();
    });

    this.onRootRender(event => {
      this.renderChunk(event.detail.chunk);
    });

    this.onRootMount(event => {
      const { chunk } = event.detail;

      this.calcChunk(chunk);

      // If this chunk is not need to be in list anymore, remove it
      if (this.toRenderChunkIds.includes(chunk.id) === false) {
        this.tryToRemoveChunk(chunk.id);
      }
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
    const newToRenderChunks = this.chunks.slice(this.headRenderedChunkIndex, this.headRenderedChunkIndex + this.maxRenderedChunks);
    const keepChunks: number[] = [];

    // Get old chunks, that need to keep in tree
    newToRenderChunks.forEach(chunk => {
      if (this.toRenderChunkIds.includes(chunk.id) === true) {
        keepChunks.push(chunk.id);
      }
    });

    // Remove chunks that not needed now
    [...this.renderedChunkIds].forEach(chunkId => {
      if (keepChunks.includes(chunkId) === false) {
        this.tryToRemoveChunk(chunkId);
      }
    });

    this.toRenderChunkIds = newToRenderChunks.map(chunk => chunk.id);

    // Render new chunks
    newToRenderChunks.forEach(chunk => {
      /**
       * That case is possible if the mount of the chunk X was completed after
       * the chunk X appeared in the list for the 2nd time
       */
      if (this.renderedChunkIds.includes(chunk.id) === true) {
        return;
      }

      if (keepChunks.includes(chunk.id) === false) {
        this.taskEmitter.emitRender({
          chunk,
        });
      }
    });
  }

  private renderChunk(chunk: Chunk): void {
    const chunkIndex = this.toRenderChunkIds.indexOf(chunk.id);

    if (chunkIndex === -1) {
      return;
    }

    const $chunkEl = document.createElement('div');
    $chunkEl.dataset['chunk'] = chunk.id.toString();
    $chunkEl.innerHTML = chunk.template;

    this.insertChunkEl(chunk, $chunkEl);

    this.renderedChunkIds.push(chunk.id);

    this.taskEmitter.emitMount({
      $el: $chunkEl,
      chunk,
      renderedChunks: this.getChunksByIds(this.renderedChunkIds),
    });
  }

  private insertChunkEl(chunk: Chunk, $chunkEl: $ChunkEl): void {
    let chunkIndex = this.toRenderChunkIds.indexOf(chunk.id);

    if (chunkIndex === 0) {
      this.getChunksContainer().prepend($chunkEl);
    } else if (this.renderedChunkIds.length === 0) {
      this.getChunksContainer().appendChild($chunkEl);
    } else {
      let $prevChunk = this.getTailChunkEl();
      let $targetChunkEl: $ChunkEl;

      while($prevChunk) {
        const renderedChunkId = +$prevChunk.dataset['chunk'];

        // Check index of future render chunk between chunks, which were already rendered
        const renderedChunkIndex = this.getChunkIndex(renderedChunkId);
        chunkIndex = this.getChunkIndex(chunk.id);

        if (chunkIndex > renderedChunkIndex) {
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

  private tryToRemoveChunk(chunkId: number): boolean {
    const chunk = this.getChunkById(chunkId);

    if (chunk.calculated) {
      this.removeChunk(chunk);

      return true;
    } else {
      return false;
    }
  }

  private removeChunk(chunk: Chunk): void {
    const $chunkEl = this.getChunkEl(chunk);

    if ($chunkEl) {
      $chunkEl.remove();

      this.renderedChunkIds.splice(this.renderedChunkIds.indexOf(chunk.id), 1);
      this.calcTree();

      this.taskEmitter.emitUnmount({
        chunk,
        renderedChunks: this.getChunksByIds(this.renderedChunkIds),
      });
    }
  }

  private getTailChunkEl(): $ChunkEl {
    return this.getChunksContainer().lastElementChild as $ChunkEl;
  }

  private getChunksContainer(): HTMLElement {
    return this.strategy.$chunksContainer;
  }

  private calcChunk(chunk: Chunk): void {
    const chunkIndex = this.renderedChunkIds.indexOf(chunk.id);

    /**
     * Wow, this scroll is so fast
     * This case can be happen if chunk was already calculated and
     * now is removing in tree render
     */
    if (chunkIndex === -1) {
      return;
    }

    const $el = this.getChunkEl(chunk);

    const elHeight = Math.max(
      $el.offsetHeight, $el.clientHeight, $el.scrollHeight
    );

    this.updateChunk(chunk, {
      calculated: true,
      height: elHeight,
    });
  }

  private calcTree(): void {
    const headRenderedChunks = this.chunks.slice(0, this.headRenderedChunkIndex).filter(chunk => chunk.calculated);
    const tailRenderedChunks = this.chunks.slice(this.headRenderedChunkIndex + this.maxRenderedChunks).filter(chunk => chunk.calculated);

    const offsetTop = headRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);
    const offsetBottom = tailRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);

    this.$target.style.paddingTop = `${offsetTop}px`;
    this.$target.style.paddingBottom = `${offsetBottom}px`;
  }

  private setupStrategy(): void {
    this.strategy = this.options.strategy(this.$target);

    this.strategy.onMove(info => {
      if (this.lockMoveHandler) {
        return;
      }

      if (info.direction === MoveDirection.TO_BOTTOM && info.remainingDistance < 300) {
        this.lockMoveHandler = true;

        const forwardChunks = this.chunks.slice(this.headRenderedChunkIndex + this.toRenderChunkIds.length);

        this.taskEmitter.emitReachBound({
          direction: info.direction,
          forwardChunks,
          __remainingDistance: info.remainingDistance,
        });
      } else if (info.direction === MoveDirection.TO_TOP && info.remainingDistance < 300) {
        this.lockMoveHandler = true;

        const forwardChunks = this.chunks.slice(0, this.headRenderedChunkIndex);

        this.taskEmitter.emitReachBound({
          direction: info.direction,
          forwardChunks,
          __remainingDistance: info.remainingDistance,
        });
      }
    });

    setTimeout(() => {
      this.taskEmitter.emitReachBound({
        direction: MoveDirection.TO_BOTTOM,
        forwardChunks: [],
        __remainingDistance: 0,
      });
    })
  }

  private convertItemsToChunks(items: RawItem[]): Chunk[] {
    return items.map((item, index) => ({
      data: item.data,
      calculated: false,
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

  private getChunksByIds(chunkIds: number[]): Chunk[] {
    return chunkIds.map(chunkId => this.getChunkById(chunkId));
  }

  private getChunkById(chunkId: number): Chunk {
    return this.chunks[this.getChunkIndex(chunkId)];
  }

  private getChunkIndex(chunk: Chunk | number): number {
    if (typeof chunk === 'number') {
      return this.chunks.findIndex(currChunk => currChunk.id === chunk);
    } else {
      return this.chunks.findIndex(currChunk => currChunk.id === chunk.id);
    }
  }
}
