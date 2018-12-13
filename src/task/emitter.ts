import {
  ExtendableEvent,
  TaskMountData,
  TaskReachBoundData,
  TaskRenderData,
  TaskType,
  TaskUnmountData,
} from './interfaces';
import { PriorityEvents } from '../services/priority-events';
import { Eventer } from '../services/eventer';
import { randString } from '../utils';

const supplyWaitUntil = <T>(customEvent): ExtendableEvent<T> => {
  const eventName = randString(4);

  const resolve = () => {
    Eventer.emit(eventName);
    Eventer.off(eventName);
  };

  customEvent.__onResolve = callback => {
    Eventer.on(eventName, callback)
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
  [taskType in TaskType]: any[];
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
    this.emitExtendableEvent<TaskReachBoundData>(TaskType.REACH_BOUND, data, data.direction);
  }

  emitRender(data: TaskRenderData) {
    this.emitExtendableEvent<TaskRenderData>(TaskType.RENDER, data, data.chunk.id);
  }

  emitMount(data: TaskMountData) {
    this.emitExtendableEvent<TaskMountData>(TaskType.MOUNT, data, data.chunk.id);
  }

  emitUnmount(data: TaskUnmountData) {
    const customEvent = new CustomEvent<TaskUnmountData>(TaskType.UNMOUNT, {
      detail: data,
      bubbles: true,
    });

    this.priorityEvents.emit(customEvent);
  }

  private emitExtendableEvent<T>(taskType: TaskType, data: T, marker) {
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
