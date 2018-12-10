export class EventEmitter {
  private rootBus: HTMLElement;
  private bus: HTMLElement;

  constructor() {
    this.rootBus = document.createElement('div');
    this.bus = document.createElement('div');
    this.rootBus.appendChild(this.bus);
  }

  protected on(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    this.bus.addEventListener(event, callback, options);
  }

  protected onRoot(event: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    this.rootBus.addEventListener(event, callback, options);
  }

  protected once(event: string, callback: EventListenerOrEventListenerObject): void {
    this.on(event, callback, true);
  }

  protected onceRoot(event: string, callback: EventListenerOrEventListenerObject): void {
    this.onRoot(event, callback, true);
  }

  protected off(event: string, callback?: EventListenerOrEventListenerObject): void {
    this.bus.removeEventListener(event, callback);
  }

  protected offRoot(event: string, callback?: EventListenerOrEventListenerObject): void {
    this.rootBus.removeEventListener(event, callback);
  }

  protected emit(event: CustomEvent): void {
    this.bus.dispatchEvent(event);
  }
}
