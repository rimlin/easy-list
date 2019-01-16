import { PriorityEvents } from './services/priority-events';
import { isExists } from './utils';
import { MoveDirection } from './task/interfaces';
import { TaskEmitter } from './task/emitter';
import { TaskRootHandler } from './task/root-handler';
import { Strategy, StrategyFactory } from './strategy/interfaces';
import { Renderer } from './renderer/interfaces';

export interface EasyListOptions {
  /**
   * Strategy is used to detect, that scroll bound is touched chunks box.
   *
   * By default is `ScrollStrategy`.
   */
  strategy?: StrategyFactory;

  /**
   * Renderer is used to render and remove chunks in chunks container.
   *
   * By default is `DefaultRenderer`.
   */
  renderer?: Renderer;

  /**
   * If enabled, after adding new chunks add space as placeholder after/before
   * rendered chunks. If chunk height is not defined, mount him as placeholder
   * to detect height of him element and increase placehodler space.
   *
   * Emitting `onMount/onUnmount` event with `isShadowPlaceholder: true` option.
   */
  useShadowPlaceholder?: boolean;

  /**
   * Max amount of items in list.
   *
   * By default is 5 items.
   */
  maxItems?: number;

  /**
   * Amount of pixels between edge item and current scroll position.
   * It should be less than item height.
   *
   * By default is 300px.
   */
  sensitivity?: {
    [MoveDirection.TO_BOTTOM]?: number;
    [MoveDirection.TO_TOP]?: number;
  };
}

export interface RawItem {
  template: string;
  height?: number;
  data?: any;
}

export interface Chunk extends RawItem {
  calculated: boolean;
  id: number;
}

export type $ChunkEl = HTMLDivElement;

export const DEFAULT_OPTIONS: EasyListOptions = {
  maxItems: 5,
  sensitivity: {
    [MoveDirection.TO_BOTTOM]: 300,
    [MoveDirection.TO_TOP]: 300,
  }
};

export class EasyListLib extends TaskRootHandler {
  private strategy: Strategy;
  private $target: HTMLElement;
  private lockMoveHandler = false;

  private maxRenderedChunks = DEFAULT_OPTIONS.maxItems;
  private lastChunkId = 0;

  private chunks: Chunk[] = [];
  private toRenderChunkIds: Set<number> = new Set();
  private renderedChunkIds: Set<number> = new Set();
  private runningShadowPlaceholderIds: Set<number> = new Set();
  private headRenderedChunkIndex: number = 0;

  private renderer: Renderer;

