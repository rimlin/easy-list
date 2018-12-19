import { Strategy, StrategyFactory, StrategyMoveInfo } from './interfaces';
import { Eventer } from '../services/eventer';
import { MoveDirection } from '../task/interfaces';

export type BoundingBox = ClientRect | DOMRect;

const moveEvent = 'scroll-move';

class ScrollStrategy implements Strategy {
  $chunksContainer: HTMLElement;

  private lastYCoord = 0;

  constructor(
    private $scrollContainer: HTMLElement | Window,
    private $target: HTMLElement
  ) {
    $target.innerHTML = `<div></div>`;

    this.$chunksContainer = $target.firstElementChild as HTMLElement;

    this.check();

    this.$scrollContainer.addEventListener('scroll', this.onScroll, {
      passive: true,
    });
  }

  destroy(): void {
    this.$scrollContainer.removeEventListener('scroll', this.onScroll);
  }

  onMove(callback: (info: StrategyMoveInfo) => void) {
    Eventer.on(moveEvent, callback);
  }

  private onScroll = () => {
    this.check();
  }

  private check(): void {
    const scrollBox = this.getScrollBox();
    const chunksBox = this.getChunksBox();
    const direction = this.getVerticalDirection();
    let remainingDistance: number;

    if (direction === MoveDirection.TO_BOTTOM) {
      remainingDistance = chunksBox.bottom;
    } else if (direction === MoveDirection.TO_TOP) {
      remainingDistance = chunksBox.top * -1;
    } else {
      throw new Error('Undefined direction');
    }

    const info: StrategyMoveInfo = {
      direction,
      remainingDistance,
    };

    Eventer.emit(moveEvent, info);
  }

  private getVerticalDirection(): MoveDirection {
    let direction: MoveDirection;
    let currentY: number;

    if (this.$scrollContainer instanceof Window) {
      currentY = window.pageYOffset || document.documentElement.scrollTop;
    } else {
      currentY = this.$scrollContainer.scrollTop;
    }

    if (currentY > this.lastYCoord) {
      direction = MoveDirection.TO_BOTTOM;
    } else {
      direction = MoveDirection.TO_TOP;
    }

    this.lastYCoord = currentY;

    return direction;
  }

  /**
   * Box where is placed chunks box and considering paddings of $target
   */
  private getScrollBox(): BoundingBox {
    const viewportBox = this.getViewportBox();
    const targetBox = this.$target.getBoundingClientRect();

    return {
      top: targetBox.top - viewportBox.top,
      right: targetBox.right,
      bottom: targetBox.bottom - viewportBox.bottom,
      left: targetBox.left - viewportBox.left,
      height: targetBox.height,
      width: targetBox.width,
    };
  }

  /**
   * Box with rendered chunks
   */
  private getChunksBox(): BoundingBox {
    const viewportBox = this.getViewportBox();
    const chunksBox = this.$chunksContainer.getBoundingClientRect();

    return {
      top: chunksBox.top - viewportBox.top,
      right: chunksBox.right,
      bottom: chunksBox.bottom - viewportBox.bottom,
      left: chunksBox.left - viewportBox.left,
      height: chunksBox.height,
      width: chunksBox.width,
    };
  }

  /**
   * Box of viewport
   */
  private getViewportBox(): BoundingBox {
    if (this.$scrollContainer instanceof Window) {
      return {
        top: 0,
        right: this.getWindowWidth(),
        bottom: this.getWindowHeight(),
        left: 0,
        height: this.getWindowHeight(),
        width: this.getWindowWidth(),
      }
    } else {
      return this.$scrollContainer.getBoundingClientRect();
    }
  }

  private getWindowWidth(): number {
    return Math.min(
      document.body.clientWidth, document.documentElement.clientWidth
    );
  }

  private getWindowHeight(): number {
    return Math.min(
      document.body.clientHeight, document.documentElement.clientHeight
    );
  }
}

export function createScrollStrategy($scrollContainer: string | HTMLElement | Window = window): StrategyFactory {
  if (typeof $scrollContainer === 'string') {
    $scrollContainer = document.querySelector($scrollContainer) as HTMLElement;
  }

  return $target => {
    return new ScrollStrategy($scrollContainer as HTMLElement | Window, $target);
  }
}
