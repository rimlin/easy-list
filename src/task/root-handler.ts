import { PriorityEvents } from '../services/priority-events';
import {
  ExtendableEvent,
  TaskType,
  TaskMountData,
  TaskRenderData,
  TaskReachBoundData,
  TaskUnmountData,
} from './interfaces';
import { isExists } from '../utils';

const handleExtendableEvent = <T>(callback: (event: ExtendableEvent<T>) => void) => {
  return (event: ExtendableEvent<T>) => {
    event.__onResolve(() => {
      callback(event);
    });

    if (isExists(event.__isPending) === false) {
      event.__resolve();
    }
  };
};

export class TaskRootHandler {
  constructor(
    private priorityEvents: PriorityEvents,
  ) {}

  protected onRootReachBound(callback: (event: ExtendableEvent<TaskReachBoundData>) => void) {
    this.priorityEvents.onRoot(TaskType.REACH_BOUND, handleExtendableEvent<TaskReachBoundData>(callback));
  }

  protected onRootRender(callback: (event: ExtendableEvent<TaskRenderData>) => void) {
    this.priorityEvents.onRoot(TaskType.RENDER, handleExtendableEvent<TaskRenderData>(callback));
  }

  protected onRootMount(callback: (event: ExtendableEvent<TaskMountData>) => void) {
    this.priorityEvents.onRoot(TaskType.MOUNT, handleExtendableEvent<TaskMountData>(callback));
  }

  protected onRootUnmount(callback: (event: ExtendableEvent<TaskUnmountData>) => void) {
    this.priorityEvents.onRoot(TaskType.UNMOUNT, handleExtendableEvent<TaskUnmountData>(callback));
  }
}
