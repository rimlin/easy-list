(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;
const easyList = new index_1.EasyList();
easyList.bind('#feed');
addItem();
easyList.onReachBound(event => {
    addItem();
});
easyList.onMount(event => {
    event.waitUntil(new Promise(resolve => {
        const imgEl = event.detail.$el.querySelector('img');
        const image = new Image();
        image.src = imgEl.getAttribute('src');
        image.onload = () => {
            resolve();
        };
    }));
});
function addItem() {
    const item = getItem();
    easyList.appendItems([{
            template: getItemTemplate(item),
            data: item
        }]);
}
function getItem() {
    const newId = id++;
    return {
        image: `${randPicture}?sig=${newId}`,
        id: newId,
    };
}
function getItemTemplate(item) {
    return `<div class="item">
    <h1>Picture ${item.id}</h1>
    <img src="${item.image}" />
  </div>`;
}

},{"../../index":2}],2:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./src/api"));

},{"./src/api":3}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("./lib");
const priority_events_1 = require("./services/priority-events");
const emitter_1 = require("./task/emitter");
const child_handler_1 = require("./task/child-handler");
const interfaces_1 = require("./task/interfaces");
const scroll_1 = require("./strategy/scroll");
const utils_1 = require("./utils");
class EasyList {
    constructor(options = {}) {
        const priorityEvents = new priority_events_1.PriorityEvents();
        const taskEmitter = new emitter_1.TaskEmitter(priorityEvents);
        this.easyList = new lib_1.EasyListLib(this.normalizeOptions(options), priorityEvents, taskEmitter);
        this.taskChildHandler = new child_handler_1.TaskChildHandler(priorityEvents);
    }
    bind($target) {
        if (typeof $target === 'string') {
            $target = document.querySelector($target);
        }
        this.easyList.bind($target);
    }
    appendItems(items) {
        this.easyList.appendItems(items);
    }
    prependItems(items) {
        this.easyList.prependItems(items);
    }
    onReachBound(callback) {
        this.taskChildHandler.onReachBound(callback);
    }
    onRender(callback) {
        this.taskChildHandler.onRender(callback);
    }
    onMount(callback) {
        this.taskChildHandler.onMount(callback);
    }
    onUnmount(callback) {
        this.taskChildHandler.onUnmount(callback);
    }
    normalizeOptions(options) {
        if (!options.strategy) {
            options.strategy = scroll_1.createScrollStrategy();
        }
        const throwInvalidNumber = name => {
            throw new Error(`Invalid ${name} value: it should be a integer number`);
        };
        const checkSensitivity = direction => {
            if (utils_1.isExists(options.sensitivity[direction])) {
                if (Number.isSafeInteger(options.sensitivity[direction]) === false) {
                    throwInvalidNumber(`sensitivity ${direction}`);
                }
            }
            else {
                options.sensitivity[direction] = lib_1.DEFAULT_OPTIONS.sensitivity[direction];
            }
        };
        if (utils_1.isExists(options.maxItems)) {
            if (Number.isSafeInteger(options.maxItems) === false) {
                throwInvalidNumber('maxItems');
            }
        }
        else {
            options.maxItems = lib_1.DEFAULT_OPTIONS.maxItems;
        }
        if (utils_1.isExists(options.sensitivity)) {
            checkSensitivity(interfaces_1.MoveDirection.TO_TOP);
            checkSensitivity(interfaces_1.MoveDirection.TO_BOTTOM);
        }
        else {
            options.sensitivity = lib_1.DEFAULT_OPTIONS.sensitivity;
        }
        return options;
    }
}
exports.EasyList = EasyList;

},{"./lib":4,"./services/priority-events":6,"./strategy/scroll":7,"./task/child-handler":8,"./task/emitter":9,"./task/interfaces":10,"./utils":12}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const interfaces_1 = require("./task/interfaces");
const root_handler_1 = require("./task/root-handler");
exports.DEFAULT_OPTIONS = {
    maxItems: 5,
    sensitivity: {
        [interfaces_1.MoveDirection.TO_BOTTOM]: 300,
        [interfaces_1.MoveDirection.TO_TOP]: 300,
    }
};
class EasyListLib extends root_handler_1.TaskRootHandler {
    constructor(options, priorityEvents, taskEmitter) {
        super(priorityEvents);
        this.options = options;
        this.taskEmitter = taskEmitter;
        this.lockMoveHandler = false;
        this.maxRenderedChunks = exports.DEFAULT_OPTIONS.maxItems;
        this.lastChunkId = 0;
        this.chunks = [];
        this.toRenderChunkIds = new Set();
        this.renderedChunkIds = new Set();
        this.runningShadowPlaceholderIds = new Set();
        this.headRenderedChunkIndex = 0;
        this.maxRenderedChunks = this.options.maxItems;
        this.onRootReachBound(event => {
            this.lockMoveHandler = false;
            /**
             * If direction to top, remaining distance can be negative value
             * if scroll is over of top chunks box;
             *
             * If direction to bottom, remaining distance can be negative value
             * if scroll is over of bottom chunks box;
             */
            let remainHeight = Math.abs(event.detail.moveInfo.remainingDistance);
            if (event.detail.moveInfo.direction === interfaces_1.MoveDirection.TO_BOTTOM) {
                if (event.detail.forwardChunks.length > 0) {
                    const reduceDelta = () => {
                        const lastRenderedIndex = this.headRenderedChunkIndex + this.maxRenderedChunks;
                        if (lastRenderedIndex >= this.chunks.length) {
                            return;
                        }
                        this.headRenderedChunkIndex++;
                        if (this.chunks[lastRenderedIndex].calculated) {
                            remainHeight -= this.chunks[lastRenderedIndex].height;
                            if (remainHeight > 0) {
                                reduceDelta();
                            }
                        }
                    };
                    reduceDelta();
                }
            }
            if (event.detail.moveInfo.direction === interfaces_1.MoveDirection.TO_TOP) {
                if (event.detail.forwardChunks.length > 0) {
                    const reduceDelta = () => {
                        if (this.headRenderedChunkIndex <= 0) {
                            return;
                        }
                        this.headRenderedChunkIndex--;
                        if (this.chunks[this.headRenderedChunkIndex].calculated) {
                            remainHeight -= this.chunks[this.headRenderedChunkIndex].height;
                            if (remainHeight > 0) {
                                reduceDelta();
                            }
                        }
                    };
                    reduceDelta();
                }
            }
            this.renderTree();
        });
        this.onRootRender(event => {
            this.renderChunk(event.detail.chunk);
        });
        this.onRootMount(event => {
            const { chunk } = event.detail;
            this.calcChunk(chunk);
            // If this chunk is not need to be in list anymore, destroy it
            if (this.toRenderChunkIds.has(chunk.id) === false) {
                this.tryToDestroyChunk(chunk.id);
            }
        });
        this.onRootUnmount(event => {
            const { chunk } = event.detail;
            this.removeChunk(chunk);
        });
    }
    bind($target) {
        this.$target = $target;
        this.setupStrategy();
    }
    appendItems(items) {
        const chunks = this.convertItemsToChunks(items);
        this.chunks.push(...chunks);
        this.renderTree();
        if (this.options.useShadowPlaceholder) {
            this.renderShadowPlaceholderTree(interfaces_1.MoveDirection.TO_BOTTOM);
        }
    }
    prependItems(items) {
        const chunks = this.convertItemsToChunks(items);
        this.chunks.unshift(...chunks);
        this.renderTree();
        if (this.options.useShadowPlaceholder) {
            this.renderShadowPlaceholderTree(interfaces_1.MoveDirection.TO_TOP);
        }
    }
    renderTree() {
        const newToRenderChunks = this.chunks.slice(this.headRenderedChunkIndex, this.headRenderedChunkIndex + this.maxRenderedChunks);
        const keepChunks = [];
        const waitDestroy = [];
        // Get old chunks, that need to keep in tree
        newToRenderChunks.forEach(chunk => {
            if (this.toRenderChunkIds.has(chunk.id) === true) {
                keepChunks.push(chunk.id);
            }
            if (this.runningShadowPlaceholderIds.has(chunk.id)) {
                /**
                 * If this chunk need to keep in tree and it exists in tree as shadow placeholder,
                 * we need to destroy it, and mount chunk again without `isShadowPlaceholder` property
                 */
                const destroyedChunk = this.destroyChunk(this.getChunkById(chunk.id)).then(event => {
                    return Promise.resolve(chunk.id);
                });
                waitDestroy.push(destroyedChunk);
            }
        });
        Promise.all(waitDestroy).then(destroyedIds => {
            // Destroy chunks that not needed now
            [...this.renderedChunkIds].forEach(chunkId => {
                if (keepChunks.includes(chunkId) === false) {
                    this.tryToDestroyChunk(chunkId);
                }
            });
            this.toRenderChunkIds = new Set([...newToRenderChunks.map(chunk => chunk.id), ...destroyedIds]);
            // Render new chunks
            this.toRenderChunkIds.forEach(chunkId => {
                const chunk = this.getChunkById(chunkId);
                /**
                 * That case is possible if the mount of the chunk X was completed after
                 * the chunk X appeared in the list for the 2nd time
                 */
                if (this.renderedChunkIds.has(chunk.id) === true) {
                    return;
                }
                if (keepChunks.includes(chunk.id) === false) {
                    this.taskEmitter.emitRender({
                        chunk,
                        isShadowPlaceholder: false,
                    });
                }
            });
        });
    }
    renderShadowPlaceholderTree(direction) {
        let shadowPlaceholderChunks = [];
        if (direction === interfaces_1.MoveDirection.TO_BOTTOM) {
            shadowPlaceholderChunks = this.chunks.slice(this.headRenderedChunkIndex + this.maxRenderedChunks);
        }
        if (direction === interfaces_1.MoveDirection.TO_TOP) {
            shadowPlaceholderChunks = this.chunks.slice(0, this.headRenderedChunkIndex);
        }
        shadowPlaceholderChunks.forEach(chunk => {
            if (utils_1.isExists(chunk.height) && chunk.height > 0) {
                this.updateChunk(chunk, {
                    calculated: true,
                });
            }
            else {
                this.runningShadowPlaceholderIds.add(chunk.id);
                this.taskEmitter.emitRender({
                    chunk,
                    isShadowPlaceholder: true,
                }).then(event => {
                    event.stopImmediatePropagation();
                    const $chunkEl = this.drawChunk(chunk);
                    this.renderedChunkIds.add(chunk.id);
                    this.taskEmitter.emitMount({
                        $el: $chunkEl,
                        chunk,
                        renderedChunks: this.getChunksByIds(this.renderedChunkIds),
                        isShadowPlaceholder: true,
                    });
                });
            }
        });
    }
    renderChunk(chunk) {
        if (this.toRenderChunkIds.has(chunk.id) === false) {
            return;
        }
        const $chunkEl = this.drawChunk(chunk);
        this.renderedChunkIds.add(chunk.id);
        this.taskEmitter.emitMount({
            $el: $chunkEl,
            chunk,
            renderedChunks: this.getChunksByIds(this.renderedChunkIds),
            isShadowPlaceholder: false,
        });
    }
    drawChunk(chunk) {
        const $chunkEl = document.createElement('div');
        $chunkEl.dataset['chunk'] = chunk.id.toString();
        $chunkEl.innerHTML = chunk.template;
        this.insertChunkEl(chunk, $chunkEl);
        return $chunkEl;
    }
    insertChunkEl(chunk, $chunkEl) {
        let chunkIndex = this.getChunkIndex(chunk.id);
        if (chunkIndex === 0) {
            this.getChunksContainer().prepend($chunkEl);
        }
        else if (this.renderedChunkIds.size === 0) {
            this.getChunksContainer().appendChild($chunkEl);
        }
        else {
            let $prevChunk = this.getTailChunkEl();
            let $targetChunkEl;
            while ($prevChunk) {
                const renderedChunkId = +$prevChunk.dataset['chunk'];
                // Check index of future render chunk between chunks, which were already rendered
                const renderedChunkIndex = this.getChunkIndex(renderedChunkId);
                chunkIndex = this.getChunkIndex(chunk.id);
                if (chunkIndex > renderedChunkIndex) {
                    $targetChunkEl = $prevChunk;
                    break;
                }
                if (utils_1.isExists($prevChunk.previousElementSibling) === false) {
                    break;
                }
                $prevChunk = $prevChunk.previousElementSibling;
            }
            if ($targetChunkEl) {
                $targetChunkEl.after($chunkEl);
            }
            else {
                $prevChunk.before($chunkEl);
            }
        }
    }
    tryToDestroyChunk(chunkId) {
        const chunk = this.getChunkById(chunkId);
        if (chunk.calculated) {
            this.destroyChunk(chunk);
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Initialize event to unmount chunk
     * With this event client can remove listeners from elements and etc.
     */
    destroyChunk(chunk) {
        const $chunkEl = this.getChunkEl(chunk);
        if ($chunkEl) {
            return this.taskEmitter.emitUnmount({
                $el: $chunkEl,
                chunk,
                renderedChunks: this.getChunksByIds(this.renderedChunkIds),
                isShadowPlaceholder: this.runningShadowPlaceholderIds.has(chunk.id),
            });
        }
    }
    /**
     * Remove chunk from the DOM
     */
    removeChunk(chunk) {
        const $chunkEl = this.getChunkEl(chunk);
        if ($chunkEl) {
            $chunkEl.remove();
            this.runningShadowPlaceholderIds.delete(chunk.id);
            this.renderedChunkIds.delete(chunk.id);
            this.calcTree();
        }
    }
    getTailChunkEl() {
        return this.getChunksContainer().lastElementChild;
    }
    getChunksContainer() {
        return this.strategy.$chunksContainer;
    }
    calcChunk(chunk) {
        /**
         * Wow, this scroll is so fast
         * This case can be happen if chunk was already calculated and
         * now is removed in tree render
         */
        if (this.renderedChunkIds.has(chunk.id) === false) {
            return;
        }
        const $el = this.getChunkEl(chunk);
        const elHeight = Math.max($el.offsetHeight, $el.clientHeight, $el.scrollHeight);
        this.updateChunk(chunk, {
            calculated: true,
            height: elHeight,
        });
    }
    calcTree() {
        const headRenderedChunks = this.chunks.slice(0, this.headRenderedChunkIndex).filter(chunk => chunk.calculated);
        const tailRenderedChunks = this.chunks.slice(this.headRenderedChunkIndex + this.maxRenderedChunks).filter(chunk => chunk.calculated);
        const offsetTop = headRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);
        const offsetBottom = tailRenderedChunks.reduce((offset, chunk) => offset + chunk.height, 0);
        this.$target.style.paddingTop = `${offsetTop}px`;
        this.$target.style.paddingBottom = `${offsetBottom}px`;
    }
    setupStrategy() {
        this.strategy = this.options.strategy(this.$target);
        this.strategy.onMove(info => {
            if (this.lockMoveHandler) {
                return;
            }
            if (info.direction === interfaces_1.MoveDirection.TO_BOTTOM && info.remainingDistance < this.options.sensitivity[interfaces_1.MoveDirection.TO_BOTTOM]) {
                this.lockMoveHandler = true;
                const forwardChunks = this.chunks.slice(this.headRenderedChunkIndex + this.toRenderChunkIds.size);
                this.taskEmitter.emitReachBound({
                    moveInfo: info,
                    forwardChunks,
                });
            }
            else if (info.direction === interfaces_1.MoveDirection.TO_TOP && info.remainingDistance < this.options.sensitivity[interfaces_1.MoveDirection.TO_TOP]) {
                this.lockMoveHandler = true;
                const forwardChunks = this.chunks.slice(0, this.headRenderedChunkIndex);
                this.taskEmitter.emitReachBound({
                    moveInfo: info,
                    forwardChunks,
                });
            }
        });
    }
    convertItemsToChunks(items) {
        return items.map((item, index) => ({
            data: item.data,
            calculated: false,
            template: item.template,
            height: utils_1.isExists(item.height) ? item.height : 0,
            id: this.lastChunkId++,
        }));
    }
    updateChunk(chunk, partial) {
        const chunkIndex = this.getChunkIndex(chunk);
        if (chunkIndex === -1) {
            throw new Error('Invalid chunk index at updateChunk()');
        }
        const oldChunk = this.chunks[chunkIndex];
        this.chunks[chunkIndex] = Object.assign({}, oldChunk, partial, { id: oldChunk.id });
    }
    getChunkEl(chunk) {
        let $chunkEl;
        Array.from(this.getChunksContainer().children).forEach(($el) => {
            if ($el.dataset['chunk'] === chunk.id.toString()) {
                $chunkEl = $el;
            }
        });
        return $chunkEl;
    }
    getChunksByIds(chunkIds) {
        return [...chunkIds].map(chunkId => this.getChunkById(chunkId));
    }
    getChunkById(chunkId) {
        return this.chunks[this.getChunkIndex(chunkId)];
    }
    getChunkIndex(chunk) {
        if (typeof chunk === 'number') {
            return this.chunks.findIndex(currChunk => currChunk.id === chunk);
        }
        else {
            return this.chunks.findIndex(currChunk => currChunk.id === chunk.id);
        }
    }
}
exports.EasyListLib = EasyListLib;

},{"./task/interfaces":10,"./task/root-handler":11,"./utils":12}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(event, callback, once) {
        if (callback instanceof Function === false) {
            throw new Error('Event handler should be Function');
        }
        if (this.events[event]) {
            this.events[event].push({
                callback,
                once,
            });
        }
        else {
            this.events[event] = [{
                    callback,
                    once,
                }];
        }
    }
    once(event, callback) {
        this.on(event, callback, true);
    }
    off(event, callback) {
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
        }
        else {
            this.events[event] = [];
        }
    }
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach((eventItem, index) => {
                eventItem.callback.apply(eventItem.callback, args);
                if (eventItem.once) {
                    this.deleteEventCallback(event, index);
                }
            });
        }
    }
    deleteEventCallback(event, cbIndex) {
        this.events[event].splice(cbIndex, 1);
    }
}
exports.Eventer = new EventEmitter();

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PriorityEvents {
    constructor() {
        this.rootBus = document.createElement('div');
        this.bus = document.createElement('div');
        this.rootBus.appendChild(this.bus);
    }
    on(event, callback, options) {
        this.bus.addEventListener(event, callback, options);
    }
    onRoot(event, callback, options) {
        this.rootBus.addEventListener(event, callback, options);
    }
    once(event, callback) {
        this.on(event, callback, true);
    }
    onceRoot(event, callback) {
        this.onRoot(event, callback, true);
    }
    off(event, callback) {
        this.bus.removeEventListener(event, callback);
    }
    offRoot(event, callback) {
        this.rootBus.removeEventListener(event, callback);
    }
    emit(event) {
        this.bus.dispatchEvent(event);
    }
}
exports.PriorityEvents = PriorityEvents;

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventer_1 = require("../services/eventer");
const interfaces_1 = require("../task/interfaces");
const moveEvent = 'scroll-move';
class ScrollStrategy {
    constructor($scrollContainer, $target) {
        this.$scrollContainer = $scrollContainer;
        this.$target = $target;
        this.lastYCoord = 0;
        this.onScroll = () => {
            this.check();
        };
        $target.innerHTML = `<div></div>`;
        this.$chunksContainer = $target.firstElementChild;
        this.check();
        this.$scrollContainer.addEventListener('scroll', this.onScroll, {
            passive: true,
        });
    }
    destroy() {
        this.$scrollContainer.removeEventListener('scroll', this.onScroll);
    }
    onMove(callback) {
        eventer_1.Eventer.on(moveEvent, callback);
    }
    check() {
        const chunksBox = this.getChunksBox();
        const direction = this.getVerticalDirection();
        let remainingDistance;
        if (direction === interfaces_1.MoveDirection.TO_BOTTOM) {
            remainingDistance = chunksBox.bottom;
        }
        else if (direction === interfaces_1.MoveDirection.TO_TOP) {
            remainingDistance = chunksBox.top * -1;
        }
        else {
            throw new Error('Undefined direction');
        }
        const info = {
            direction,
            remainingDistance,
        };
        eventer_1.Eventer.emit(moveEvent, info);
    }
    getVerticalDirection() {
        let direction;
        let currentY;
        if (this.$scrollContainer instanceof Window) {
            currentY = window.pageYOffset || document.documentElement.scrollTop;
        }
        else {
            currentY = this.$scrollContainer.scrollTop;
        }
        if (currentY > this.lastYCoord) {
            direction = interfaces_1.MoveDirection.TO_BOTTOM;
        }
        else {
            direction = interfaces_1.MoveDirection.TO_TOP;
        }
        this.lastYCoord = currentY;
        return direction;
    }
    /**
     * Box where is placed chunks box and considering paddings of $target
     */
    getScrollBox() {
        const viewportBox = this.getViewportBox();
        const targetBox = this.$target.getBoundingClientRect();
        return {
            top: targetBox.top - viewportBox.top,
            right: targetBox.right,
            bottom: targetBox.bottom - viewportBox.bottom,
            left: targetBox.left - viewportBox.left,
            height: targetBox.height,
            width: targetBox.width,
        };
    }
    /**
     * Box with rendered chunks
     */
    getChunksBox() {
        const viewportBox = this.getViewportBox();
        const chunksBox = this.$chunksContainer.getBoundingClientRect();
        return {
            top: chunksBox.top - viewportBox.top,
            right: chunksBox.right,
            bottom: chunksBox.bottom - viewportBox.bottom,
            left: chunksBox.left - viewportBox.left,
            height: chunksBox.height,
            width: chunksBox.width,
        };
    }
    /**
     * Box of viewport
     */
    getViewportBox() {
        if (this.$scrollContainer instanceof Window) {
            return {
                top: 0,
                right: this.getWindowWidth(),
                bottom: this.getWindowHeight(),
                left: 0,
                height: this.getWindowHeight(),
                width: this.getWindowWidth(),
            };
        }
        else {
            return this.$scrollContainer.getBoundingClientRect();
        }
    }
    getWindowWidth() {
        return Math.min(document.body.clientWidth, document.documentElement.clientWidth);
    }
    getWindowHeight() {
        return Math.min(document.body.clientHeight, document.documentElement.clientHeight);
    }
}
function createScrollStrategy($scrollContainer = window) {
    if (typeof $scrollContainer === 'string') {
        $scrollContainer = document.querySelector($scrollContainer);
    }
    return $target => {
        return new ScrollStrategy($scrollContainer, $target);
    };
}
exports.createScrollStrategy = createScrollStrategy;

},{"../services/eventer":5,"../task/interfaces":10}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
class TaskChildHandler {
    constructor(priorityEvents) {
        this.priorityEvents = priorityEvents;
    }
    onReachBound(callback) {
        this.priorityEvents.on(interfaces_1.TaskType.REACH_BOUND, callback);
    }
    onRender(callback) {
        this.priorityEvents.on(interfaces_1.TaskType.RENDER, callback);
    }
    onMount(callback) {
        this.priorityEvents.on(interfaces_1.TaskType.MOUNT, callback);
    }
    onUnmount(callback) {
        this.priorityEvents.on(interfaces_1.TaskType.UNMOUNT, callback);
    }
}
exports.TaskChildHandler = TaskChildHandler;

},{"./interfaces":10}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
const eventer_1 = require("../services/eventer");
const utils_1 = require("../utils");
const root_handler_1 = require("./root-handler");
const supplyWaitUntil = (customEvent) => {
    const eventName = utils_1.randString(4);
    const resolve = () => {
        eventer_1.Eventer.emit(eventName);
        eventer_1.Eventer.off(eventName);
    };
    customEvent.__onResolve = callback => {
        eventer_1.Eventer.on(eventName, callback);
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
    };
    return customEvent;
};
class TaskEmitter {
    constructor(priorityEvents) {
        this.priorityEvents = priorityEvents;
        this.busyTasks = {
            [interfaces_1.TaskType.REACH_BOUND]: [],
            [interfaces_1.TaskType.RENDER]: [],
            [interfaces_1.TaskType.MOUNT]: [],
            [interfaces_1.TaskType.UNMOUNT]: [],
        };
    }
    emitReachBound(data) {
        return this.emitExtendableEvent(interfaces_1.TaskType.REACH_BOUND, data, data.moveInfo.direction);
    }
    emitRender(data) {
        return this.emitExtendableEvent(interfaces_1.TaskType.RENDER, data, data.chunk.id);
    }
    emitMount(data) {
        return this.emitExtendableEvent(interfaces_1.TaskType.MOUNT, data, data.chunk.id);
    }
    emitUnmount(data) {
        return this.emitExtendableEvent(interfaces_1.TaskType.UNMOUNT, data, data.chunk.id);
    }
    emitExtendableEvent(taskType, data, marker) {
        if (this.busyTasks[taskType].includes(marker)) {
            return;
        }
        const customEvent = new CustomEvent(taskType, {
            detail: data,
            bubbles: true,
        });
        const enhancedCustomEvent = supplyWaitUntil(customEvent);
        enhancedCustomEvent.__onResolve(() => {
            this.busyTasks[taskType].splice(this.busyTasks[taskType].indexOf(marker), 1);
        });
        this.busyTasks[taskType].push(marker);
        return new Promise(resolve => {
            this.priorityEvents.onceRoot(taskType, (event) => {
                if (event === enhancedCustomEvent) {
                    root_handler_1.handleExtendableEvent(resolve)(event);
                }
            });
            this.priorityEvents.emit(enhancedCustomEvent);
        });
    }
}
exports.TaskEmitter = TaskEmitter;

},{"../services/eventer":5,"../utils":12,"./interfaces":10,"./root-handler":11}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MoveDirection;
(function (MoveDirection) {
    MoveDirection["TO_TOP"] = "to_top";
    MoveDirection["TO_BOTTOM"] = "to_bottom";
})(MoveDirection = exports.MoveDirection || (exports.MoveDirection = {}));
var TaskType;
(function (TaskType) {
    TaskType["MOUNT"] = "mount";
    TaskType["UNMOUNT"] = "unmount";
    TaskType["RENDER"] = "render";
    TaskType["REACH_BOUND"] = "reach-bound";
})(TaskType = exports.TaskType || (exports.TaskType = {}));
;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
const utils_1 = require("../utils");
exports.handleExtendableEvent = (callback) => {
    return (event) => {
        event.__onResolve(() => {
            callback(event);
        });
        if (utils_1.isExists(event.__isPending) === false) {
            event.__resolve();
        }
    };
};
class TaskRootHandler {
    constructor(priorityEvents) {
        this.priorityEvents = priorityEvents;
    }
    onRootReachBound(callback) {
        this.priorityEvents.onRoot(interfaces_1.TaskType.REACH_BOUND, exports.handleExtendableEvent(callback));
    }
    onRootRender(callback) {
        this.priorityEvents.onRoot(interfaces_1.TaskType.RENDER, exports.handleExtendableEvent(callback));
    }
    onRootMount(callback) {
        this.priorityEvents.onRoot(interfaces_1.TaskType.MOUNT, exports.handleExtendableEvent(callback));
    }
    onRootUnmount(callback) {
        this.priorityEvents.onRoot(interfaces_1.TaskType.UNMOUNT, exports.handleExtendableEvent(callback));
    }
}
exports.TaskRootHandler = TaskRootHandler;

},{"../utils":12,"./interfaces":10}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isExists(value) {
    return value !== undefined && value !== null;
}
exports.isExists = isExists;
function randString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.randString = randString;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL3dpbmRvd19zY3JvbGwvaW5kZXgudHMiLCJpbmRleC50cyIsInNyYy9hcGkudHMiLCJzcmMvbGliLnRzIiwic3JjL3NlcnZpY2VzL2V2ZW50ZXIudHMiLCJzcmMvc2VydmljZXMvcHJpb3JpdHktZXZlbnRzLnRzIiwic3JjL3N0cmF0ZWd5L3Njcm9sbC50cyIsInNyYy90YXNrL2NoaWxkLWhhbmRsZXIudHMiLCJzcmMvdGFzay9lbWl0dGVyLnRzIiwic3JjL3Rhc2svaW50ZXJmYWNlcy50cyIsInNyYy90YXNrL3Jvb3QtaGFuZGxlci50cyIsInNyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsdUNBQXVDO0FBRXZDLE1BQU0sV0FBVyxHQUFHLDRDQUE0QyxDQUFDO0FBQ2pFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUVYLE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQVEsRUFBRSxDQUFDO0FBQ2hDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFdkIsT0FBTyxFQUFFLENBQUM7QUFDVixRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQzVCLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ3ZCLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDcEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFD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LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJpbXBvcnQgeyBFYXN5TGlzdCB9IGZyb20gJy4uLy4uL2luZGV4JztcblxuY29uc3QgcmFuZFBpY3R1cmUgPSAnaHR0cHM6Ly9zb3VyY2UudW5zcGxhc2guY29tL3JhbmRvbS84MDB4NjAwJztcbmxldCBpZCA9IDA7XG5cbmNvbnN0IGVhc3lMaXN0ID0gbmV3IEVhc3lMaXN0KCk7XG5lYXN5TGlzdC5iaW5kKCcjZmVlZCcpO1xuXG5hZGRJdGVtKCk7XG5lYXN5TGlzdC5vblJlYWNoQm91bmQoZXZlbnQgPT4ge1xuICBhZGRJdGVtKCk7XG59KTtcblxuZWFzeUxpc3Qub25Nb3VudChldmVudCA9PiB7XG4gIGV2ZW50LndhaXRVbnRpbChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICBjb25zdCBpbWdFbCA9IGV2ZW50LmRldGFpbC4kZWwucXVlcnlTZWxlY3RvcignaW1nJyk7XG5cbiAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIGltYWdlLnNyYyA9IGltZ0VsLmdldEF0dHJpYnV0ZSgnc3JjJyk7XG4gICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH07XG4gIH0pKTtcbn0pO1xuXG5mdW5jdGlvbiBhZGRJdGVtKCkge1xuICBjb25zdCBpdGVtID0gZ2V0SXRlbSgpO1xuXG4gIGVhc3lMaXN0LmFwcGVuZEl0ZW1zKFt7XG4gICAgdGVtcGxhdGU6IGdldEl0ZW1UZW1wbGF0ZShpdGVtKSxcbiAgICBkYXRhOiBpdGVtXG4gIH1dKTtcbn1cblxuZnVuY3Rpb24gZ2V0SXRlbSgpIHtcbiAgY29uc3QgbmV3SWQgPSBpZCsrO1xuXG4gIHJldHVybiB7XG4gICAgaW1hZ2U6IGAke3JhbmRQaWN0dXJlfT9zaWc9JHtuZXdJZH1gLFxuICAgIGlkOiBuZXdJZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0SXRlbVRlbXBsYXRlKGl0ZW0pIHtcbiAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgIDxoMT5QaWN0dXJlICR7aXRlbS5pZH08L2gxPlxuICAgIDxpbWcgc3JjPVwiJHtpdGVtLmltYWdlfVwiIC8+XG4gIDwvZGl2PmA7XG59XG4iLCJleHBvcnQgKiBmcm9tICcuL3NyYy9hcGknO1xuIiwiaW1wb3J0IHsgRWFzeUxpc3RMaWIsIFJhd0l0ZW0sIEVhc3lMaXN0T3B0aW9ucywgREVGQVVMVF9PUFRJT05TIH0gZnJvbSAnLi9saWInO1xuaW1wb3J0IHsgUHJpb3JpdHlFdmVudHMgfSBmcm9tICcuL3NlcnZpY2VzL3ByaW9yaXR5LWV2ZW50cyc7XG5pbXBvcnQgeyBUYXNrRW1pdHRlciB9IGZyb20gJy4vdGFzay9lbWl0dGVyJztcbmltcG9ydCB7IFRhc2tDaGlsZEhhbmRsZXIgfSBmcm9tICcuL3Rhc2svY2hpbGQtaGFuZGxlcic7XG5pbXBvcnQge1xuICBFeHRlbmRhYmxlRXZlbnQsXG4gIFRhc2tSZW5kZXJEYXRhLFxuICBUYXNrTW91bnREYXRhLFxuICBUYXNrUmVhY2hCb3VuZERhdGEsXG4gIFRhc2tVbm1vdW50RGF0YSxcbiAgTW92ZURpcmVjdGlvbixcbn0gZnJvbSAnLi90YXNrL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY3JlYXRlU2Nyb2xsU3RyYXRlZ3kgfSBmcm9tICcuL3N0cmF0ZWd5L3Njcm9sbCc7XG5pbXBvcnQgeyBpc0V4aXN0cyB9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgRWFzeUxpc3Qge1xuICBwcml2YXRlIGVhc3lMaXN0OiBFYXN5TGlzdExpYjtcbiAgcHJpdmF0ZSB0YXNrQ2hpbGRIYW5kbGVyOiBUYXNrQ2hpbGRIYW5kbGVyO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEVhc3lMaXN0T3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcHJpb3JpdHlFdmVudHMgPSBuZXcgUHJpb3JpdHlFdmVudHMoKTtcbiAgICBjb25zdCB0YXNrRW1pdHRlciA9IG5ldyBUYXNrRW1pdHRlcihwcmlvcml0eUV2ZW50cyk7XG5cbiAgICB0aGlzLmVhc3lMaXN0ID0gbmV3IEVhc3lMaXN0TGliKHRoaXMubm9ybWFsaXplT3B0aW9ucyhvcHRpb25zKSwgcHJpb3JpdHlFdmVudHMsIHRhc2tFbWl0dGVyKTtcbiAgICB0aGlzLnRhc2tDaGlsZEhhbmRsZXIgPSBuZXcgVGFza0NoaWxkSGFuZGxlcihwcmlvcml0eUV2ZW50cyk7XG4gIH1cblxuICBiaW5kKCR0YXJnZXQ6IEVsZW1lbnQgfCBIVE1MRWxlbWVudCB8IHN0cmluZykge1xuICAgIGlmICh0eXBlb2YgJHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICR0YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCR0YXJnZXQpIGFzIEhUTUxFbGVtZW50O1xuICAgIH1cblxuICAgIHRoaXMuZWFzeUxpc3QuYmluZCgkdGFyZ2V0IGFzIEhUTUxFbGVtZW50KTtcbiAgfVxuXG4gIGFwcGVuZEl0ZW1zKGl0ZW1zOiBSYXdJdGVtW10pOiB2b2lkIHtcbiAgICB0aGlzLmVhc3lMaXN0LmFwcGVuZEl0ZW1zKGl0ZW1zKTtcbiAgfVxuXG4gIHByZXBlbmRJdGVtcyhpdGVtczogUmF3SXRlbVtdKTogdm9pZCB7XG4gICAgdGhpcy5lYXN5TGlzdC5wcmVwZW5kSXRlbXMoaXRlbXMpO1xuICB9XG5cbiAgb25SZWFjaEJvdW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrUmVhY2hCb3VuZERhdGE+KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy50YXNrQ2hpbGRIYW5kbGVyLm9uUmVhY2hCb3VuZChjYWxsYmFjayk7XG4gIH1cblxuICBvblJlbmRlcihjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza1JlbmRlckRhdGE+KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy50YXNrQ2hpbGRIYW5kbGVyLm9uUmVuZGVyKGNhbGxiYWNrKTtcbiAgfVxuXG4gIG9uTW91bnQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tNb3VudERhdGE+KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy50YXNrQ2hpbGRIYW5kbGVyLm9uTW91bnQoY2FsbGJhY2spO1xuICB9XG5cbiAgb25Vbm1vdW50KGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrVW5tb3VudERhdGE+KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy50YXNrQ2hpbGRIYW5kbGVyLm9uVW5tb3VudChjYWxsYmFjayk7XG4gIH1cblxuICBwcml2YXRlIG5vcm1hbGl6ZU9wdGlvbnMob3B0aW9uczogRWFzeUxpc3RPcHRpb25zKTogRWFzeUxpc3RPcHRpb25zIHtcbiAgICBpZiAoIW9wdGlvbnMuc3RyYXRlZ3kpIHtcbiAgICAgIG9wdGlvbnMuc3RyYXRlZ3kgPSBjcmVhdGVTY3JvbGxTdHJhdGVneSgpO1xuICAgIH1cblxuICAgIGNvbnN0IHRocm93SW52YWxpZE51bWJlciA9IG5hbWUgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7bmFtZX0gdmFsdWU6IGl0IHNob3VsZCBiZSBhIGludGVnZXIgbnVtYmVyYCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2hlY2tTZW5zaXRpdml0eSA9IGRpcmVjdGlvbiA9PiB7XG4gICAgICBpZiAoaXNFeGlzdHMob3B0aW9ucy5zZW5zaXRpdml0eVtkaXJlY3Rpb25dKSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgTnVtYmVyLmlzU2FmZUludGVnZXIob3B0aW9ucy5zZW5zaXRpdml0eVtkaXJlY3Rpb25dKSA9PT0gZmFsc2VcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhyb3dJbnZhbGlkTnVtYmVyKGBzZW5zaXRpdml0eSAke2RpcmVjdGlvbn1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9ucy5zZW5zaXRpdml0eVtkaXJlY3Rpb25dID0gREVGQVVMVF9PUFRJT05TLnNlbnNpdGl2aXR5W2RpcmVjdGlvbl07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzRXhpc3RzKG9wdGlvbnMubWF4SXRlbXMpKSB7XG4gICAgICBpZiAoTnVtYmVyLmlzU2FmZUludGVnZXIob3B0aW9ucy5tYXhJdGVtcykgPT09IGZhbHNlKSB7XG4gICAgICAgIHRocm93SW52YWxpZE51bWJlcignbWF4SXRlbXMnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucy5tYXhJdGVtcyA9IERFRkFVTFRfT1BUSU9OUy5tYXhJdGVtcztcbiAgICB9XG5cbiAgICBpZiAoaXNFeGlzdHMob3B0aW9ucy5zZW5zaXRpdml0eSkpIHtcbiAgICAgIGNoZWNrU2Vuc2l0aXZpdHkoTW92ZURpcmVjdGlvbi5UT19UT1ApO1xuICAgICAgY2hlY2tTZW5zaXRpdml0eShNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMuc2Vuc2l0aXZpdHkgPSBERUZBVUxUX09QVElPTlMuc2Vuc2l0aXZpdHk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG4gIH1cbn1cbiIsImltcG9ydCB7IFByaW9yaXR5RXZlbnRzIH0gZnJvbSAnLi9zZXJ2aWNlcy9wcmlvcml0eS1ldmVudHMnO1xuaW1wb3J0IHsgaXNFeGlzdHMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IE1vdmVEaXJlY3Rpb24gfSBmcm9tICcuL3Rhc2svaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBUYXNrRW1pdHRlciB9IGZyb20gJy4vdGFzay9lbWl0dGVyJztcbmltcG9ydCB7IFRhc2tSb290SGFuZGxlciB9IGZyb20gJy4vdGFzay9yb290LWhhbmRsZXInO1xuaW1wb3J0IHsgU3RyYXRlZ3ksIFN0cmF0ZWd5RmFjdG9yeSB9IGZyb20gJ3N0cmF0ZWd5L2ludGVyZmFjZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVhc3lMaXN0T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTdHJhdGVneSBpcyB1c2VkIHRvIGRldGVjdCwgdGhhdCBzY3JvbGwgYm91bmQgaXMgdG91Y2hlZCBjaHVua3MgYm94LlxuICAgKlxuICAgKiBCeSBkZWZhdWx0IGlzIGBTY3JvbGxTdHJhdGVneWAuXG4gICAqL1xuICBzdHJhdGVneT86IFN0cmF0ZWd5RmFjdG9yeTtcblxuICAvKipcbiAgICogSWYgZW5hYmxlZCwgYWZ0ZXIgYWRkaW5nIG5ldyBjaHVua3MgYWRkIHNwYWNlIGFzIHBsYWNlaG9sZGVyIGFmdGVyL2JlZm9yZVxuICAgKiByZW5kZXJlZCBjaHVua3MuIElmIGNodW5rIGhlaWdodCBpcyBub3QgZGVmaW5lZCwgbW91bnQgaGltIGFzIHBsYWNlaG9sZGVyXG4gICAqIHRvIGRldGVjdCBoZWlnaHQgb2YgaGltIGVsZW1lbnQgYW5kIGluY3JlYXNlIHBsYWNlaG9kbGVyIHNwYWNlLlxuICAgKlxuICAgKiBFbWl0dGluZyBgb25Nb3VudC9vblVubW91bnRgIGV2ZW50IHdpdGggYGlzU2hhZG93UGxhY2Vob2xkZXI6IHRydWVgIG9wdGlvbi5cbiAgICovXG4gIHVzZVNoYWRvd1BsYWNlaG9sZGVyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWF4IGFtb3VudCBvZiBpdGVtcyBpbiBsaXN0LlxuICAgKlxuICAgKiBCeSBkZWZhdWx0IGlzIDUgaXRlbXMuXG4gICAqL1xuICBtYXhJdGVtcz86IG51bWJlcjtcblxuICAvKipcbiAgICogQW1vdW50IG9mIHBpeGVscyBiZXR3ZWVuIGVkZ2UgaXRlbSBhbmQgY3VycmVudCBzY3JvbGwgcG9zaXRpb24uXG4gICAqIEl0IHNob3VsZCBiZSBsZXNzIHRoYW4gaXRlbSBoZWlnaHQuXG4gICAqXG4gICAqIEJ5IGRlZmF1bHQgaXMgMzAwcHguXG4gICAqL1xuICBzZW5zaXRpdml0eT86IHtcbiAgICBbTW92ZURpcmVjdGlvbi5UT19CT1RUT01dPzogbnVtYmVyO1xuICAgIFtNb3ZlRGlyZWN0aW9uLlRPX1RPUF0/OiBudW1iZXI7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmF3SXRlbSB7XG4gIHRlbXBsYXRlOiBzdHJpbmc7XG4gIGhlaWdodD86IG51bWJlcjtcbiAgZGF0YT86IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaHVuayBleHRlbmRzIFJhd0l0ZW0ge1xuICBjYWxjdWxhdGVkOiBib29sZWFuO1xuICBpZDogbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSAkQ2h1bmtFbCA9IEhUTUxEaXZFbGVtZW50O1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9PUFRJT05TOiBFYXN5TGlzdE9wdGlvbnMgPSB7XG4gIG1heEl0ZW1zOiA1LFxuICBzZW5zaXRpdml0eToge1xuICAgIFtNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTV06IDMwMCxcbiAgICBbTW92ZURpcmVjdGlvbi5UT19UT1BdOiAzMDAsXG4gIH1cbn07XG5cbmV4cG9ydCBjbGFzcyBFYXN5TGlzdExpYiBleHRlbmRzIFRhc2tSb290SGFuZGxlciB7XG4gIHByaXZhdGUgc3RyYXRlZ3k6IFN0cmF0ZWd5O1xuICBwcml2YXRlICR0YXJnZXQ6IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIGxvY2tNb3ZlSGFuZGxlciA9IGZhbHNlO1xuXG4gIHByaXZhdGUgbWF4UmVuZGVyZWRDaHVua3MgPSBERUZBVUxUX09QVElPTlMubWF4SXRlbXM7XG4gIHByaXZhdGUgbGFzdENodW5rSWQgPSAwO1xuXG4gIHByaXZhdGUgY2h1bmtzOiBDaHVua1tdID0gW107XG4gIHByaXZhdGUgdG9SZW5kZXJDaHVua0lkczogU2V0PG51bWJlcj4gPSBuZXcgU2V0KCk7XG4gIHByaXZhdGUgcmVuZGVyZWRDaHVua0lkczogU2V0PG51bWJlcj4gPSBuZXcgU2V0KCk7XG4gIHByaXZhdGUgcnVubmluZ1NoYWRvd1BsYWNlaG9sZGVySWRzOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKTtcbiAgcHJpdmF0ZSBoZWFkUmVuZGVyZWRDaHVua0luZGV4OiBudW1iZXIgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgb3B0aW9uczogRWFzeUxpc3RPcHRpb25zLFxuICAgIHByaW9yaXR5RXZlbnRzOiBQcmlvcml0eUV2ZW50cyxcbiAgICBwcml2YXRlIHRhc2tFbWl0dGVyOiBUYXNrRW1pdHRlcixcbiAgKSB7XG4gICAgc3VwZXIocHJpb3JpdHlFdmVudHMpO1xuXG4gICAgdGhpcy5tYXhSZW5kZXJlZENodW5rcyA9IHRoaXMub3B0aW9ucy5tYXhJdGVtcztcblxuICAgIHRoaXMub25Sb290UmVhY2hCb3VuZChldmVudCA9PiB7XG4gICAgICB0aGlzLmxvY2tNb3ZlSGFuZGxlciA9IGZhbHNlO1xuXG4gICAgICAvKipcbiAgICAgICAqIElmIGRpcmVjdGlvbiB0byB0b3AsIHJlbWFpbmluZyBkaXN0YW5jZSBjYW4gYmUgbmVnYXRpdmUgdmFsdWVcbiAgICAgICAqIGlmIHNjcm9sbCBpcyBvdmVyIG9mIHRvcCBjaHVua3MgYm94O1xuICAgICAgICpcbiAgICAgICAqIElmIGRpcmVjdGlvbiB0byBib3R0b20sIHJlbWFpbmluZyBkaXN0YW5jZSBjYW4gYmUgbmVnYXRpdmUgdmFsdWVcbiAgICAgICAqIGlmIHNjcm9sbCBpcyBvdmVyIG9mIGJvdHRvbSBjaHVua3MgYm94O1xuICAgICAgICovXG5cbiAgICAgIGxldCByZW1haW5IZWlnaHQgPSBNYXRoLmFicyhldmVudC5kZXRhaWwubW92ZUluZm8ucmVtYWluaW5nRGlzdGFuY2UpO1xuXG4gICAgICBpZiAoZXZlbnQuZGV0YWlsLm1vdmVJbmZvLmRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19CT1RUT00pIHtcbiAgICAgICAgaWYgKGV2ZW50LmRldGFpbC5mb3J3YXJkQ2h1bmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCByZWR1Y2VEZWx0YSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RSZW5kZXJlZEluZGV4ID0gdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4ICsgdGhpcy5tYXhSZW5kZXJlZENodW5rcztcblxuICAgICAgICAgICAgaWYgKGxhc3RSZW5kZXJlZEluZGV4ID49IHRoaXMuY2h1bmtzLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleCsrO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5jaHVua3NbbGFzdFJlbmRlcmVkSW5kZXhdLmNhbGN1bGF0ZWQpIHtcbiAgICAgICAgICAgICAgcmVtYWluSGVpZ2h0IC09IHRoaXMuY2h1bmtzW2xhc3RSZW5kZXJlZEluZGV4XS5oZWlnaHQ7XG5cbiAgICAgICAgICAgICAgaWYgKHJlbWFpbkhlaWdodCA+IDApIHtcbiAgICAgICAgICAgICAgICByZWR1Y2VEZWx0YSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlZHVjZURlbHRhKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50LmRldGFpbC5tb3ZlSW5mby5kaXJlY3Rpb24gPT09IE1vdmVEaXJlY3Rpb24uVE9fVE9QKSB7XG4gICAgICAgIGlmIChldmVudC5kZXRhaWwuZm9yd2FyZENodW5rcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgcmVkdWNlRGVsdGEgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4IDw9IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXgtLTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY2h1bmtzW3RoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleF0uY2FsY3VsYXRlZCkge1xuICAgICAgICAgICAgICByZW1haW5IZWlnaHQgLT0gdGhpcy5jaHVua3NbdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4XS5oZWlnaHQ7XG5cbiAgICAgICAgICAgICAgaWYgKHJlbWFpbkhlaWdodCA+IDApIHtcbiAgICAgICAgICAgICAgICByZWR1Y2VEZWx0YSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlZHVjZURlbHRhKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5yZW5kZXJUcmVlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLm9uUm9vdFJlbmRlcihldmVudCA9PiB7XG4gICAgICB0aGlzLnJlbmRlckNodW5rKGV2ZW50LmRldGFpbC5jaHVuayk7XG4gICAgfSk7XG5cbiAgICB0aGlzLm9uUm9vdE1vdW50KGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IHsgY2h1bmsgfSA9IGV2ZW50LmRldGFpbDtcblxuICAgICAgdGhpcy5jYWxjQ2h1bmsoY2h1bmspO1xuXG4gICAgICAvLyBJZiB0aGlzIGNodW5rIGlzIG5vdCBuZWVkIHRvIGJlIGluIGxpc3QgYW55bW9yZSwgZGVzdHJveSBpdFxuICAgICAgaWYgKHRoaXMudG9SZW5kZXJDaHVua0lkcy5oYXMoY2h1bmsuaWQpID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnRyeVRvRGVzdHJveUNodW5rKGNodW5rLmlkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMub25Sb290VW5tb3VudChldmVudCA9PiB7XG4gICAgICBjb25zdCB7IGNodW5rIH0gPSBldmVudC5kZXRhaWw7XG5cbiAgICAgIHRoaXMucmVtb3ZlQ2h1bmsoY2h1bmspO1xuICAgIH0pO1xuICB9XG5cbiAgYmluZCgkdGFyZ2V0OiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIHRoaXMuJHRhcmdldCA9ICR0YXJnZXQ7XG5cbiAgICB0aGlzLnNldHVwU3RyYXRlZ3koKTtcbiAgfVxuXG4gIGFwcGVuZEl0ZW1zKGl0ZW1zOiBSYXdJdGVtW10pOiB2b2lkIHtcbiAgICBjb25zdCBjaHVua3MgPSB0aGlzLmNvbnZlcnRJdGVtc1RvQ2h1bmtzKGl0ZW1zKTtcblxuICAgIHRoaXMuY2h1bmtzLnB1c2goLi4uY2h1bmtzKTtcbiAgICB0aGlzLnJlbmRlclRyZWUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudXNlU2hhZG93UGxhY2Vob2xkZXIpIHtcbiAgICAgIHRoaXMucmVuZGVyU2hhZG93UGxhY2Vob2xkZXJUcmVlKE1vdmVEaXJlY3Rpb24uVE9fQk9UVE9NKTtcbiAgICB9XG4gIH1cblxuICBwcmVwZW5kSXRlbXMoaXRlbXM6IFJhd0l0ZW1bXSk6IHZvaWQge1xuICAgIGNvbnN0IGNodW5rcyA9IHRoaXMuY29udmVydEl0ZW1zVG9DaHVua3MoaXRlbXMpO1xuXG4gICAgdGhpcy5jaHVua3MudW5zaGlmdCguLi5jaHVua3MpO1xuICAgIHRoaXMucmVuZGVyVHJlZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VTaGFkb3dQbGFjZWhvbGRlcikge1xuICAgICAgdGhpcy5yZW5kZXJTaGFkb3dQbGFjZWhvbGRlclRyZWUoTW92ZURpcmVjdGlvbi5UT19UT1ApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVHJlZSgpOiB2b2lkIHtcbiAgICBjb25zdCBuZXdUb1JlbmRlckNodW5rcyA9IHRoaXMuY2h1bmtzLnNsaWNlKHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleCwgdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4ICsgdGhpcy5tYXhSZW5kZXJlZENodW5rcyk7XG4gICAgY29uc3Qga2VlcENodW5rczogbnVtYmVyW10gPSBbXTtcblxuICAgIGNvbnN0IHdhaXREZXN0cm95ID0gW107XG5cbiAgICAvLyBHZXQgb2xkIGNodW5rcywgdGhhdCBuZWVkIHRvIGtlZXAgaW4gdHJlZVxuICAgIG5ld1RvUmVuZGVyQ2h1bmtzLmZvckVhY2goY2h1bmsgPT4ge1xuICAgICAgaWYgKHRoaXMudG9SZW5kZXJDaHVua0lkcy5oYXMoY2h1bmsuaWQpID09PSB0cnVlKSB7XG4gICAgICAgIGtlZXBDaHVua3MucHVzaChjaHVuay5pZCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdTaGFkb3dQbGFjZWhvbGRlcklkcy5oYXMoY2h1bmsuaWQpKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiB0aGlzIGNodW5rIG5lZWQgdG8ga2VlcCBpbiB0cmVlIGFuZCBpdCBleGlzdHMgaW4gdHJlZSBhcyBzaGFkb3cgcGxhY2Vob2xkZXIsXG4gICAgICAgICAqIHdlIG5lZWQgdG8gZGVzdHJveSBpdCwgYW5kIG1vdW50IGNodW5rIGFnYWluIHdpdGhvdXQgYGlzU2hhZG93UGxhY2Vob2xkZXJgIHByb3BlcnR5XG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBkZXN0cm95ZWRDaHVuayA9IHRoaXMuZGVzdHJveUNodW5rKHRoaXMuZ2V0Q2h1bmtCeUlkKGNodW5rLmlkKSkudGhlbihldmVudCA9PiB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjaHVuay5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHdhaXREZXN0cm95LnB1c2goZGVzdHJveWVkQ2h1bmspO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgUHJvbWlzZS5hbGwod2FpdERlc3Ryb3kpLnRoZW4oZGVzdHJveWVkSWRzID0+IHtcbiAgICAgIC8vIERlc3Ryb3kgY2h1bmtzIHRoYXQgbm90IG5lZWRlZCBub3dcbiAgICAgIFsuLi50aGlzLnJlbmRlcmVkQ2h1bmtJZHNdLmZvckVhY2goY2h1bmtJZCA9PiB7XG4gICAgICAgIGlmIChrZWVwQ2h1bmtzLmluY2x1ZGVzKGNodW5rSWQpID09PSBmYWxzZSkge1xuICAgICAgICAgIHRoaXMudHJ5VG9EZXN0cm95Q2h1bmsoY2h1bmtJZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRvUmVuZGVyQ2h1bmtJZHMgPSBuZXcgU2V0KFsuLi5uZXdUb1JlbmRlckNodW5rcy5tYXAoY2h1bmsgPT4gY2h1bmsuaWQpLCAuLi5kZXN0cm95ZWRJZHNdKTtcblxuICAgICAgLy8gUmVuZGVyIG5ldyBjaHVua3NcbiAgICAgIHRoaXMudG9SZW5kZXJDaHVua0lkcy5mb3JFYWNoKGNodW5rSWQgPT4ge1xuICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuZ2V0Q2h1bmtCeUlkKGNodW5rSWQpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGF0IGNhc2UgaXMgcG9zc2libGUgaWYgdGhlIG1vdW50IG9mIHRoZSBjaHVuayBYIHdhcyBjb21wbGV0ZWQgYWZ0ZXJcbiAgICAgICAgICogdGhlIGNodW5rIFggYXBwZWFyZWQgaW4gdGhlIGxpc3QgZm9yIHRoZSAybmQgdGltZVxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKHRoaXMucmVuZGVyZWRDaHVua0lkcy5oYXMoY2h1bmsuaWQpID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGtlZXBDaHVua3MuaW5jbHVkZXMoY2h1bmsuaWQpID09PSBmYWxzZSkge1xuICAgICAgICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdFJlbmRlcih7XG4gICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgIGlzU2hhZG93UGxhY2Vob2xkZXI6IGZhbHNlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU2hhZG93UGxhY2Vob2xkZXJUcmVlKGRpcmVjdGlvbjogTW92ZURpcmVjdGlvbik6IHZvaWQge1xuICAgIGxldCBzaGFkb3dQbGFjZWhvbGRlckNodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19CT1RUT00pIHtcbiAgICAgIHNoYWRvd1BsYWNlaG9sZGVyQ2h1bmtzID0gdGhpcy5jaHVua3Muc2xpY2UodGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4ICsgdGhpcy5tYXhSZW5kZXJlZENodW5rcyk7XG4gICAgfVxuXG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19UT1ApIHtcbiAgICAgIHNoYWRvd1BsYWNlaG9sZGVyQ2h1bmtzID0gdGhpcy5jaHVua3Muc2xpY2UoMCwgdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4KTtcbiAgICB9XG5cbiAgICBzaGFkb3dQbGFjZWhvbGRlckNodW5rcy5mb3JFYWNoKGNodW5rID0+IHtcbiAgICAgIGlmIChpc0V4aXN0cyhjaHVuay5oZWlnaHQpICYmIGNodW5rLmhlaWdodCA+IDApIHtcbiAgICAgICAgdGhpcy51cGRhdGVDaHVuayhjaHVuaywge1xuICAgICAgICAgIGNhbGN1bGF0ZWQ6IHRydWUsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nU2hhZG93UGxhY2Vob2xkZXJJZHMuYWRkKGNodW5rLmlkKTtcblxuICAgICAgICB0aGlzLnRhc2tFbWl0dGVyLmVtaXRSZW5kZXIoe1xuICAgICAgICAgIGNodW5rLFxuICAgICAgICAgIGlzU2hhZG93UGxhY2Vob2xkZXI6IHRydWUsXG4gICAgICAgIH0pLnRoZW4oZXZlbnQgPT4ge1xuICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgY29uc3QgJGNodW5rRWwgPSB0aGlzLmRyYXdDaHVuayhjaHVuayk7XG5cbiAgICAgICAgICB0aGlzLnJlbmRlcmVkQ2h1bmtJZHMuYWRkKGNodW5rLmlkKTtcblxuICAgICAgICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdE1vdW50KHtcbiAgICAgICAgICAgICRlbDogJGNodW5rRWwsXG4gICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgIHJlbmRlcmVkQ2h1bmtzOiB0aGlzLmdldENodW5rc0J5SWRzKHRoaXMucmVuZGVyZWRDaHVua0lkcyksXG4gICAgICAgICAgICBpc1NoYWRvd1BsYWNlaG9sZGVyOiB0cnVlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2h1bmsoY2h1bms6IENodW5rKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudG9SZW5kZXJDaHVua0lkcy5oYXMoY2h1bmsuaWQpID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0ICRjaHVua0VsID0gdGhpcy5kcmF3Q2h1bmsoY2h1bmspO1xuXG4gICAgdGhpcy5yZW5kZXJlZENodW5rSWRzLmFkZChjaHVuay5pZCk7XG5cbiAgICB0aGlzLnRhc2tFbWl0dGVyLmVtaXRNb3VudCh7XG4gICAgICAkZWw6ICRjaHVua0VsLFxuICAgICAgY2h1bmssXG4gICAgICByZW5kZXJlZENodW5rczogdGhpcy5nZXRDaHVua3NCeUlkcyh0aGlzLnJlbmRlcmVkQ2h1bmtJZHMpLFxuICAgICAgaXNTaGFkb3dQbGFjZWhvbGRlcjogZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGRyYXdDaHVuayhjaHVuazogQ2h1bmspOiAkQ2h1bmtFbCB7XG4gICAgY29uc3QgJGNodW5rRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAkY2h1bmtFbC5kYXRhc2V0WydjaHVuayddID0gY2h1bmsuaWQudG9TdHJpbmcoKTtcbiAgICAkY2h1bmtFbC5pbm5lckhUTUwgPSBjaHVuay50ZW1wbGF0ZTtcblxuICAgIHRoaXMuaW5zZXJ0Q2h1bmtFbChjaHVuaywgJGNodW5rRWwpO1xuXG4gICAgcmV0dXJuICRjaHVua0VsO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnNlcnRDaHVua0VsKGNodW5rOiBDaHVuaywgJGNodW5rRWw6ICRDaHVua0VsKTogdm9pZCB7XG4gICAgbGV0IGNodW5rSW5kZXggPSB0aGlzLmdldENodW5rSW5kZXgoY2h1bmsuaWQpO1xuXG4gICAgaWYgKGNodW5rSW5kZXggPT09IDApIHtcbiAgICAgIHRoaXMuZ2V0Q2h1bmtzQ29udGFpbmVyKCkucHJlcGVuZCgkY2h1bmtFbCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJlbmRlcmVkQ2h1bmtJZHMuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhpcy5nZXRDaHVua3NDb250YWluZXIoKS5hcHBlbmRDaGlsZCgkY2h1bmtFbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCAkcHJldkNodW5rID0gdGhpcy5nZXRUYWlsQ2h1bmtFbCgpO1xuICAgICAgbGV0ICR0YXJnZXRDaHVua0VsOiAkQ2h1bmtFbDtcblxuICAgICAgd2hpbGUoJHByZXZDaHVuaykge1xuICAgICAgICBjb25zdCByZW5kZXJlZENodW5rSWQgPSArJHByZXZDaHVuay5kYXRhc2V0WydjaHVuayddO1xuXG4gICAgICAgIC8vIENoZWNrIGluZGV4IG9mIGZ1dHVyZSByZW5kZXIgY2h1bmsgYmV0d2VlbiBjaHVua3MsIHdoaWNoIHdlcmUgYWxyZWFkeSByZW5kZXJlZFxuICAgICAgICBjb25zdCByZW5kZXJlZENodW5rSW5kZXggPSB0aGlzLmdldENodW5rSW5kZXgocmVuZGVyZWRDaHVua0lkKTtcbiAgICAgICAgY2h1bmtJbmRleCA9IHRoaXMuZ2V0Q2h1bmtJbmRleChjaHVuay5pZCk7XG5cbiAgICAgICAgaWYgKGNodW5rSW5kZXggPiByZW5kZXJlZENodW5rSW5kZXgpIHtcbiAgICAgICAgICAkdGFyZ2V0Q2h1bmtFbCA9ICRwcmV2Q2h1bms7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNFeGlzdHMoJHByZXZDaHVuay5wcmV2aW91c0VsZW1lbnRTaWJsaW5nKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgICRwcmV2Q2h1bmsgPSAkcHJldkNodW5rLnByZXZpb3VzRWxlbWVudFNpYmxpbmcgYXMgJENodW5rRWw7XG4gICAgICB9XG5cbiAgICAgIGlmICgkdGFyZ2V0Q2h1bmtFbCkge1xuICAgICAgICAkdGFyZ2V0Q2h1bmtFbC5hZnRlcigkY2h1bmtFbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkcHJldkNodW5rLmJlZm9yZSgkY2h1bmtFbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB0cnlUb0Rlc3Ryb3lDaHVuayhjaHVua0lkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBjaHVuayA9IHRoaXMuZ2V0Q2h1bmtCeUlkKGNodW5rSWQpO1xuXG4gICAgaWYgKGNodW5rLmNhbGN1bGF0ZWQpIHtcbiAgICAgIHRoaXMuZGVzdHJveUNodW5rKGNodW5rKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBldmVudCB0byB1bm1vdW50IGNodW5rXG4gICAqIFdpdGggdGhpcyBldmVudCBjbGllbnQgY2FuIHJlbW92ZSBsaXN0ZW5lcnMgZnJvbSBlbGVtZW50cyBhbmQgZXRjLlxuICAgKi9cbiAgcHJpdmF0ZSBkZXN0cm95Q2h1bmsoY2h1bms6IENodW5rKSB7XG4gICAgY29uc3QgJGNodW5rRWwgPSB0aGlzLmdldENodW5rRWwoY2h1bmspO1xuXG4gICAgaWYgKCRjaHVua0VsKSB7XG4gICAgICByZXR1cm4gdGhpcy50YXNrRW1pdHRlci5lbWl0VW5tb3VudCh7XG4gICAgICAgICRlbDogJGNodW5rRWwsXG4gICAgICAgIGNodW5rLFxuICAgICAgICByZW5kZXJlZENodW5rczogdGhpcy5nZXRDaHVua3NCeUlkcyh0aGlzLnJlbmRlcmVkQ2h1bmtJZHMpLFxuICAgICAgICBpc1NoYWRvd1BsYWNlaG9sZGVyOiB0aGlzLnJ1bm5pbmdTaGFkb3dQbGFjZWhvbGRlcklkcy5oYXMoY2h1bmsuaWQpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBjaHVuayBmcm9tIHRoZSBET01cbiAgICovXG4gIHByaXZhdGUgcmVtb3ZlQ2h1bmsoY2h1bms6IENodW5rKTogdm9pZCB7XG4gICAgY29uc3QgJGNodW5rRWwgPSB0aGlzLmdldENodW5rRWwoY2h1bmspO1xuXG4gICAgaWYgKCRjaHVua0VsKSB7XG4gICAgICAkY2h1bmtFbC5yZW1vdmUoKTtcblxuICAgICAgdGhpcy5ydW5uaW5nU2hhZG93UGxhY2Vob2xkZXJJZHMuZGVsZXRlKGNodW5rLmlkKTtcbiAgICAgIHRoaXMucmVuZGVyZWRDaHVua0lkcy5kZWxldGUoY2h1bmsuaWQpO1xuICAgICAgdGhpcy5jYWxjVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGFpbENodW5rRWwoKTogJENodW5rRWwge1xuICAgIHJldHVybiB0aGlzLmdldENodW5rc0NvbnRhaW5lcigpLmxhc3RFbGVtZW50Q2hpbGQgYXMgJENodW5rRWw7XG4gIH1cblxuICBwcml2YXRlIGdldENodW5rc0NvbnRhaW5lcigpOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuc3RyYXRlZ3kuJGNodW5rc0NvbnRhaW5lcjtcbiAgfVxuXG4gIHByaXZhdGUgY2FsY0NodW5rKGNodW5rOiBDaHVuayk6IHZvaWQge1xuICAgIC8qKlxuICAgICAqIFdvdywgdGhpcyBzY3JvbGwgaXMgc28gZmFzdFxuICAgICAqIFRoaXMgY2FzZSBjYW4gYmUgaGFwcGVuIGlmIGNodW5rIHdhcyBhbHJlYWR5IGNhbGN1bGF0ZWQgYW5kXG4gICAgICogbm93IGlzIHJlbW92ZWQgaW4gdHJlZSByZW5kZXJcbiAgICAgKi9cbiAgICBpZiAodGhpcy5yZW5kZXJlZENodW5rSWRzLmhhcyhjaHVuay5pZCkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgJGVsID0gdGhpcy5nZXRDaHVua0VsKGNodW5rKTtcblxuICAgIGNvbnN0IGVsSGVpZ2h0ID0gTWF0aC5tYXgoXG4gICAgICAkZWwub2Zmc2V0SGVpZ2h0LCAkZWwuY2xpZW50SGVpZ2h0LCAkZWwuc2Nyb2xsSGVpZ2h0XG4gICAgKTtcblxuICAgIHRoaXMudXBkYXRlQ2h1bmsoY2h1bmssIHtcbiAgICAgIGNhbGN1bGF0ZWQ6IHRydWUsXG4gICAgICBoZWlnaHQ6IGVsSGVpZ2h0LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjYWxjVHJlZSgpOiB2b2lkIHtcbiAgICBjb25zdCBoZWFkUmVuZGVyZWRDaHVua3MgPSB0aGlzLmNodW5rcy5zbGljZSgwLCB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXgpLmZpbHRlcihjaHVuayA9PiBjaHVuay5jYWxjdWxhdGVkKTtcbiAgICBjb25zdCB0YWlsUmVuZGVyZWRDaHVua3MgPSB0aGlzLmNodW5rcy5zbGljZSh0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXggKyB0aGlzLm1heFJlbmRlcmVkQ2h1bmtzKS5maWx0ZXIoY2h1bmsgPT4gY2h1bmsuY2FsY3VsYXRlZCk7XG5cbiAgICBjb25zdCBvZmZzZXRUb3AgPSBoZWFkUmVuZGVyZWRDaHVua3MucmVkdWNlKChvZmZzZXQsIGNodW5rKSA9PiBvZmZzZXQgKyBjaHVuay5oZWlnaHQsIDApO1xuICAgIGNvbnN0IG9mZnNldEJvdHRvbSA9IHRhaWxSZW5kZXJlZENodW5rcy5yZWR1Y2UoKG9mZnNldCwgY2h1bmspID0+IG9mZnNldCArIGNodW5rLmhlaWdodCwgMCk7XG5cbiAgICB0aGlzLiR0YXJnZXQuc3R5bGUucGFkZGluZ1RvcCA9IGAke29mZnNldFRvcH1weGA7XG4gICAgdGhpcy4kdGFyZ2V0LnN0eWxlLnBhZGRpbmdCb3R0b20gPSBgJHtvZmZzZXRCb3R0b219cHhgO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cFN0cmF0ZWd5KCk6IHZvaWQge1xuICAgIHRoaXMuc3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMuc3RyYXRlZ3kodGhpcy4kdGFyZ2V0KTtcblxuICAgIHRoaXMuc3RyYXRlZ3kub25Nb3ZlKGluZm8gPT4ge1xuICAgICAgaWYgKHRoaXMubG9ja01vdmVIYW5kbGVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGluZm8uZGlyZWN0aW9uID09PSBNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTSAmJiBpbmZvLnJlbWFpbmluZ0Rpc3RhbmNlIDwgdGhpcy5vcHRpb25zLnNlbnNpdGl2aXR5W01vdmVEaXJlY3Rpb24uVE9fQk9UVE9NXSkge1xuICAgICAgICB0aGlzLmxvY2tNb3ZlSGFuZGxlciA9IHRydWU7XG5cbiAgICAgICAgY29uc3QgZm9yd2FyZENodW5rcyA9IHRoaXMuY2h1bmtzLnNsaWNlKHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleCArIHRoaXMudG9SZW5kZXJDaHVua0lkcy5zaXplKTtcblxuICAgICAgICB0aGlzLnRhc2tFbWl0dGVyLmVtaXRSZWFjaEJvdW5kKHtcbiAgICAgICAgICBtb3ZlSW5mbzogaW5mbyxcbiAgICAgICAgICBmb3J3YXJkQ2h1bmtzLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoaW5mby5kaXJlY3Rpb24gPT09IE1vdmVEaXJlY3Rpb24uVE9fVE9QICYmIGluZm8ucmVtYWluaW5nRGlzdGFuY2UgPCB0aGlzLm9wdGlvbnMuc2Vuc2l0aXZpdHlbTW92ZURpcmVjdGlvbi5UT19UT1BdKSB7XG4gICAgICAgIHRoaXMubG9ja01vdmVIYW5kbGVyID0gdHJ1ZTtcblxuICAgICAgICBjb25zdCBmb3J3YXJkQ2h1bmtzID0gdGhpcy5jaHVua3Muc2xpY2UoMCwgdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4KTtcblxuICAgICAgICB0aGlzLnRhc2tFbWl0dGVyLmVtaXRSZWFjaEJvdW5kKHtcbiAgICAgICAgICBtb3ZlSW5mbzogaW5mbyxcbiAgICAgICAgICBmb3J3YXJkQ2h1bmtzLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydEl0ZW1zVG9DaHVua3MoaXRlbXM6IFJhd0l0ZW1bXSk6IENodW5rW10ge1xuICAgIHJldHVybiBpdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiAoe1xuICAgICAgZGF0YTogaXRlbS5kYXRhLFxuICAgICAgY2FsY3VsYXRlZDogZmFsc2UsXG4gICAgICB0ZW1wbGF0ZTogaXRlbS50ZW1wbGF0ZSxcbiAgICAgIGhlaWdodDogaXNFeGlzdHMoaXRlbS5oZWlnaHQpID8gaXRlbS5oZWlnaHQgOiAwLFxuICAgICAgaWQ6IHRoaXMubGFzdENodW5rSWQrKyxcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUNodW5rKGNodW5rOiBDaHVuaywgcGFydGlhbDogUGFydGlhbDxDaHVuaz4pOiB2b2lkIHtcbiAgICBjb25zdCBjaHVua0luZGV4ID0gdGhpcy5nZXRDaHVua0luZGV4KGNodW5rKTtcblxuICAgIGlmIChjaHVua0luZGV4ID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNodW5rIGluZGV4IGF0IHVwZGF0ZUNodW5rKCknKTtcbiAgICB9XG5cbiAgICBjb25zdCBvbGRDaHVuayA9IHRoaXMuY2h1bmtzW2NodW5rSW5kZXhdO1xuXG4gICAgdGhpcy5jaHVua3NbY2h1bmtJbmRleF0gPSB7XG4gICAgICAuLi5vbGRDaHVuayxcbiAgICAgIC4uLnBhcnRpYWwsXG4gICAgICBpZDogb2xkQ2h1bmsuaWQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2h1bmtFbChjaHVuazogQ2h1bmspOiAkQ2h1bmtFbCB7XG4gICAgbGV0ICRjaHVua0VsOiAkQ2h1bmtFbDtcblxuICAgIEFycmF5LmZyb20odGhpcy5nZXRDaHVua3NDb250YWluZXIoKS5jaGlsZHJlbikuZm9yRWFjaCgoJGVsOiAkQ2h1bmtFbCkgPT4ge1xuICAgICAgaWYgKCRlbC5kYXRhc2V0WydjaHVuayddID09PSBjaHVuay5pZC50b1N0cmluZygpKSB7XG4gICAgICAgICRjaHVua0VsID0gJGVsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuICRjaHVua0VsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDaHVua3NCeUlkcyhjaHVua0lkczogU2V0PG51bWJlcj4pOiBDaHVua1tdIHtcbiAgICByZXR1cm4gWy4uLmNodW5rSWRzXS5tYXAoY2h1bmtJZCA9PiB0aGlzLmdldENodW5rQnlJZChjaHVua0lkKSk7XG4gIH1cblxuICBwcml2YXRlIGdldENodW5rQnlJZChjaHVua0lkOiBudW1iZXIpOiBDaHVuayB7XG4gICAgcmV0dXJuIHRoaXMuY2h1bmtzW3RoaXMuZ2V0Q2h1bmtJbmRleChjaHVua0lkKV07XG4gIH1cblxuICBwcml2YXRlIGdldENodW5rSW5kZXgoY2h1bms6IENodW5rIHwgbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAodHlwZW9mIGNodW5rID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHRoaXMuY2h1bmtzLmZpbmRJbmRleChjdXJyQ2h1bmsgPT4gY3VyckNodW5rLmlkID09PSBjaHVuayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmNodW5rcy5maW5kSW5kZXgoY3VyckNodW5rID0+IGN1cnJDaHVuay5pZCA9PT0gY2h1bmsuaWQpO1xuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IHR5cGUgQ2FsbGJhY2tGbiA9ICguLi5hcmdzKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgRXZlbnRJdGVtID0ge1xuICBjYWxsYmFjazogQ2FsbGJhY2tGbjtcbiAgb25jZT86IGJvb2xlYW47XG59O1xuXG5leHBvcnQgdHlwZSBFdmVudHMgPSB7XG4gIFtldmVudDogc3RyaW5nXTogRXZlbnRJdGVtW107XG59XG5cbmNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIHByaXZhdGUgZXZlbnRzOiBFdmVudHMgPSB7fTtcblxuICBvbihldmVudDogc3RyaW5nLCBjYWxsYmFjazogQ2FsbGJhY2tGbiwgb25jZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbiA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRXZlbnQgaGFuZGxlciBzaG91bGQgYmUgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnRdKSB7XG4gICAgICB0aGlzLmV2ZW50c1tldmVudF0ucHVzaCh7XG4gICAgICAgIGNhbGxiYWNrLFxuICAgICAgICBvbmNlLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XSA9IFt7XG4gICAgICAgIGNhbGxiYWNrLFxuICAgICAgICBvbmNlLFxuICAgICAgfV07XG4gICAgfVxuICB9XG5cbiAgb25jZShldmVudDogc3RyaW5nLCBjYWxsYmFjazogQ2FsbGJhY2tGbik6IHZvaWQge1xuICAgIHRoaXMub24oZXZlbnQsIGNhbGxiYWNrLCB0cnVlKTtcbiAgfVxuXG4gIG9mZihldmVudDogc3RyaW5nLCBjYWxsYmFjaz86IENhbGxiYWNrRm4pOiB2b2lkIHtcbiAgICBpZiAoY2FsbGJhY2sgJiYgY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbiA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSWYgeW91IHByb3ZpZGUgaGFuZGxlciwgaXQgc2hvdWxkIGJlIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIXRoaXMuZXZlbnRzW2V2ZW50XSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XS5mb3JFYWNoKChldmVudEl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgIGlmIChldmVudEl0ZW0uY2FsbGJhY2sgPT09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5kZWxldGVFdmVudENhbGxiYWNrKGV2ZW50LCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmV2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG4gIH1cblxuICBlbWl0KGV2ZW50OiBzdHJpbmcsIC4uLmFyZ3MpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnRdKSB7XG4gICAgICB0aGlzLmV2ZW50c1tldmVudF0uZm9yRWFjaCgoZXZlbnRJdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICBldmVudEl0ZW0uY2FsbGJhY2suYXBwbHkoZXZlbnRJdGVtLmNhbGxiYWNrLCBhcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRJdGVtLm9uY2UpIHtcbiAgICAgICAgICB0aGlzLmRlbGV0ZUV2ZW50Q2FsbGJhY2soZXZlbnQsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWxldGVFdmVudENhbGxiYWNrKGV2ZW50OiBzdHJpbmcsIGNiSW5kZXg6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuZXZlbnRzW2V2ZW50XS5zcGxpY2UoY2JJbmRleCwgMSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IEV2ZW50ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4iLCJleHBvcnQgY2xhc3MgUHJpb3JpdHlFdmVudHMge1xuICBwcml2YXRlIHJvb3RCdXM6IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIGJ1czogSFRNTEVsZW1lbnQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5yb290QnVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5idXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLnJvb3RCdXMuYXBwZW5kQ2hpbGQodGhpcy5idXMpO1xuICB9XG5cbiAgb24oZXZlbnQ6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkIHtcbiAgICB0aGlzLmJ1cy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gIH1cblxuICBvblJvb3QoZXZlbnQ6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RCdXMuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICB9XG5cbiAgb25jZShldmVudDogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCk6IHZvaWQge1xuICAgIHRoaXMub24oZXZlbnQsIGNhbGxiYWNrLCB0cnVlKTtcbiAgfVxuXG4gIG9uY2VSb290KGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5vblJvb3QoZXZlbnQsIGNhbGxiYWNrLCB0cnVlKTtcbiAgfVxuXG4gIG9mZihldmVudDogc3RyaW5nLCBjYWxsYmFjaz86IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLmJ1cy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjayk7XG4gIH1cblxuICBvZmZSb290KGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrPzogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCk6IHZvaWQge1xuICAgIHRoaXMucm9vdEJ1cy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjayk7XG4gIH1cblxuICBlbWl0KGV2ZW50OiBDdXN0b21FdmVudCk6IHZvaWQge1xuICAgIHRoaXMuYnVzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBTdHJhdGVneSwgU3RyYXRlZ3lGYWN0b3J5LCBTdHJhdGVneU1vdmVJbmZvIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV2ZW50ZXIgfSBmcm9tICcuLi9zZXJ2aWNlcy9ldmVudGVyJztcbmltcG9ydCB7IE1vdmVEaXJlY3Rpb24gfSBmcm9tICcuLi90YXNrL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgdHlwZSBCb3VuZGluZ0JveCA9IENsaWVudFJlY3QgfCBET01SZWN0O1xuXG5jb25zdCBtb3ZlRXZlbnQgPSAnc2Nyb2xsLW1vdmUnO1xuXG5jbGFzcyBTY3JvbGxTdHJhdGVneSBpbXBsZW1lbnRzIFN0cmF0ZWd5IHtcbiAgJGNodW5rc0NvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XG5cbiAgcHJpdmF0ZSBsYXN0WUNvb3JkID0gMDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlICRzY3JvbGxDb250YWluZXI6IEhUTUxFbGVtZW50IHwgV2luZG93LFxuICAgIHByaXZhdGUgJHRhcmdldDogSFRNTEVsZW1lbnRcbiAgKSB7XG4gICAgJHRhcmdldC5pbm5lckhUTUwgPSBgPGRpdj48L2Rpdj5gO1xuXG4gICAgdGhpcy4kY2h1bmtzQ29udGFpbmVyID0gJHRhcmdldC5maXJzdEVsZW1lbnRDaGlsZCBhcyBIVE1MRWxlbWVudDtcblxuICAgIHRoaXMuY2hlY2soKTtcblxuICAgIHRoaXMuJHNjcm9sbENvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsLCB7XG4gICAgICBwYXNzaXZlOiB0cnVlLFxuICAgIH0pO1xuICB9XG5cbiAgZGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLiRzY3JvbGxDb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG4gIH1cblxuICBvbk1vdmUoY2FsbGJhY2s6IChpbmZvOiBTdHJhdGVneU1vdmVJbmZvKSA9PiB2b2lkKSB7XG4gICAgRXZlbnRlci5vbihtb3ZlRXZlbnQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHByaXZhdGUgb25TY3JvbGwgPSAoKSA9PiB7XG4gICAgdGhpcy5jaGVjaygpO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVjaygpOiB2b2lkIHtcbiAgICBjb25zdCBjaHVua3NCb3ggPSB0aGlzLmdldENodW5rc0JveCgpO1xuICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRoaXMuZ2V0VmVydGljYWxEaXJlY3Rpb24oKTtcbiAgICBsZXQgcmVtYWluaW5nRGlzdGFuY2U6IG51bWJlcjtcblxuICAgIGlmIChkaXJlY3Rpb24gPT09IE1vdmVEaXJlY3Rpb24uVE9fQk9UVE9NKSB7XG4gICAgICByZW1haW5pbmdEaXN0YW5jZSA9IGNodW5rc0JveC5ib3R0b207XG4gICAgfSBlbHNlIGlmIChkaXJlY3Rpb24gPT09IE1vdmVEaXJlY3Rpb24uVE9fVE9QKSB7XG4gICAgICByZW1haW5pbmdEaXN0YW5jZSA9IGNodW5rc0JveC50b3AgKiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmRlZmluZWQgZGlyZWN0aW9uJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW5mbzogU3RyYXRlZ3lNb3ZlSW5mbyA9IHtcbiAgICAgIGRpcmVjdGlvbixcbiAgICAgIHJlbWFpbmluZ0Rpc3RhbmNlLFxuICAgIH07XG5cbiAgICBFdmVudGVyLmVtaXQobW92ZUV2ZW50LCBpbmZvKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VmVydGljYWxEaXJlY3Rpb24oKTogTW92ZURpcmVjdGlvbiB7XG4gICAgbGV0IGRpcmVjdGlvbjogTW92ZURpcmVjdGlvbjtcbiAgICBsZXQgY3VycmVudFk6IG51bWJlcjtcblxuICAgIGlmICh0aGlzLiRzY3JvbGxDb250YWluZXIgaW5zdGFuY2VvZiBXaW5kb3cpIHtcbiAgICAgIGN1cnJlbnRZID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnRZID0gdGhpcy4kc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcDtcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudFkgPiB0aGlzLmxhc3RZQ29vcmQpIHtcbiAgICAgIGRpcmVjdGlvbiA9IE1vdmVEaXJlY3Rpb24uVE9fQk9UVE9NO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXJlY3Rpb24gPSBNb3ZlRGlyZWN0aW9uLlRPX1RPUDtcbiAgICB9XG5cbiAgICB0aGlzLmxhc3RZQ29vcmQgPSBjdXJyZW50WTtcblxuICAgIHJldHVybiBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQm94IHdoZXJlIGlzIHBsYWNlZCBjaHVua3MgYm94IGFuZCBjb25zaWRlcmluZyBwYWRkaW5ncyBvZiAkdGFyZ2V0XG4gICAqL1xuICBwcml2YXRlIGdldFNjcm9sbEJveCgpOiBCb3VuZGluZ0JveCB7XG4gICAgY29uc3Qgdmlld3BvcnRCb3ggPSB0aGlzLmdldFZpZXdwb3J0Qm94KCk7XG4gICAgY29uc3QgdGFyZ2V0Qm94ID0gdGhpcy4kdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogdGFyZ2V0Qm94LnRvcCAtIHZpZXdwb3J0Qm94LnRvcCxcbiAgICAgIHJpZ2h0OiB0YXJnZXRCb3gucmlnaHQsXG4gICAgICBib3R0b206IHRhcmdldEJveC5ib3R0b20gLSB2aWV3cG9ydEJveC5ib3R0b20sXG4gICAgICBsZWZ0OiB0YXJnZXRCb3gubGVmdCAtIHZpZXdwb3J0Qm94LmxlZnQsXG4gICAgICBoZWlnaHQ6IHRhcmdldEJveC5oZWlnaHQsXG4gICAgICB3aWR0aDogdGFyZ2V0Qm94LndpZHRoLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQm94IHdpdGggcmVuZGVyZWQgY2h1bmtzXG4gICAqL1xuICBwcml2YXRlIGdldENodW5rc0JveCgpOiBCb3VuZGluZ0JveCB7XG4gICAgY29uc3Qgdmlld3BvcnRCb3ggPSB0aGlzLmdldFZpZXdwb3J0Qm94KCk7XG4gICAgY29uc3QgY2h1bmtzQm94ID0gdGhpcy4kY2h1bmtzQ29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogY2h1bmtzQm94LnRvcCAtIHZpZXdwb3J0Qm94LnRvcCxcbiAgICAgIHJpZ2h0OiBjaHVua3NCb3gucmlnaHQsXG4gICAgICBib3R0b206IGNodW5rc0JveC5ib3R0b20gLSB2aWV3cG9ydEJveC5ib3R0b20sXG4gICAgICBsZWZ0OiBjaHVua3NCb3gubGVmdCAtIHZpZXdwb3J0Qm94LmxlZnQsXG4gICAgICBoZWlnaHQ6IGNodW5rc0JveC5oZWlnaHQsXG4gICAgICB3aWR0aDogY2h1bmtzQm94LndpZHRoLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQm94IG9mIHZpZXdwb3J0XG4gICAqL1xuICBwcml2YXRlIGdldFZpZXdwb3J0Qm94KCk6IEJvdW5kaW5nQm94IHtcbiAgICBpZiAodGhpcy4kc2Nyb2xsQ29udGFpbmVyIGluc3RhbmNlb2YgV2luZG93KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IDAsXG4gICAgICAgIHJpZ2h0OiB0aGlzLmdldFdpbmRvd1dpZHRoKCksXG4gICAgICAgIGJvdHRvbTogdGhpcy5nZXRXaW5kb3dIZWlnaHQoKSxcbiAgICAgICAgbGVmdDogMCxcbiAgICAgICAgaGVpZ2h0OiB0aGlzLmdldFdpbmRvd0hlaWdodCgpLFxuICAgICAgICB3aWR0aDogdGhpcy5nZXRXaW5kb3dXaWR0aCgpLFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy4kc2Nyb2xsQ29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0V2luZG93V2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5taW4oXG4gICAgICBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoLCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGhcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRXaW5kb3dIZWlnaHQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5taW4oXG4gICAgICBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNjcm9sbFN0cmF0ZWd5KCRzY3JvbGxDb250YWluZXI6IHN0cmluZyB8IEhUTUxFbGVtZW50IHwgV2luZG93ID0gd2luZG93KTogU3RyYXRlZ3lGYWN0b3J5IHtcbiAgaWYgKHR5cGVvZiAkc2Nyb2xsQ29udGFpbmVyID09PSAnc3RyaW5nJykge1xuICAgICRzY3JvbGxDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCRzY3JvbGxDb250YWluZXIpIGFzIEhUTUxFbGVtZW50O1xuICB9XG5cbiAgcmV0dXJuICR0YXJnZXQgPT4ge1xuICAgIHJldHVybiBuZXcgU2Nyb2xsU3RyYXRlZ3koJHNjcm9sbENvbnRhaW5lciBhcyBIVE1MRWxlbWVudCB8IFdpbmRvdywgJHRhcmdldCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IFByaW9yaXR5RXZlbnRzIH0gZnJvbSAnLi4vc2VydmljZXMvcHJpb3JpdHktZXZlbnRzJztcbmltcG9ydCB7XG4gIEV4dGVuZGFibGVFdmVudCxcbiAgVGFza1JlYWNoQm91bmREYXRhLFxuICBUYXNrVHlwZSxcbiAgVGFza1JlbmRlckRhdGEsXG4gIFRhc2tNb3VudERhdGEsXG4gIFRhc2tVbm1vdW50RGF0YSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIFRhc2tDaGlsZEhhbmRsZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHByaW9yaXR5RXZlbnRzOiBQcmlvcml0eUV2ZW50cyxcbiAgKSB7fVxuXG4gIG9uUmVhY2hCb3VuZChjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza1JlYWNoQm91bmREYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub24oVGFza1R5cGUuUkVBQ0hfQk9VTkQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIG9uUmVuZGVyKGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrUmVuZGVyRGF0YT4pID0+IHZvaWQpIHtcbiAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uKFRhc2tUeXBlLlJFTkRFUiwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25Nb3VudChjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza01vdW50RGF0YT4pID0+IHZvaWQpIHtcbiAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uKFRhc2tUeXBlLk1PVU5ULCBjYWxsYmFjayk7XG4gIH1cblxuICBvblVubW91bnQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tVbm1vdW50RGF0YT4pID0+IHZvaWQpIHtcbiAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uKFRhc2tUeXBlLlVOTU9VTlQsIGNhbGxiYWNrKTtcbiAgfVxufVxuXG4iLCJpbXBvcnQge1xuICBFeHRlbmRhYmxlRXZlbnQsXG4gIFRhc2tNb3VudERhdGEsXG4gIFRhc2tSZWFjaEJvdW5kRGF0YSxcbiAgVGFza1JlbmRlckRhdGEsXG4gIFRhc2tUeXBlLFxuICBUYXNrVW5tb3VudERhdGEsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBQcmlvcml0eUV2ZW50cyB9IGZyb20gJy4uL3NlcnZpY2VzL3ByaW9yaXR5LWV2ZW50cyc7XG5pbXBvcnQgeyBFdmVudGVyIH0gZnJvbSAnLi4vc2VydmljZXMvZXZlbnRlcic7XG5pbXBvcnQgeyByYW5kU3RyaW5nIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgaGFuZGxlRXh0ZW5kYWJsZUV2ZW50IH0gZnJvbSAnLi9yb290LWhhbmRsZXInO1xuXG5jb25zdCBzdXBwbHlXYWl0VW50aWwgPSA8VD4oY3VzdG9tRXZlbnQpOiBFeHRlbmRhYmxlRXZlbnQ8VD4gPT4ge1xuICBjb25zdCBldmVudE5hbWUgPSByYW5kU3RyaW5nKDQpO1xuXG4gIGNvbnN0IHJlc29sdmUgPSAoKSA9PiB7XG4gICAgRXZlbnRlci5lbWl0KGV2ZW50TmFtZSk7XG4gICAgRXZlbnRlci5vZmYoZXZlbnROYW1lKTtcbiAgfTtcblxuICBjdXN0b21FdmVudC5fX29uUmVzb2x2ZSA9IGNhbGxiYWNrID0+IHtcbiAgICBFdmVudGVyLm9uKGV2ZW50TmFtZSwgY2FsbGJhY2spXG4gIH07XG5cbiAgY3VzdG9tRXZlbnQuX19yZXNvbHZlID0gcmVzb2x2ZTtcblxuICBjdXN0b21FdmVudC53YWl0VW50aWwgPSBwcm9taXNlID0+IHtcbiAgICBjdXN0b21FdmVudC5fX2lzUGVuZGluZyA9IHRydWU7XG5cbiAgICBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgY3VzdG9tRXZlbnQuX19pc1BlbmRpbmcgPSBmYWxzZTtcblxuICAgICAgaWYgKGN1c3RvbUV2ZW50Ll9fY2FuY2VsZWQgIT09IHRydWUpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IG9yaWdpbmFsU0lQID0gY3VzdG9tRXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uO1xuXG4gIGN1c3RvbUV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiA9ICgpID0+IHtcbiAgICBjdXN0b21FdmVudC5fX2NhbmNlbGVkID0gdHJ1ZTtcbiAgICBvcmlnaW5hbFNJUC5jYWxsKGN1c3RvbUV2ZW50KTtcbiAgfVxuXG4gIHJldHVybiBjdXN0b21FdmVudDtcbn1cblxuZXhwb3J0IHR5cGUgQnVzeVRhc2tzID0ge1xuICBbdGFza1R5cGUgaW4gVGFza1R5cGVdOiBhbnlbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFRhc2tFbWl0dGVyIHtcbiAgcHJpdmF0ZSBidXN5VGFza3M6IEJ1c3lUYXNrcyA9IHtcbiAgICBbVGFza1R5cGUuUkVBQ0hfQk9VTkRdOiBbXSxcbiAgICBbVGFza1R5cGUuUkVOREVSXTogW10sXG4gICAgW1Rhc2tUeXBlLk1PVU5UXTogW10sXG4gICAgW1Rhc2tUeXBlLlVOTU9VTlRdOiBbXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHByaW9yaXR5RXZlbnRzOiBQcmlvcml0eUV2ZW50cyxcbiAgKSB7fVxuXG4gIGVtaXRSZWFjaEJvdW5kKGRhdGE6IFRhc2tSZWFjaEJvdW5kRGF0YSk6IFByb21pc2U8RXh0ZW5kYWJsZUV2ZW50PFRhc2tSZWFjaEJvdW5kRGF0YT4+IHtcbiAgICByZXR1cm4gdGhpcy5lbWl0RXh0ZW5kYWJsZUV2ZW50PFRhc2tSZWFjaEJvdW5kRGF0YT4oVGFza1R5cGUuUkVBQ0hfQk9VTkQsIGRhdGEsIGRhdGEubW92ZUluZm8uZGlyZWN0aW9uKTtcbiAgfVxuXG4gIGVtaXRSZW5kZXIoZGF0YTogVGFza1JlbmRlckRhdGEpOiBQcm9taXNlPEV4dGVuZGFibGVFdmVudDxUYXNrUmVuZGVyRGF0YT4+IHtcbiAgICByZXR1cm4gdGhpcy5lbWl0RXh0ZW5kYWJsZUV2ZW50PFRhc2tSZW5kZXJEYXRhPihUYXNrVHlwZS5SRU5ERVIsIGRhdGEsIGRhdGEuY2h1bmsuaWQpO1xuICB9XG5cbiAgZW1pdE1vdW50KGRhdGE6IFRhc2tNb3VudERhdGEpOiBQcm9taXNlPEV4dGVuZGFibGVFdmVudDxUYXNrTW91bnREYXRhPj4ge1xuICAgIHJldHVybiB0aGlzLmVtaXRFeHRlbmRhYmxlRXZlbnQ8VGFza01vdW50RGF0YT4oVGFza1R5cGUuTU9VTlQsIGRhdGEsIGRhdGEuY2h1bmsuaWQpO1xuICB9XG5cbiAgZW1pdFVubW91bnQoZGF0YTogVGFza1VubW91bnREYXRhKTogUHJvbWlzZTxFeHRlbmRhYmxlRXZlbnQ8VGFza1VubW91bnREYXRhPj4ge1xuICAgIHJldHVybiB0aGlzLmVtaXRFeHRlbmRhYmxlRXZlbnQ8VGFza1VubW91bnREYXRhPihUYXNrVHlwZS5VTk1PVU5ULCBkYXRhLCBkYXRhLmNodW5rLmlkKTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdEV4dGVuZGFibGVFdmVudDxUPih0YXNrVHlwZTogVGFza1R5cGUsIGRhdGE6IFQsIG1hcmtlcik6IFByb21pc2U8RXh0ZW5kYWJsZUV2ZW50PFQ+PiB7XG4gICAgaWYgKHRoaXMuYnVzeVRhc2tzW3Rhc2tUeXBlXS5pbmNsdWRlcyhtYXJrZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3VzdG9tRXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQ8VD4odGFza1R5cGUsIHtcbiAgICAgIGRldGFpbDogZGF0YSxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBlbmhhbmNlZEN1c3RvbUV2ZW50ID0gc3VwcGx5V2FpdFVudGlsPFQ+KGN1c3RvbUV2ZW50KTtcblxuICAgIGVuaGFuY2VkQ3VzdG9tRXZlbnQuX19vblJlc29sdmUoKCkgPT4ge1xuICAgICAgdGhpcy5idXN5VGFza3NbdGFza1R5cGVdLnNwbGljZSh0aGlzLmJ1c3lUYXNrc1t0YXNrVHlwZV0uaW5kZXhPZihtYXJrZXIpLCAxKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYnVzeVRhc2tzW3Rhc2tUeXBlXS5wdXNoKG1hcmtlcik7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uY2VSb290KHRhc2tUeXBlLCAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUPikgPT4ge1xuICAgICAgICBpZiAoZXZlbnQgPT09IGVuaGFuY2VkQ3VzdG9tRXZlbnQpIHtcbiAgICAgICAgICBoYW5kbGVFeHRlbmRhYmxlRXZlbnQ8VD4ocmVzb2x2ZSkoZXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5wcmlvcml0eUV2ZW50cy5lbWl0KGVuaGFuY2VkQ3VzdG9tRXZlbnQpO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBDaHVuaywgJENodW5rRWwgfSBmcm9tICcuLi9saWInO1xuaW1wb3J0IHsgU3RyYXRlZ3lNb3ZlSW5mbyB9IGZyb20gJy4uL3N0cmF0ZWd5L2ludGVyZmFjZXMnO1xuXG5leHBvcnQgdHlwZSBFeHRlbmRhYmxlRXZlbnQ8VD4gPSBDdXN0b21FdmVudDxUPiAmIHtcbiAgcmVhZG9ubHkgd2FpdFVudGlsOiAocHJvbWlzZTogUHJvbWlzZTxhbnk+KSA9PiB2b2lkO1xuICByZWFkb25seSBfX29uUmVzb2x2ZTogKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSA9PiB2b2lkO1xuICByZWFkb25seSBfX3Jlc29sdmU6ICgpID0+IHZvaWQ7XG4gIF9faXNQZW5kaW5nOiBib29sZWFuO1xuICBfX2NhbmNlbGVkOiBib29sZWFuO1xufTtcblxuZXhwb3J0IGVudW0gTW92ZURpcmVjdGlvbiB7XG4gIFRPX1RPUCA9ICd0b190b3AnLFxuICBUT19CT1RUT00gPSAndG9fYm90dG9tJyxcbn1cblxuZXhwb3J0IGVudW0gVGFza1R5cGUge1xuICBNT1VOVCA9ICdtb3VudCcsXG4gIFVOTU9VTlQgPSAndW5tb3VudCcsXG4gIFJFTkRFUiA9ICdyZW5kZXInLFxuICBSRUFDSF9CT1VORCA9ICdyZWFjaC1ib3VuZCcsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFza0RhdGEge1xuICByZWFkb25seSBjaHVuazogQ2h1bms7XG4gIHJlYWRvbmx5IHJlbmRlcmVkQ2h1bmtzOiBDaHVua1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tSZWFjaEJvdW5kRGF0YSB7XG4gIHJlYWRvbmx5IGZvcndhcmRDaHVua3M6IENodW5rW107XG4gIHJlYWRvbmx5IG1vdmVJbmZvOiBTdHJhdGVneU1vdmVJbmZvO1xufTtcblxuZXhwb3J0IHR5cGUgVGFza1JlbmRlckRhdGEgPSB7XG4gIHJlYWRvbmx5IGNodW5rOiBDaHVuaztcbiAgcmVhZG9ubHkgaXNTaGFkb3dQbGFjZWhvbGRlcjogYm9vbGVhbjtcbn07XG5cbmV4cG9ydCB0eXBlIFRhc2tNb3VudERhdGEgPSBUYXNrRGF0YSAmIHtcbiAgcmVhZG9ubHkgJGVsOiAkQ2h1bmtFbDtcbiAgcmVhZG9ubHkgaXNTaGFkb3dQbGFjZWhvbGRlcjogYm9vbGVhbjtcbn07XG5cbmV4cG9ydCB0eXBlIFRhc2tVbm1vdW50RGF0YSA9IFRhc2tEYXRhICYge1xuICByZWFkb25seSAkZWw6ICRDaHVua0VsO1xuICByZWFkb25seSBpc1NoYWRvd1BsYWNlaG9sZGVyOiBib29sZWFuO1xufTtcbiIsImltcG9ydCB7IFByaW9yaXR5RXZlbnRzIH0gZnJvbSAnLi4vc2VydmljZXMvcHJpb3JpdHktZXZlbnRzJztcbmltcG9ydCB7XG4gIEV4dGVuZGFibGVFdmVudCxcbiAgVGFza1R5cGUsXG4gIFRhc2tNb3VudERhdGEsXG4gIFRhc2tSZW5kZXJEYXRhLFxuICBUYXNrUmVhY2hCb3VuZERhdGEsXG4gIFRhc2tVbm1vdW50RGF0YSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGlzRXhpc3RzIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlRXh0ZW5kYWJsZUV2ZW50ID0gPFQ+KGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUPikgPT4gdm9pZCkgPT4ge1xuICByZXR1cm4gKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VD4pID0+IHtcbiAgICBldmVudC5fX29uUmVzb2x2ZSgoKSA9PiB7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSk7XG5cbiAgICBpZiAoaXNFeGlzdHMoZXZlbnQuX19pc1BlbmRpbmcpID09PSBmYWxzZSkge1xuICAgICAgZXZlbnQuX19yZXNvbHZlKCk7XG4gICAgfVxuICB9O1xufTtcblxuZXhwb3J0IGNsYXNzIFRhc2tSb290SGFuZGxlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcHJpb3JpdHlFdmVudHM6IFByaW9yaXR5RXZlbnRzLFxuICApIHt9XG5cbiAgcHJvdGVjdGVkIG9uUm9vdFJlYWNoQm91bmQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZWFjaEJvdW5kRGF0YT4pID0+IHZvaWQpIHtcbiAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uUm9vdChUYXNrVHlwZS5SRUFDSF9CT1VORCwgaGFuZGxlRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZWFjaEJvdW5kRGF0YT4oY2FsbGJhY2spKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvblJvb3RSZW5kZXIoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZW5kZXJEYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub25Sb290KFRhc2tUeXBlLlJFTkRFUiwgaGFuZGxlRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZW5kZXJEYXRhPihjYWxsYmFjaykpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uUm9vdE1vdW50KGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrTW91bnREYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub25Sb290KFRhc2tUeXBlLk1PVU5ULCBoYW5kbGVFeHRlbmRhYmxlRXZlbnQ8VGFza01vdW50RGF0YT4oY2FsbGJhY2spKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvblJvb3RVbm1vdW50KGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrVW5tb3VudERhdGE+KSA9PiB2b2lkKSB7XG4gICAgdGhpcy5wcmlvcml0eUV2ZW50cy5vblJvb3QoVGFza1R5cGUuVU5NT1VOVCwgaGFuZGxlRXh0ZW5kYWJsZUV2ZW50PFRhc2tVbm1vdW50RGF0YT4oY2FsbGJhY2spKTtcbiAgfVxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGlzRXhpc3RzKHZhbHVlKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZFN0cmluZyhsZW5ndGgpIHtcbiAgbGV0IHRleHQgPSAnJztcbiAgbGV0IHBvc3NpYmxlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5JztcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gIH1cblxuICByZXR1cm4gdGV4dDtcbn1cbiJdfQ==