  constructor(
    private options: EasyListOptions,
    priorityEvents: PriorityEvents,
    private taskEmitter: TaskEmitter,
  ) {
    super(priorityEvents);

    this.renderer = this.options.renderer;

    this.maxRenderedChunks = this.options.maxItems;

    this.onRootReachBound(event => {
      this.lockMoveHandler = false;

      /**
       * If direction to top, remaining distance can be negative value
       * if scroll is over of top chunks box;
       *
       * If direction to bottom, remaining distance can be negative value
       * if scroll is over of bottom chunks box;
       */

      let remainHeight = Math.abs(event.detail.moveInfo.remainingDistance);

      if (event.detail.moveInfo.direction === MoveDirection.TO_BOTTOM) {
        if (event.detail.forwardChunks.length > 0) {
          const reduceDelta = () => {
            const lastRenderedIndex = this.headRenderedChunkIndex + this.maxRenderedChunks;

            if (lastRenderedIndex >= this.chunks.length) {
              return;
            }

            this.headRenderedChunkIndex++;

            if (this.chunks[lastRenderedIndex].calculated) {
              remainHeight -= this.chunks[lastRenderedIndex].height;

              if (remainHeight > 0) {
                reduceDelta();
              }
            }
          };

          reduceDelta();
        }
      }

      if (event.detail.moveInfo.direction === MoveDirection.TO_TOP) {
        if (event.detail.forwardChunks.length > 0) {
          const reduceDelta = () => {
            if (this.headRenderedChunkIndex <= 0) {
              return;
            }

            this.headRenderedChunkIndex--;

            if (this.chunks[this.headRenderedChunkIndex].calculated) {
              remainHeight -= this.chunks[this.headRenderedChunkIndex].height;

              if (remainHeight > 0) {
                reduceDelta();
              }
            }
          };

          reduceDelta();
        }
      }

      this.renderTree();
    });

    this.onRootRender(event => {
      this.buildChunk(event.detail.chunk);
    });

    this.onRootMount(event => {
      const { chunk } = event.detail;

      this.calcChunk(chunk);

      // If this chunk is not need to be in list anymore, destroy it
      if (this.toRenderChunkIds.has(chunk.id) === false) {
        this.tryToDestroyChunk(chunk.id);
      }
    });

    this.onRootUnmount(event => {
      const { chunk } = event.detail;

      this.deleteChunk(chunk);
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

    if (this.options.useShadowPlaceholder) {
      this.renderShadowPlaceholderTree(MoveDirection.TO_BOTTOM);
    }
  }

  prependItems(items: RawItem[]): void {
    const chunks = this.convertItemsToChunks(items);

    this.chunks.unshift(...chunks);
    this.renderTree();

    if (this.options.useShadowPlaceholder) {
      this.renderShadowPlaceholderTree(MoveDirection.TO_TOP);
    }
  }

  private renderTree(): void {
    const newToRenderChunks = this.chunks.slice(this.headRenderedChunkIndex, this.headRenderedChunkIndex + this.maxRenderedChunks);
    const keepChunks: number[] = [];

    const waitDestroy = [];

    // Get old chunks, that need to keep in tree
    newToRenderChunks.forEach(chunk => {
      if (this.toRenderChunkIds.has(chunk.id) === true) {
        keepChunks.push(chunk.id);
      }

      if (this.runningShadowPlaceholderIds.has(chunk.id)) {
        /**
         * If this chunk need to keep in tree and it exists in tree as shadow placeholder,
         * we need to destroy it, and mount chunk again without `isShadowPlaceholder` property
         */
        const destroyedChunk = this.destroyChunk(this.getChunkById(chunk.id)).then(event => {
          return Promise.resolve(chunk.id);
        });

        waitDestroy.push(destroyedChunk);
      }
    });

    Promise.all(waitDestroy).then(destroyedIds => {
      // Destroy chunks that not needed now
      [...this.renderedChunkIds].forEach(chunkId => {
        if (keepChunks.includes(chunkId) === false) {
          this.tryToDestroyChunk(chunkId);
        }
      });

      this.toRenderChunkIds = new Set([...newToRenderChunks.map(chunk => chunk.id), ...destroyedIds]);

      // Render new chunks
      this.toRenderChunkIds.forEach(chunkId => {
        const chunk = this.getChunkById(chunkId);

        /**
         * That case is possible if the mount of the chunk X was completed after
         * the chunk X appeared in the list for the 2nd time
         */
        if (this.renderedChunkIds.has(chunk.id) === true) {
          return;
        }

        if (keepChunks.includes(chunk.id) === false) {
          this.taskEmitter.emitRender({
            chunk,
            isShadowPlaceholder: false,
          });
        }
      });
    });
  }

  private renderShadowPlaceholderTree(direction: MoveDirection): void {
    let shadowPlaceholderChunks: Chunk[] = [];

    if (direction === MoveDirection.TO_BOTTOM) {
      shadowPlaceholderChunks = this.chunks.slice(this.headRenderedChunkIndex + this.maxRenderedChunks);
    }

    if (direction === MoveDirection.TO_TOP) {
      shadowPlaceholderChunks = this.chunks.slice(0, this.headRenderedChunkIndex);
    }

    shadowPlaceholderChunks.forEach(chunk => {
      if (isExists(chunk.height) && chunk.height > 0) {
        this.updateChunk(chunk, {
          calculated: true,
        });
      } else {
        this.runningShadowPlaceholderIds.add(chunk.id);

        this.taskEmitter.emitRender({
          chunk,
          isShadowPlaceholder: true,
        }).then(event => {
          event.stopImmediatePropagation();

          const $chunkEl = this.renderChunk(chunk);

          this.renderedChunkIds.add(chunk.id);

          this.taskEmitter.emitMount({
            $el: $chunkEl,
            chunk,
            renderedChunks: this.getChunksByIds(this.renderedChunkIds),
            isShadowPlaceholder: true,
          });
        });
      }
    });
  }

  private buildChunk(chunk: Chunk): void {
    if (this.toRenderChunkIds.has(chunk.id) === false) {
      return;
    }

    const $chunkEl = this.renderChunk(chunk);

    this.renderedChunkIds.add(chunk.id);

    this.taskEmitter.emitMount({
      $el: $chunkEl,
      chunk,
      renderedChunks: this.getChunksByIds(this.renderedChunkIds),
      isShadowPlaceholder: false,
    });
  }

  private renderChunk(chunk: Chunk): $ChunkEl {
    return this.renderer.drawChunk(chunk, this.getChunkIndex.bind(this));
  }

  private tryToDestroyChunk(chunkId: number): boolean {
    const chunk = this.getChunkById(chunkId);

    if (chunk.calculated) {
      this.destroyChunk(chunk);

      return true;
    } else {
      return false;
    }
  }

  /**
   * Initialize event to unmount chunk
   * With this event client can remove listeners from elements and etc.
   */
  private destroyChunk(chunk: Chunk) {
    const $chunkEl = this.renderer.getChunkEl(chunk);

    if ($chunkEl) {
      return this.taskEmitter.emitUnmount({
        $el: $chunkEl,
        chunk,
        renderedChunks: this.getChunksByIds(this.renderedChunkIds),
        isShadowPlaceholder: this.runningShadowPlaceholderIds.has(chunk.id),
      });
    }
  }

  private deleteChunk(chunk: Chunk): void {
    this.renderer.removeChunk(chunk);

    this.runningShadowPlaceholderIds.delete(chunk.id);
    this.renderedChunkIds.delete(chunk.id);
    this.calcTree();
  }

  private calcChunk(chunk: Chunk): void {
    /**
     * Wow, this scroll is so fast
     * This case can be happen if chunk was already calculated and
     * now is removed in tree render
     */
    if (this.renderedChunkIds.has(chunk.id) === false) {
      return;
    }

    const $el = this.renderer.getChunkEl(chunk);

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

    this.renderer.attach(this.strategy.$chunksContainer);

    this.strategy.onMove(info => {
      if (this.lockMoveHandler) {
        return;
      }

      if (info.direction === MoveDirection.TO_BOTTOM && info.remainingDistance < this.options.sensitivity[MoveDirection.TO_BOTTOM]) {
        this.lockMoveHandler = true;

        const forwardChunks = this.chunks.slice(this.headRenderedChunkIndex + this.toRenderChunkIds.size);

        this.taskEmitter.emitReachBound({
          moveInfo: info,
          forwardChunks,
        });
      } else if (info.direction === MoveDirection.TO_TOP && info.remainingDistance < this.options.sensitivity[MoveDirection.TO_TOP]) {
        this.lockMoveHandler = true;

        const forwardChunks = this.chunks.slice(0, this.headRenderedChunkIndex);

        this.taskEmitter.emitReachBound({
          moveInfo: info,
          forwardChunks,
        });
      }
    });
  }

  private convertItemsToChunks(items: RawItem[]): Chunk[] {
    return items.map((item, index) => ({
      data: item.data,
      calculated: false,
      template: item.template,
      height: isExists(item.height) ? item.height : 0,
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

  private getChunksByIds(chunkIds: Set<number>): Chunk[] {
    return [...chunkIds].map(chunkId => this.getChunkById(chunkId));
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
