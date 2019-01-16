import { EasyListLib, RawItem, EasyListOptions, DEFAULT_OPTIONS } from './lib';
import { PriorityEvents } from './services/priority-events';
import { TaskEmitter } from './task/emitter';
import { TaskChildHandler } from './task/child-handler';
import {
  ExtendableEvent,
  TaskRenderData,
  TaskMountData,
  TaskReachBoundData,
  TaskUnmountData,
  MoveDirection,
} from './task/interfaces';
import { createScrollStrategy } from './strategy/scroll';
import { isExists } from './utils';
import { DefaultRenderer } from './renderer/default';

export class EasyList {
  private easyList: EasyListLib;
  private taskChildHandler: TaskChildHandler;

  constructor(options: EasyListOptions = {}) {
    const priorityEvents = new PriorityEvents();
    const taskEmitter = new TaskEmitter(priorityEvents);

    this.easyList = new EasyListLib(
      this.normalizeOptions(options),
      priorityEvents,
      taskEmitter,
    );

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

  private normalizeOptions(options: EasyListOptions): EasyListOptions {
    if (!options.strategy) {
      options.strategy = createScrollStrategy();
    }

    if (!options.renderer) {
      options.renderer = new DefaultRenderer();
    }

    const throwInvalidNumber = name => {
      throw new Error(`Invalid ${name} value: it should be a integer number`);
    }

    const checkSensitivity = direction => {
      if (isExists(options.sensitivity[direction])) {
        if (
          Number.isSafeInteger(options.sensitivity[direction]) === false
        ) {
          throwInvalidNumber(`sensitivity ${direction}`);
        }
      } else {
        options.sensitivity[direction] = DEFAULT_OPTIONS.sensitivity[direction];
      }
    }

    if (isExists(options.maxItems)) {
      if (Number.isSafeInteger(options.maxItems) === false) {
        throwInvalidNumber('maxItems');
      }
    } else {
      options.maxItems = DEFAULT_OPTIONS.maxItems;
    }

    if (isExists(options.sensitivity)) {
      checkSensitivity(MoveDirection.TO_TOP);
      checkSensitivity(MoveDirection.TO_BOTTOM);
    } else {
      options.sensitivity = DEFAULT_OPTIONS.sensitivity;
    }

    return options;
  }
}
