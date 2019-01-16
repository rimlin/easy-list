import { Chunk, $ChunkEl } from '../lib';
import { Renderer, ChunkIndexFn } from './interfaces';
import { isExists } from '../utils';

export class DefaultRenderer implements Renderer {
  private $chunksContainer: HTMLElement;
  private renderedChunkIds = new Set<number>();

  attach($chunksContainer: HTMLElement): void {
    this.$chunksContainer = $chunksContainer;
  }

  drawChunk(chunk: Chunk, chunkIndexFn: ChunkIndexFn): $ChunkEl {
    const $chunkEl = document.createElement('div');
    $chunkEl.dataset['chunk'] = chunk.id.toString();
    $chunkEl.innerHTML = chunk.template;

    this.insertChunkEl(chunk, $chunkEl, chunkIndexFn);

    this.renderedChunkIds.add(chunk.id);

    return $chunkEl;
  }

  removeChunk(chunk: Chunk): void {
    const $chunkEl = this.getChunkEl(chunk);

    if ($chunkEl) {
      $chunkEl.remove();
    }

    this.renderedChunkIds.delete(chunk.id);
  }

  getChunkEl(chunk: Chunk): $ChunkEl {
    let $chunkEl: $ChunkEl;

    Array.from(this.$chunksContainer.children).forEach(($el: $ChunkEl) => {
      if ($el.dataset['chunk'] === chunk.id.toString()) {
        $chunkEl = $el;
      }
    });

    return $chunkEl;
  }

  private insertChunkEl(chunk: Chunk, $chunkEl: $ChunkEl, chunkIndexFn: ChunkIndexFn): void {
    let chunkIndex = chunkIndexFn(chunk.id);

    if (chunkIndex === 0) {
      this.$chunksContainer.prepend($chunkEl);
    } else if (this.renderedChunkIds.size === 0) {
      this.$chunksContainer.appendChild($chunkEl);
    } else {
      let $prevChunk = this.getTailChunkEl();
      let $targetChunkEl: $ChunkEl;

      while($prevChunk) {
        const renderedChunkId = +$prevChunk.dataset['chunk'];

        // Check index of future render chunk between chunks, which were already rendered
        const renderedChunkIndex = chunkIndexFn(renderedChunkId);
        chunkIndex = chunkIndexFn(chunk.id);

        if (chunkIndex > renderedChunkIndex) {
          $targetChunkEl = $prevChunk;
          break;
        }

        if (isExists($prevChunk.previousElementSibling) === false) {
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

  private getTailChunkEl(): $ChunkEl {
    return this.$chunksContainer.lastElementChild as $ChunkEl;
  }
}
