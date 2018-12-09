import { EventEmitter } from './event-emitter';
import { isExists } from './utils';
import { Logger } from './logger';

export interface ChunkItem {
  id: number;
  data: any;
  template: string;
}

export interface Chunk {
  id: number;
  items: ChunkItem[];
  offset: number;
}

export interface DomChunk {
  $container: JQuery;
  $sentinelStart?: JQuery;
  $sentinelEnd: JQuery;
  $data: JQuery;
  renderedItems: number[];
}

export class InfinityFeedService extends EventEmitter {
  private $chunks: [DomChunk, DomChunk] = [null, null];
  private $offsetRetainer: JQuery;

  private settledOffsetRetainer = false;

  private chunks: Chunk[] = [];

  private chunkLength = 5;
  private chunkItemIndex = 0;

  private renderedChunks: number[] = [];

  constructor() {
    super();
  }

  bind($target: JQuery): void {
    $('head').append(`
      <style>
        .chunk-container, .offset-retainer {
          width: 100%;
          position: absolute;
          top: 0;
        }

        .offset-retainer {
          height: 1px;
        }

        .sentinel {
          position: absolute;
          pointer-events: none;
          height: 100px;
          width: 100%;
          visibility: hidden;
          z-index: 9999;
        }

        .sentinel.disabled {
          display: none;
        }

        #sentinel-top {
          top: 0;
        }

        #sentinel-end {
          bottom: 0;
        }
      </style>
    `);

    $target.append(`
      <div class="chunk-container">
        <div class="sentinel disabled" id="sentinel-start"></div>
        <div id="chunk-data"></div>
        <div class="sentinel" id="sentinel-end"></div>
      </div>
      <div class="chunk-container">
        <div id="chunk-data"></div>
        <div class="sentinel" id="sentinel-end"></div>
      </div>
      <div class="offset-retainer"></div>
    `);

    const $start = $target.find('.chunk-container:first-child');
    const $end = $start.next();

    this.$chunks = [
      {
        $container: $start,
        $sentinelStart: $start.find('#sentinel-start'),
        $sentinelEnd: $start.find('#sentinel-end'),
        $data: $start.find('#chunk-data'),
        renderedItems: [],
      },
      {
        $container: $end,
        $sentinelEnd: $end.find('#sentinel-end'),
        $data: $end.find('#chunk-data'),
        renderedItems: [],
      },
    ];

    this.$offsetRetainer = $target.find('.offset-retainer');

    this.setupEvents();
  }

  append(template: string, data?: any) {
    const chunkItem = {
      id: this.chunkItemIndex,
      data,
      template,
    };

    const chunkIndex = this.getChunkIndexForNewItem();

    if (this.chunks[chunkIndex]) {
      this.chunks[chunkIndex].items.push(chunkItem);
    } else {
      this.chunks[chunkIndex] = {
        id: chunkIndex,
        items: [chunkItem],
        offset: 0,
      };
    }

    // Если был создан новый чанк
    if (this.renderedChunks.includes(chunkIndex) === false) {
      this.renderedChunks.push(chunkIndex);
    }

    if (this.renderedChunks.length > 2) {
      this.renderedChunks.shift();
    }

    this.chunkItemIndex++;

    this.calculateWall();
  }

  recalc(): void {
    this.calculateWall();
  }

  private setupEvents(): void {
    const startObserver = new IntersectionObserver((entries, observer) => {
      if (entries[0].intersectionRatio <= 0) {
        return;
      }

      if (entries[0].target.classList.contains('disabled')) {
        return;
      }

      if (this.renderedChunks[0] <= 0) {
        return;
      } else {
        const endChunkNum = this.renderedChunks[0];

        this.renderedChunks[0] = endChunkNum - 1;
        this.renderedChunks[1] = endChunkNum;

        this.calculateWall();
      }

      this.emit('touch-start-sentinel');
    }, {
      rootMargin: '0px 0px 300px 0px'
    });

    const endObserver = new IntersectionObserver((entries, observer) => {
      if (entries[0].intersectionRatio <= 0) {
        return;
      }

      if (entries[0].target.classList.contains('disabled')) {
        return;
      }

      const startChunkLength = this.chunks[this.renderedChunks[0]].items.length;
      const endChunkLength = isExists(this.renderedChunks[1]) ? this.chunks[this.renderedChunks[1]].items.length : 0;

      if (startChunkLength >= this.chunkLength && endChunkLength >= Math.floor(this.chunkLength / 1.5)) {
        const newChunkId = this.renderedChunks[1] + 1;

        this.renderedChunks.push(newChunkId)
        this.renderedChunks.shift();

        Logger.debug('InfinityFeedService', 'new chunk')

        if (isExists(this.chunks[newChunkId]) === false) {
          this.chunks[newChunkId] = {
            id: newChunkId,
            items: [],
            offset: 0,
          };
        }
      }

      this.calculateWall();

      const lastChunk = this.chunks[this.chunks.length - 1];

      if (this.renderedChunks.includes(lastChunk.id)) {
        this.emit('touch-end-sentinel');
      }
    }, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '300px 0px 300px 0px'
    });

    var chunkChangesObserver = new MutationObserver((mutations) => {
      this.updateChunkOffset();
    });

