import { EasyListLib, RawItem } from './lib';
import { PriorityEvents } from './services/priority-events';
import { TaskEmitter } from './task/emitter';
import { TaskChildHandler } from './task/child-handler';
import {
  ExtendableEvent,
  TaskRenderData,
  TaskMountData,
  TaskReachBoundData,
  TaskUnmountData,
} from './task/interfaces';

export class EasyList {
  private easyList: EasyListLib;
  private taskChildHandler: TaskChildHandler;

  constructor() {
    const priorityEvents = new PriorityEvents();
    const taskEmitter = new TaskEmitter(priorityEvents);

    this.easyList = new EasyListLib(priorityEvents, taskEmitter);
    this.taskChildHandler = new TaskChildHandler(priorityEvents);
  }

  bind() {
    this.easyList.bind();
  }

  appendItems(items: RawItem[]): void {
    this.easyList.appendItems(items);
  }

  prependItems(items: RawItem[]): void {
    this.easyList.prependItems(items);
  }

  onReachBound(callback: (event: ExtendableEvent<TaskReachBoundData>) => void): void {
    this.taskChildHandler.onReachBound(callback);
  }

  onRender(callback: (event: ExtendableEvent<TaskRenderData>) => void): void {
    this.taskChildHandler.onRender(callback);
  }

  onMount(callback: (event: ExtendableEvent<TaskMountData>) => void): void {
    this.taskChildHandler.onMount(callback);
  }

  onUnmount(callback: (event: CustomEvent<TaskUnmountData>) => void): void {
    this.taskChildHandler.onUnmount(callback);
  }
}
