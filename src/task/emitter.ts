import {
  TaskType,
  TaskReachBoundData,
  TaskRenderData,
  TaskMountData,
  ExtendableEvent,
  TaskUnmountData,
} from './interfaces';
import { PriorityEvents } from '../services/priority-events';

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

export type BusyTasks = {
  [handleEvent in TaskType]: any[];
}

export class TaskEmitter {
  private busyTasks: BusyTasks = {
    [TaskType.REACH_BOUND]: [],
    [TaskType.RENDER]: [],
    [TaskType.MOUNT]: [],
    [TaskType.UNMOUNT]: [],
  };

  constructor(
    private priorityEvents: PriorityEvents,
  ) {}

  emitReachBound(data: TaskReachBoundData) {
    this.emit<TaskReachBoundData>(TaskType.REACH_BOUND, data, data.direction);
  }

  emitRender(data: TaskRenderData) {
    this.emit<TaskRenderData>(TaskType.RENDER, data, data.chunk.id);
  }

  emitMount(data: TaskMountData) {
    this.emit<TaskMountData>(TaskType.MOUNT, data, data.chunk.id);
  }

  emitUnmount(data: TaskUnmountData) {
    const customEvent = new CustomEvent<TaskUnmountData>(TaskType.UNMOUNT, {
      detail: data,
      bubbles: true,
    });

    this.priorityEvents.emit(customEvent);
  }

  private emit<T>(taskType: TaskType, data: T, marker) {
    if (this.busyTasks[taskType].includes(marker)) {
      return;
    }

    const customEvent = new CustomEvent<T>(taskType, {
      detail: data,
      bubbles: true,
    });

    const enhancedCustomEvent = supplyWaitUntil<T>(customEvent);

    enhancedCustomEvent.__onResolve(() => {
      this.busyTasks[taskType].splice(this.busyTasks[taskType].indexOf(marker), 1);
    });

    this.busyTasks[taskType].push(marker);
    this.priorityEvents.emit(enhancedCustomEvent);
  }
}
