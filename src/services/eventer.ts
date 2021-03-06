export type CallbackFn = (...args) => void;
export type EventItem = {
  callback: CallbackFn;
  once?: boolean;
};

export type Events = {
  [event: string]: EventItem[];
}

class EventEmitter {
  private events: Events = {};

  on(event: string, callback: CallbackFn, once?: boolean): void {
    if (callback instanceof Function === false) {
      throw new Error('Event handler should be Function');
    }

    if (this.events[event]) {
      this.events[event].push({
        callback,
        once,
      });
    } else {
      this.events[event] = [{
        callback,
        once,
      }];
    }
  }

  once(event: string, callback: CallbackFn): void {
    this.on(event, callback, true);
  }

  off(event: string, callback?: CallbackFn): void {
    if (callback && callback instanceof Function === false) {
      throw new Error('If you provide handler, it should be Function');
    }

    if (callback) {
      if (!this.events[event]) {
        return;
      }

      this.events[event].forEach((eventItem, index) => {
        if (eventItem.callback === callback) {
          this.deleteEventCallback(event, index);
        }
      });
    } else {
      this.events[event] = [];
    }
  }

  emit(event: string, ...args): void {
    if (this.events[event]) {
      this.events[event].forEach((eventItem, index) => {
        eventItem.callback.apply(eventItem.callback, args);

        if (eventItem.once) {
          this.deleteEventCallback(event, index);
        }
      });
    }
  }

  private deleteEventCallback(event: string, cbIndex: number): void {
    this.events[event].splice(cbIndex, 1);
  }
}

export const Eventer = new EventEmitter();
