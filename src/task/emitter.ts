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
import { handleExtendableEvent } from './root-handler';

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
      customEvent.__isPending = false;

      if (customEvent.__canceled !== true) {
        resolve();
      }
    });
  };

  const originalSIP = customEvent.stopImmediatePropagation;

  customEvent.stopImmediatePropagation = () => {
    customEvent.__canceled = true;
    originalSIP.call(customEvent);
  }

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

  emitReachBound(data: TaskReachBoundData): Promise<ExtendableEvent<TaskReachBoundData>> {
    return this.emitExtendableEvent<TaskReachBoundData>(TaskType.REACH_BOUND, data, data.moveInfo.direction);
  }

  emitRender(data: TaskRenderData): Promise<ExtendableEvent<TaskRenderData>> {
    return this.emitExtendableEvent<TaskRenderData>(TaskType.RENDER, data, data.chunk.id);
  }

  emitMount(data: TaskMountData): Promise<ExtendableEvent<TaskMountData>> {
    return this.emitExtendableEvent<TaskMountData>(TaskType.MOUNT, data, data.chunk.id);
  }

  emitUnmount(data: TaskUnmountData): Promise<ExtendableEvent<TaskUnmountData>> {
    return this.emitExtendableEvent<TaskUnmountData>(TaskType.UNMOUNT, data, data.chunk.id);
  }

  private emitExtendableEvent<T>(taskType: TaskType, data: T, marker): Promise<ExtendableEvent<T>> {
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

    return new Promise(resolve => {
      this.priorityEvents.onceRoot(taskType, (event: ExtendableEvent<T>) => {
        if (event === enhancedCustomEvent) {
          handleExtendableEvent<T>(resolve)(event);
        }
      });

      this.priorityEvents.emit(enhancedCustomEvent);
    });
  }
}
