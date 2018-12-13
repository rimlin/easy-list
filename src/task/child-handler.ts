import { PriorityEvents } from '../services/priority-events';
import {
  ExtendableEvent,
  TaskReachBoundData,
  TaskType,
  TaskRenderData,
  TaskMountData,
  TaskUnmountData,
} from './interfaces';

export class TaskChildHandler {
  constructor(
    private priorityEvents: PriorityEvents,
  ) {}

  onReachBound(callback: (event: ExtendableEvent<TaskReachBoundData>) => void) {
    this.priorityEvents.on(TaskType.REACH_BOUND, callback);
  }

  onRender(callback: (event: ExtendableEvent<TaskRenderData>) => void) {
    this.priorityEvents.on(TaskType.RENDER, callback);
  }

  onMount(callback: (event: ExtendableEvent<TaskMountData>) => void) {
    this.priorityEvents.on(TaskType.MOUNT, callback);
  }

  onUnmount(callback: (event: CustomEvent<TaskUnmountData>) => void) {
    this.priorityEvents.on(TaskType.UNMOUNT, callback);
  }
}

