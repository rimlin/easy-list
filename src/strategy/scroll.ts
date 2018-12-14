import { Strategy, ScrollStrategyFactory } from './interfaces';

export type BoundingBox = ClientRect | DOMRect;

class ScrollStrategy implements Strategy {
  $chunksContainer: Element;

  constructor(
    private $scrollContainer: Element | Window,
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

  private onScroll = () => {
    this.check();
  }

  private check(): void {
    const boundingBox = this.getBoundingBox();

    console.log(boundingBox);
    console.log('---------------------')
  }

  private getBoundingBox(): BoundingBox {
    let boundingBox: BoundingBox;

    if (this.$scrollContainer instanceof Window) {
      boundingBox = this.$chunksContainer.getBoundingClientRect();
    } else {
      const parentPos = this.$scrollContainer.getBoundingClientRect();
      const childrenPos = this.$chunksContainer.getBoundingClientRect();

      console.log('parent', parentPos);
      console.log('children', childrenPos);

      boundingBox = {
        top: childrenPos.top - parentPos.top,
        right: childrenPos.right - parentPos.right,
        bottom: childrenPos.bottom - parentPos.bottom + parentPos.height,
        left: childrenPos.left - parentPos.left,
        height: childrenPos.height,
        width: childrenPos.width,
      };
    }

    return boundingBox;
  }
}

export function createScrollStrategy($scrollContainer: string | Element | Window = window): ScrollStrategyFactory {
  if (typeof $scrollContainer === 'string') {
    $scrollContainer = document.querySelector($scrollContainer);
  }

  return $target => {
    return new ScrollStrategy($scrollContainer as Element | Window, $target);
  }
}
