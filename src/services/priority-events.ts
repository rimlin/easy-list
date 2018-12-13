export class PriorityEvents {
  private rootBus: HTMLElement;
  private bus: HTMLElement;

  constructor() {
    this.rootBus = document.createElement('div');
    this.bus = document.createElement('div');
    this.rootBus.appendChild(this.bus);
  }

  on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    this.bus.addEventListener(event, callback, options);
  }

  onRoot(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    this.rootBus.addEventListener(event, callback, options);
  }

  once(event: string, callback: EventListenerOrEventListenerObject): void {
    this.on(event, callback, true);
  }

  onceRoot(event: string, callback: EventListenerOrEventListenerObject): void {
    this.onRoot(event, callback, true);
  }

  off(event: string, callback?: EventListenerOrEventListenerObject): void {
    this.bus.removeEventListener(event, callback);
  }

  offRoot(event: string, callback?: EventListenerOrEventListenerObject): void {
    this.rootBus.removeEventListener(event, callback);
  }

  emit(event: CustomEvent): void {
    this.bus.dispatchEvent(event);
  }
}
