import { Chunk } from './lib';
import { EventEmitter } from './event-emitter';

export type ExtendableEvent<T> = CustomEvent<T> & {
  readonly waitUntil: (promise: Promise<any>) => void;
  readonly __onResolve: (callback: () => void) => void;
  readonly __resolve: () => void;
  __isPending: boolean;
};

export enum ReachBoundDirection {
  TO_TOP,
  TO_BOTTOM,
}

export enum HandlerEventType {
  MOUNT = 'mount',
  RENDER = 'render',
  REACH_BOUND = 'reach-bound',
}

export interface HandlerData {
  readonly chunk: Chunk;
  readonly renderedChunks: Chunk[];
}

export interface HandlerReachBoundData {
  readonly direction: ReachBoundDirection;
  readonly forwardChunks: Chunk[];
};

export type HandlerRenderData = HandlerData;
export type HandlerMountData = HandlerData;

const supplyWaitUntil = <T>(customEvent): ExtendableEvent<T> => {
  let callbacks = [];

  const resolve = () => {
    callbacks.forEach(cb => cb.call(cb));
    callbacks = null;
  };

  customEvent.__onResolve = callback => {
    if (callback instanceof Function) {
      callbacks.push(callback);
    }
  };

  customEvent.__resolve = resolve;

  customEvent.waitUntil = promise => {
    customEvent.__isPending = true;

    promise.then(() => {
      resolve();
      customEvent.__isPending = false;
    });
  };

  return customEvent;
}

export type BusyEvents = {
  [handleEvent in HandlerEventType]: any[];
}

export class Handler extends EventEmitter {
  private busyEvents: BusyEvents = {
    [HandlerEventType.REACH_BOUND]: [],
    [HandlerEventType.RENDER]: [],
    [HandlerEventType.MOUNT]: [],
  };

  constructor() {
    super();
  }

  onReachBound(callback: (event: ExtendableEvent<HandlerReachBoundData>) => void) {
    this.on(HandlerEventType.REACH_BOUND, callback);
  }

  onRender(callback: (event: ExtendableEvent<HandlerRenderData>) => void) {
    this.on(HandlerEventType.RENDER, callback);
  }

  onMount(callback: (event: CustomEvent<HandlerMountData>) => void) {
    this.on(HandlerEventType.MOUNT, callback);
  }

  protected onRootReachBound(callback: (event: ExtendableEvent<HandlerReachBoundData>) => void) {
    this.onRoot(HandlerEventType.REACH_BOUND, callback);
  }

  protected onRootRender(callback: (event: ExtendableEvent<HandlerRenderData>) => void) {
    this.onRoot(HandlerEventType.RENDER, callback);
  }

  protected onRootMount(callback: (event: CustomEvent<HandlerMountData>) => void) {
    this.onRoot(HandlerEventType.MOUNT, callback);
  }

  protected emitReachBound(data: HandlerReachBoundData) {
    if (this.busyEvents[HandlerEventType.REACH_BOUND].includes(data.direction)) {
      return;
    }

    const customEvent = new CustomEvent<HandlerReachBoundData>(HandlerEventType.REACH_BOUND, {
      detail: data,
      bubbles: true,
    });

    const enhancedCustomEvent = supplyWaitUntil<HandlerRenderData>(customEvent);

    enhancedCustomEvent.__onResolve(() => {
      this.busyEvents[HandlerEventType.REACH_BOUND].splice(this.busyEvents[HandlerEventType.REACH_BOUND].indexOf(data.direction), 1);
    });

    this.busyEvents[HandlerEventType.REACH_BOUND].push(data.direction);
    this.emit(enhancedCustomEvent);
  }

  protected emitRender(data: HandlerRenderData) {
    const customEvent = new CustomEvent<HandlerRenderData>(HandlerEventType.RENDER, {
      detail: data,
      bubbles: true,
    });

    this.emit(supplyWaitUntil<HandlerRenderData>(customEvent));
  }

  protected emitMount(data: HandlerMountData) {
    const customEvent = new CustomEvent<HandlerMountData>(HandlerEventType.MOUNT, {
      detail: data,
      bubbles: true,
    });

    this.emit(customEvent);
  }
}
