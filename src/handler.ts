import { Chunk, RawItem } from './lib';
import { EventEmitter } from './event-emitter';

export enum ReachBoundDirection {
  TO_TOP,
  TO_BOTTOM,
}

export enum HandlerEventName {
  MOUNT = 'mount',
  RENDER = 'render',
  REACH_BOUND = 'reach-bound',
}

export interface HandlerData {
  chunk: Chunk;
  renderedChunks: Chunk[];
}

export type HandlerMountData = HandlerData;
export type HandlerMount = CustomEvent<HandlerMountData>;

export type HandlerRenderData = HandlerData;
export type HandlerRender = CustomEvent<HandlerRenderData>;

export interface HandlerReachBoundData {
  direction: ReachBoundDirection;
  forwardChunks: Chunk[];
};
export type HandlerReachBound =  CustomEvent<HandlerReachBoundData> & {
  appendItems: (items: RawItem[]) => void;
  prependItems: (items: RawItem[]) => void;
};

export class Handler extends EventEmitter {
  constructor() {
    super();
  }

  onReachBound(callback: (event: HandlerReachBound) => void) {
    this.on(HandlerEventName.REACH_BOUND, callback);
  }

  onRender(callback: (event: HandlerRender) => void) {
    this.on(HandlerEventName.RENDER, callback);
  }

  onMount(callback: (event: HandlerMount) => void) {
    this.on(HandlerEventName.MOUNT, callback);
  }

  protected onRootReachBound(callback: (event: HandlerReachBound) => void) {
    this.onRoot(HandlerEventName.REACH_BOUND, callback);
  }

  protected onRootRender(callback: (event: HandlerReachBound) => void) {
    this.onRoot(HandlerEventName.RENDER, callback);
  }

  protected onRootMount(callback: (event: HandlerMount) => void) {
    this.onRoot(HandlerEventName.MOUNT, callback);
  }

  protected emitReachBound(data: HandlerReachBoundData) {
    const customEvent = new CustomEvent(HandlerEventName.REACH_BOUND, {
      detail: data,
      bubbles: true,
    }) as HandlerReachBound;

    customEvent.appendItems = (items) => {
      console.log('append items')
    };

    customEvent.prependItems = (item) => {
      console.log('prepend items')
    };

    this.emit(customEvent);
  }

  protected emitRender(data: HandlerRenderData) {
    const customEvent = new CustomEvent(HandlerEventName.RENDER, {
      detail: data,
      bubbles: true,
    });

    this.emit(customEvent);
  }

  protected emitMount(data: HandlerMountData) {
    const customEvent = new CustomEvent(HandlerEventName.MOUNT, {
      detail: data,
      bubbles: true,
    });

    this.emit(customEvent);
  }
}
