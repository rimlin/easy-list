import { Chunk, $ChunkEl } from '../lib';

export interface Renderer {
  /**
   * Attach binded chunks container to the Renderer
   */
  attach($chunksContainer: HTMLElement): void;

  /**
   * Render chunk in the DOM and return element
   */
  drawChunk(chunk: Chunk, chunkIndexFn: ChunkIndexFn): $ChunkEl;

  /**
   * Remove chunk from the DOM
   */
  removeChunk(chunk: Chunk): void;

  /**
   * Get chunk element
   */
  getChunkEl(chunk: Chunk): $ChunkEl;
}

export type ChunkIndexFn = (chunkId: number) => number;
