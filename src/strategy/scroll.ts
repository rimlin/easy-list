import { Strategy, ScrollStrategyFactory } from './interfaces';

class ScrollStrategy implements Strategy {
  constructor(private $target: Element) {
    this.check();

    window.addEventListener('scroll', this.onScroll);
  }

  destroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  private onScroll = () => {
    this.check();
  }

  private check(): void {
    const bounding = this.$target.getBoundingClientRect();
    console.log(bounding);
  }
}

export function createScrollStrategy(): ScrollStrategyFactory {
  return $target => {
    return new ScrollStrategy($target);
  }
}