    chunkChangesObserver.observe(this.$chunks[0].$data[0], {
      childList: true,
      subtree: true,
    });

    startObserver.observe(this.$chunks[0].$sentinelStart[0]);
    endObserver.observe(this.$chunks[1].$sentinelEnd[0]);
    endObserver.observe(this.$chunks[0].$sentinelEnd[0]);
  }

  private calculateWall() {
    this.freezeChunkHeight();
    this.renderChunks();
    this.updateChunkOffset();
    this.unfreezeChunkHeight();

    this.checkSentinels();
  }

  private freezeChunkHeight(): void {
    this.$chunks.forEach($chunk => {
      $chunk.$container.height($chunk.$container.height());
    });
  }

  private unfreezeChunkHeight(): void {
    this.$chunks.forEach($chunk => {
      $chunk.$container.height('auto');
    });
  }

  private checkSentinels(): void {
    const headChunkEndSentinel = this.$chunks[0].$sentinelEnd[0];
    const headChunkStartSentinel = this.$chunks[0].$sentinelStart[0];

    if (isExists(this.renderedChunks[1]) && this.chunks[this.renderedChunks[1]].items.length > 0) {
      if (headChunkEndSentinel.classList.contains('disabled') === false) {
        headChunkEndSentinel.classList.add('disabled');
      }
    } else if (headChunkEndSentinel.classList.contains('disabled')) {
      headChunkEndSentinel.classList.remove('disabled');
    }

    if (this.renderedChunks.length > 1) {
      headChunkStartSentinel.classList.remove('disabled');
    } else {
      headChunkStartSentinel.classList.add('disabled');
    }
  }

  private renderChunks(): void {
    this.$chunks
      .forEach((domChunk, index) => {
        const chunkId = this.renderedChunks[index];

        if (isExists(chunkId)) {
          const chunk = this.chunks[chunkId];

          this.renderChunk(domChunk, chunk);
        }
      });
  }

  private updateChunkOffset() {
    if (isExists(this.chunks[this.renderedChunks[1]]) === false) {
      return;
    }

    const oldChunks = [...this.chunks];
    const prevChunkOffset = oldChunks[this.renderedChunks[0]].offset;

    const offset = prevChunkOffset + this.$chunks[0].$container.height();

    this.chunks[this.renderedChunks[1]].offset = offset;

    this.$chunks[0].$container[0].style.transform = `translateY(${this.chunks[this.renderedChunks[0]].offset}px)`;
    this.$chunks[1].$container[0].style.transform = `translateY(${this.chunks[this.renderedChunks[1]].offset}px)`;

    const lastChunk = this.chunks[this.chunks.length - 1];

    if (lastChunk.id != this.renderedChunks[1]) {
      if (!this.settledOffsetRetainer) {
        const retainOffset = lastChunk.offset + this.$chunks[1].$container.height();

        this.$offsetRetainer[0].style.transform = `translateY(${retainOffset}px)`;
        this.settledOffsetRetainer = true;
      }
    } else {
      this.$offsetRetainer[0].style.transform = `translateY(0px)`;
      this.settledOffsetRetainer = false;
    }

    /**
     * Если происходит скролл вверх, то нужно удалить смещение чанков, которые
     * были отображены ранее, чтобы при дальнейшем скролле вниз не суммировалось
     * старое значение смещения и высоты блока $chunks[0]
     */
    const lastRenderedChunkIndex = this.chunks.findIndex(value => value.id === this.renderedChunks[1]);
    const retainChunks = this.chunks.slice(lastRenderedChunkIndex + 1);

    if (retainChunks.length > 0) {
      retainChunks.forEach(chunk => chunk.offset = 0);
    }
  }

  private renderChunk(domChunk: DomChunk, chunk: Chunk): void {
    const newRenderedItems: number[] = [];
    const itemsToRender: ChunkItem[] = [];
    const keepItemIds: number[] = [];

    chunk.items.forEach(item => {
      if (domChunk.renderedItems.includes(item.id)) {
        keepItemIds.push(item.id);
        newRenderedItems.push(item.id);
      } else {
        itemsToRender.push(item);
        newRenderedItems.push(item.id);
      }
    });

    $.each(this.getItemsFromChunk(domChunk), (index, chunkItem) => {
      if (keepItemIds.includes(+chunkItem.dataset['id']) === false) {
        chunkItem.remove();
      }
    });

    domChunk.renderedItems = newRenderedItems;

    itemsToRender.forEach(item => {
      this.renderChunkItem(domChunk, item);
    });
  }

  private renderChunkItem(domChunk: DomChunk, chunkItem: ChunkItem) {
    domChunk.$data.append(`<div class="chunk-item" data-id="${chunkItem.id}">${chunkItem.template}</div>`);
    this.emit('render-chunk-item', chunkItem.data);
  }

  private getChunkIndexForNewItem(): number {
    return Math.floor(this.chunkItemIndex / this.chunkLength);
  }

  private getItemsFromChunk(domChunk: DomChunk): JQuery {
    return domChunk.$data.find('.chunk-item');
  }

  private resetChunkItems(chunkNum): void {
    this.$chunks[chunkNum].$data.empty();
  }

}
