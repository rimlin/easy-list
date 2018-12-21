import { EasyListLib, RawItem, EasyListOptions } from './lib';
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
import { createScrollStrategy } from './strategy/scroll';

export class EasyList {
  private easyList: EasyListLib;
  private taskChildHandler: TaskChildHandler;

  constructor(options: EasyListOptions = {}) {
    const priorityEvents = new PriorityEvents();
    const taskEmitter = new TaskEmitter(priorityEvents);

    if (!options.strategy) {
      options.strategy = createScrollStrategy();
    }

    this.easyList = new EasyListLib(options, priorityEvents, taskEmitter);
    this.taskChildHandler = new TaskChildHandler(priorityEvents);
  }

  bind($target: Element | HTMLElement | string) {
    if (typeof $target === 'string') {
      $target = document.querySelector($target) as HTMLElement;
    }

    this.easyList.bind($target as HTMLElement);
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

  onUnmount(callback: (event: ExtendableEvent<TaskUnmountData>) => void): void {
    this.taskChildHandler.onUnmount(callback);
  }
}
