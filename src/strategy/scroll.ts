import { Strategy, StrategyFactory, StrategyMoveInfo } from './interfaces';
import { Eventer } from '../services/eventer';
import { MoveDirection } from '../task/interfaces';

export type BoundingBox = ClientRect | DOMRect;

const moveEvent = 'scroll-move';

class ScrollStrategy implements Strategy {
  $chunksContainer: Element;

  private lastYCoord = 0;

  constructor(
    private $scrollContainer: HTMLDivElement | Window,
    private $target: Element
  ) {
    if ($target === $scrollContainer) {
      $target.innerHTML = '<div></div>';
      this.$chunksContainer = $target.firstElementChild;
    } else {
      this.$chunksContainer = $target;
    }

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
    const boundingBox = this.getBoundingBox();
    const viewHeight = this.getViewHeight();
    const direction = this.getVerticalDirection();
    let remainingDistance: number;

    if (direction === MoveDirection.TO_BOTTOM) {
      remainingDistance = boundingBox.bottom - viewHeight;
    } else if (direction === MoveDirection.TO_TOP) {
      remainingDistance = Math.abs(boundingBox.top);
    } else {
      throw new Error('Undefined direction');
    }

    const info: StrategyMoveInfo = {
      direction,
      remainingDistance,
    };

    Eventer.emit(moveEvent, info);
  }

  private getBoundingBox(): BoundingBox {
    let boundingBox: BoundingBox;

    if (this.$scrollContainer instanceof Window) {
      boundingBox = this.$chunksContainer.getBoundingClientRect();
    } else {
      const parentPos = this.$scrollContainer.getBoundingClientRect();
      const childrenPos = this.$chunksContainer.getBoundingClientRect();

      boundingBox = {
        top: childrenPos.top - parentPos.top,
        right: childrenPos.right,
        bottom: childrenPos.bottom - parentPos.bottom + parentPos.height,
        left: childrenPos.left - parentPos.left,
        height: childrenPos.height,
        width: childrenPos.width,
      };
    }

    return boundingBox;
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

  private getViewHeight(): number {
    let height: number;

    if (this.$scrollContainer instanceof Window) {
      height = Math.min(
        document.body.clientHeight, document.documentElement.clientHeight
      );
    } else {
      height = Math.max(
        this.$scrollContainer.offsetHeight, this.$scrollContainer.clientHeight,
      );
    }

    return height;
  }
}

export function createScrollStrategy($scrollContainer: string | Element | Window = window): StrategyFactory {
  if (typeof $scrollContainer === 'string') {
    $scrollContainer = document.querySelector($scrollContainer);
  }

  return $target => {
    return new ScrollStrategy($scrollContainer as HTMLDivElement | Window, $target);
  }
}
