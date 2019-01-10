(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
const scroll_1 = require("../../src/strategy/scroll");
const interfaces_1 = require("../../src/task/interfaces");
const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;
const easyList = new index_1.EasyList({
    strategy: scroll_1.createScrollStrategy('#parent'),
    useShadowPlaceholder: true,
    maxItems: 5,
    sensitivity: {
        [interfaces_1.MoveDirection.TO_BOTTOM]: 500,
    }
});
easyList.bind('#feed');
addItems();
easyList.onReachBound(event => {
    if (event.detail.forwardChunks.length !== 0) {
        return;
    }
    if (event.detail.moveInfo.direction !== interfaces_1.MoveDirection.TO_BOTTOM) {
        return;
    }
    addItems();
});
easyList.onMount(event => {
    if (event.detail.isShadowPlaceholder) {
        return;
    }
    event.waitUntil(new Promise(resolve => {
        const imgEl = event.detail.$el.querySelector('img');
        const image = new Image();
        image.src = imgEl.getAttribute('src');
        image.onload = () => {
            resolve();
        };
    }));
});
easyList.onRender(event => {
    if (event.detail.isShadowPlaceholder) {
        return;
    }
});
function addItems() {
    const items = [];
    for (let i = 0; i < 10; i++) {
        const item = getItem();
        items.push({
            template: getItemTemplate(item),
            data: item,
        });
    }
    easyList.appendItems(items);
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

},{"../../index":2,"../../src/strategy/scroll":7,"../../src/task/interfaces":10}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL2Jsb2NrX3Njcm9sbC9pbmRleC50cyIsImluZGV4LnRzIiwic3JjL2FwaS50cyIsInNyYy9saWIudHMiLCJzcmMvc2VydmljZXMvZXZlbnRlci50cyIsInNyYy9zZXJ2aWNlcy9wcmlvcml0eS1ldmVudHMudHMiLCJzcmMvc3RyYXRlZ3kvc2Nyb2xsLnRzIiwic3JjL3Rhc2svY2hpbGQtaGFuZGxlci50cyIsInNyYy90YXNrL2VtaXR0ZXIudHMiLCJzcmMvdGFzay9pbnRlcmZhY2VzLnRzIiwic3JjL3Rhc2svcm9vdC1oYW5kbGVyLnRzIiwic3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSx1Q0FBdUM7QUFDdkMsc0RBQWlFO0FBRWpFLDBEQUEwRDtBQUUxRCxNQUFNLFdBQVcsR0FBRyw0Q0FBNEMsQ0FBQztBQUNqRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFWCxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFRLENBQUM7SUFDNUIsUUFBUSxFQUFFLDZCQUFvQixDQUFDLFNBQVMsQ0FBQztJQUN6QyxvQkFBb0IsRUFBRSxJQUFJO0lBQzFCLFFBQVEsRUFBRSxDQUFDO0lBQ1gsV0FBVyxFQUFFO1FBQ1gsQ0FBQywwQkFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUc7S0FDL0I7Q0FDRixDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZCLFFBQVEsRUFBRSxDQUFDO0FBRVgsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUM1QixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDM0MsT0FBTztLQUNSO0lBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssMEJBQWEsQ0FB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TUFBTSxDQUFDLHFCQUFRLENBQUMsS0FBSyxFQUFFLDZCQUFxQixDQUFnQixRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFFUyxhQUFhLENBQUMsUUFBMkQ7UUFDakYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMscUJBQVEsQ0FBQyxPQUFPLEVBQUUsNkJBQXFCLENBQWtCLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDakcsQ0FBQztDQUNGO0FBcEJELDBDQW9CQzs7Ozs7QUMzQ0QsU0FBZ0IsUUFBUSxDQUFDLEtBQUs7SUFDNUIsT0FBTyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUM7QUFDL0MsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsVUFBVSxDQUFDLE1BQU07SUFDL0IsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2QsSUFBSSxRQUFRLEdBQUcsZ0VBQWdFLENBQUM7SUFFaEYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUN0RTtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQVRELGdDQVNDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiaW1wb3J0IHsgRWFzeUxpc3QgfSBmcm9tICcuLi8uLi9pbmRleCc7XG5pbXBvcnQgeyBjcmVhdGVTY3JvbGxTdHJhdGVneSB9IGZyb20gJy4uLy4uL3NyYy9zdHJhdGVneS9zY3JvbGwnO1xuaW1wb3J0IHsgUmF3SXRlbSB9IGZyb20gJy4uLy4uL3NyYy9saWInO1xuaW1wb3J0IHsgTW92ZURpcmVjdGlvbiB9IGZyb20gJy4uLy4uL3NyYy90YXNrL2ludGVyZmFjZXMnO1xuXG5jb25zdCByYW5kUGljdHVyZSA9ICdodHRwczovL3NvdXJjZS51bnNwbGFzaC5jb20vcmFuZG9tLzgwMHg2MDAnO1xubGV0IGlkID0gMDtcblxuY29uc3QgZWFzeUxpc3QgPSBuZXcgRWFzeUxpc3Qoe1xuICBzdHJhdGVneTogY3JlYXRlU2Nyb2xsU3RyYXRlZ3koJyNwYXJlbnQnKSxcbiAgdXNlU2hhZG93UGxhY2Vob2xkZXI6IHRydWUsXG4gIG1heEl0ZW1zOiA1LFxuICBzZW5zaXRpdml0eToge1xuICAgIFtNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTV06IDUwMCxcbiAgfVxufSk7XG5cbmVhc3lMaXN0LmJpbmQoJyNmZWVkJyk7XG5cbmFkZEl0ZW1zKCk7XG5cbmVhc3lMaXN0Lm9uUmVhY2hCb3VuZChldmVudCA9PiB7XG4gIGlmIChldmVudC5kZXRhaWwuZm9yd2FyZENodW5rcy5sZW5ndGggIT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoZXZlbnQuZGV0YWlsLm1vdmVJbmZvLmRpcmVjdGlvbiAhPT0gTW92ZURpcmVjdGlvbi5UT19CT1RUT00pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBhZGRJdGVtcygpO1xufSk7XG5cbmVhc3lMaXN0Lm9uTW91bnQoZXZlbnQgPT4ge1xuICBpZiAoZXZlbnQuZGV0YWlsLmlzU2hhZG93UGxhY2Vob2xkZXIpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBldmVudC53YWl0VW50aWwobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgY29uc3QgaW1nRWwgPSBldmVudC5kZXRhaWwuJGVsLnF1ZXJ5U2VsZWN0b3IoJ2ltZycpO1xuXG4gICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICBpbWFnZS5zcmMgPSBpbWdFbC5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xuICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9O1xuICB9KSk7XG59KTtcblxuZWFzeUxpc3Qub25SZW5kZXIoZXZlbnQgPT4ge1xuICBpZiAoZXZlbnQuZGV0YWlsLmlzU2hhZG93UGxhY2Vob2xkZXIpIHtcbiAgICByZXR1cm47XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBhZGRJdGVtcygpIHtcbiAgY29uc3QgaXRlbXM6IFJhd0l0ZW1bXSA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgIGNvbnN0IGl0ZW0gPSBnZXRJdGVtKCk7XG5cbiAgICBpdGVtcy5wdXNoKHtcbiAgICAgIHRlbXBsYXRlOiBnZXRJdGVtVGVtcGxhdGUoaXRlbSksXG4gICAgICBkYXRhOiBpdGVtLFxuICAgIH0pO1xuICB9XG5cbiAgZWFzeUxpc3QuYXBwZW5kSXRlbXMoaXRlbXMpO1xufVxuXG5mdW5jdGlvbiBnZXRJdGVtKCkge1xuICBjb25zdCBuZXdJZCA9IGlkKys7XG5cbiAgcmV0dXJuIHtcbiAgICBpbWFnZTogYCR7cmFuZFBpY3R1cmV9P3NpZz0ke25ld0lkfWAsXG4gICAgaWQ6IG5ld0lkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRJdGVtVGVtcGxhdGUoaXRlbSkge1xuICByZXR1cm4gYDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgPGgxPlBpY3R1cmUgJHtpdGVtLmlkfTwvaDE+XG4gICAgPGltZyBzcmM9XCIke2l0ZW0uaW1hZ2V9XCIgLz5cbiAgPC9kaXY+YDtcbn1cbiIsImV4cG9ydCAqIGZyb20gJy4vc3JjL2FwaSc7XG4iLCJpbXBvcnQgeyBFYXN5TGlzdExpYiwgUmF3SXRlbSwgRWFzeUxpc3RPcHRpb25zLCBERUZBVUxUX09QVElPTlMgfSBmcm9tICcuL2xpYic7XG5pbXBvcnQgeyBQcmlvcml0eUV2ZW50cyB9IGZyb20gJy4vc2VydmljZXMvcHJpb3JpdHktZXZlbnRzJztcbmltcG9ydCB7IFRhc2tFbWl0dGVyIH0gZnJvbSAnLi90YXNrL2VtaXR0ZXInO1xuaW1wb3J0IHsgVGFza0NoaWxkSGFuZGxlciB9IGZyb20gJy4vdGFzay9jaGlsZC1oYW5kbGVyJztcbmltcG9ydCB7XG4gIEV4dGVuZGFibGVFdmVudCxcbiAgVGFza1JlbmRlckRhdGEsXG4gIFRhc2tNb3VudERhdGEsXG4gIFRhc2tSZWFjaEJvdW5kRGF0YSxcbiAgVGFza1VubW91bnREYXRhLFxuICBNb3ZlRGlyZWN0aW9uLFxufSBmcm9tICcuL3Rhc2svaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjcmVhdGVTY3JvbGxTdHJhdGVneSB9IGZyb20gJy4vc3RyYXRlZ3kvc2Nyb2xsJztcbmltcG9ydCB7IGlzRXhpc3RzIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBFYXN5TGlzdCB7XG4gIHByaXZhdGUgZWFzeUxpc3Q6IEVhc3lMaXN0TGliO1xuICBwcml2YXRlIHRhc2tDaGlsZEhhbmRsZXI6IFRhc2tDaGlsZEhhbmRsZXI7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogRWFzeUxpc3RPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBwcmlvcml0eUV2ZW50cyA9IG5ldyBQcmlvcml0eUV2ZW50cygpO1xuICAgIGNvbnN0IHRhc2tFbWl0dGVyID0gbmV3IFRhc2tFbWl0dGVyKHByaW9yaXR5RXZlbnRzKTtcblxuICAgIHRoaXMuZWFzeUxpc3QgPSBuZXcgRWFzeUxpc3RMaWIodGhpcy5ub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpLCBwcmlvcml0eUV2ZW50cywgdGFza0VtaXR0ZXIpO1xuICAgIHRoaXMudGFza0NoaWxkSGFuZGxlciA9IG5ldyBUYXNrQ2hpbGRIYW5kbGVyKHByaW9yaXR5RXZlbnRzKTtcbiAgfVxuXG4gIGJpbmQoJHRhcmdldDogRWxlbWVudCB8IEhUTUxFbGVtZW50IHwgc3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiAkdGFyZ2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgJHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJHRhcmdldCkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgdGhpcy5lYXN5TGlzdC5iaW5kKCR0YXJnZXQgYXMgSFRNTEVsZW1lbnQpO1xuICB9XG5cbiAgYXBwZW5kSXRlbXMoaXRlbXM6IFJhd0l0ZW1bXSk6IHZvaWQge1xuICAgIHRoaXMuZWFzeUxpc3QuYXBwZW5kSXRlbXMoaXRlbXMpO1xuICB9XG5cbiAgcHJlcGVuZEl0ZW1zKGl0ZW1zOiBSYXdJdGVtW10pOiB2b2lkIHtcbiAgICB0aGlzLmVhc3lMaXN0LnByZXBlbmRJdGVtcyhpdGVtcyk7XG4gIH1cblxuICBvblJlYWNoQm91bmQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZWFjaEJvdW5kRGF0YT4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRhc2tDaGlsZEhhbmRsZXIub25SZWFjaEJvdW5kKGNhbGxiYWNrKTtcbiAgfVxuXG4gIG9uUmVuZGVyKGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrUmVuZGVyRGF0YT4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRhc2tDaGlsZEhhbmRsZXIub25SZW5kZXIoY2FsbGJhY2spO1xuICB9XG5cbiAgb25Nb3VudChjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza01vdW50RGF0YT4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRhc2tDaGlsZEhhbmRsZXIub25Nb3VudChjYWxsYmFjayk7XG4gIH1cblxuICBvblVubW91bnQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tVbm1vdW50RGF0YT4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRhc2tDaGlsZEhhbmRsZXIub25Vbm1vdW50KGNhbGxiYWNrKTtcbiAgfVxuXG4gIHByaXZhdGUgbm9ybWFsaXplT3B0aW9ucyhvcHRpb25zOiBFYXN5TGlzdE9wdGlvbnMpOiBFYXN5TGlzdE9wdGlvbnMge1xuICAgIGlmICghb3B0aW9ucy5zdHJhdGVneSkge1xuICAgICAgb3B0aW9ucy5zdHJhdGVneSA9IGNyZWF0ZVNjcm9sbFN0cmF0ZWd5KCk7XG4gICAgfVxuXG4gICAgY29uc3QgdGhyb3dJbnZhbGlkTnVtYmVyID0gbmFtZSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtuYW1lfSB2YWx1ZTogaXQgc2hvdWxkIGJlIGEgaW50ZWdlciBudW1iZXJgKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja1NlbnNpdGl2aXR5ID0gZGlyZWN0aW9uID0+IHtcbiAgICAgIGlmIChpc0V4aXN0cyhvcHRpb25zLnNlbnNpdGl2aXR5W2RpcmVjdGlvbl0pKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBOdW1iZXIuaXNTYWZlSW50ZWdlcihvcHRpb25zLnNlbnNpdGl2aXR5W2RpcmVjdGlvbl0pID09PSBmYWxzZVxuICAgICAgICApIHtcbiAgICAgICAgICB0aHJvd0ludmFsaWROdW1iZXIoYHNlbnNpdGl2aXR5ICR7ZGlyZWN0aW9ufWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zLnNlbnNpdGl2aXR5W2RpcmVjdGlvbl0gPSBERUZBVUxUX09QVElPTlMuc2Vuc2l0aXZpdHlbZGlyZWN0aW9uXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNFeGlzdHMob3B0aW9ucy5tYXhJdGVtcykpIHtcbiAgICAgIGlmIChOdW1iZXIuaXNTYWZlSW50ZWdlcihvcHRpb25zLm1heEl0ZW1zKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkTnVtYmVyKCdtYXhJdGVtcycpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zLm1heEl0ZW1zID0gREVGQVVMVF9PUFRJT05TLm1heEl0ZW1zO1xuICAgIH1cblxuICAgIGlmIChpc0V4aXN0cyhvcHRpb25zLnNlbnNpdGl2aXR5KSkge1xuICAgICAgY2hlY2tTZW5zaXRpdml0eShNb3ZlRGlyZWN0aW9uLlRPX1RPUCk7XG4gICAgICBjaGVja1NlbnNpdGl2aXR5KE1vdmVEaXJlY3Rpb24uVE9fQk9UVE9NKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucy5zZW5zaXRpdml0eSA9IERFRkFVTFRfT1BUSU9OUy5zZW5zaXRpdml0eTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbiAgfVxufVxuIiwiaW1wb3J0IHsgUHJpb3JpdHlFdmVudHMgfSBmcm9tICcuL3NlcnZpY2VzL3ByaW9yaXR5LWV2ZW50cyc7XG5pbXBvcnQgeyBpc0V4aXN0cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgTW92ZURpcmVjdGlvbiB9IGZyb20gJy4vdGFzay9pbnRlcmZhY2VzJztcbmltcG9ydCB7IFRhc2tFbWl0dGVyIH0gZnJvbSAnLi90YXNrL2VtaXR0ZXInO1xuaW1wb3J0IHsgVGFza1Jvb3RIYW5kbGVyIH0gZnJvbSAnLi90YXNrL3Jvb3QtaGFuZGxlcic7XG5pbXBvcnQgeyBTdHJhdGVneSwgU3RyYXRlZ3lGYWN0b3J5IH0gZnJvbSAnc3RyYXRlZ3kvaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWFzeUxpc3RPcHRpb25zIHtcbiAgLyoqXG4gICAqIFN0cmF0ZWd5IGlzIHVzZWQgdG8gZGV0ZWN0LCB0aGF0IHNjcm9sbCBib3VuZCBpcyB0b3VjaGVkIGNodW5rcyBib3guXG4gICAqXG4gICAqIEJ5IGRlZmF1bHQgaXMgYFNjcm9sbFN0cmF0ZWd5YC5cbiAgICovXG4gIHN0cmF0ZWd5PzogU3RyYXRlZ3lGYWN0b3J5O1xuXG4gIC8qKlxuICAgKiBJZiBlbmFibGVkLCBhZnRlciBhZGRpbmcgbmV3IGNodW5rcyBhZGQgc3BhY2UgYXMgcGxhY2Vob2xkZXIgYWZ0ZXIvYmVmb3JlXG4gICAqIHJlbmRlcmVkIGNodW5rcy4gSWYgY2h1bmsgaGVpZ2h0IGlzIG5vdCBkZWZpbmVkLCBtb3VudCBoaW0gYXMgcGxhY2Vob2xkZXJcbiAgICogdG8gZGV0ZWN0IGhlaWdodCBvZiBoaW0gZWxlbWVudCBhbmQgaW5jcmVhc2UgcGxhY2Vob2RsZXIgc3BhY2UuXG4gICAqXG4gICAqIEVtaXR0aW5nIGBvbk1vdW50L29uVW5tb3VudGAgZXZlbnQgd2l0aCBgaXNTaGFkb3dQbGFjZWhvbGRlcjogdHJ1ZWAgb3B0aW9uLlxuICAgKi9cbiAgdXNlU2hhZG93UGxhY2Vob2xkZXI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXggYW1vdW50IG9mIGl0ZW1zIGluIGxpc3QuXG4gICAqXG4gICAqIEJ5IGRlZmF1bHQgaXMgNSBpdGVtcy5cbiAgICovXG4gIG1heEl0ZW1zPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgcGl4ZWxzIGJldHdlZW4gZWRnZSBpdGVtIGFuZCBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbi5cbiAgICogSXQgc2hvdWxkIGJlIGxlc3MgdGhhbiBpdGVtIGhlaWdodC5cbiAgICpcbiAgICogQnkgZGVmYXVsdCBpcyAzMDBweC5cbiAgICovXG4gIHNlbnNpdGl2aXR5Pzoge1xuICAgIFtNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTV0/OiBudW1iZXI7XG4gICAgW01vdmVEaXJlY3Rpb24uVE9fVE9QXT86IG51bWJlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSYXdJdGVtIHtcbiAgdGVtcGxhdGU6IHN0cmluZztcbiAgaGVpZ2h0PzogbnVtYmVyO1xuICBkYXRhPzogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENodW5rIGV4dGVuZHMgUmF3SXRlbSB7XG4gIGNhbGN1bGF0ZWQ6IGJvb2xlYW47XG4gIGlkOiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlICRDaHVua0VsID0gSFRNTERpdkVsZW1lbnQ7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX09QVElPTlM6IEVhc3lMaXN0T3B0aW9ucyA9IHtcbiAgbWF4SXRlbXM6IDUsXG4gIHNlbnNpdGl2aXR5OiB7XG4gICAgW01vdmVEaXJlY3Rpb24uVE9fQk9UVE9NXTogMzAwLFxuICAgIFtNb3ZlRGlyZWN0aW9uLlRPX1RPUF06IDMwMCxcbiAgfVxufTtcblxuZXhwb3J0IGNsYXNzIEVhc3lMaXN0TGliIGV4dGVuZHMgVGFza1Jvb3RIYW5kbGVyIHtcbiAgcHJpdmF0ZSBzdHJhdGVneTogU3RyYXRlZ3k7XG4gIHByaXZhdGUgJHRhcmdldDogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgbG9ja01vdmVIYW5kbGVyID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBtYXhSZW5kZXJlZENodW5rcyA9IERFRkFVTFRfT1BUSU9OUy5tYXhJdGVtcztcbiAgcHJpdmF0ZSBsYXN0Q2h1bmtJZCA9IDA7XG5cbiAgcHJpdmF0ZSBjaHVua3M6IENodW5rW10gPSBbXTtcbiAgcHJpdmF0ZSB0b1JlbmRlckNodW5rSWRzOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKTtcbiAgcHJpdmF0ZSByZW5kZXJlZENodW5rSWRzOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKTtcbiAgcHJpdmF0ZSBydW5uaW5nU2hhZG93UGxhY2Vob2xkZXJJZHM6IFNldDxudW1iZXI+ID0gbmV3IFNldCgpO1xuICBwcml2YXRlIGhlYWRSZW5kZXJlZENodW5rSW5kZXg6IG51bWJlciA9IDA7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBFYXN5TGlzdE9wdGlvbnMsXG4gICAgcHJpb3JpdHlFdmVudHM6IFByaW9yaXR5RXZlbnRzLFxuICAgIHByaXZhdGUgdGFza0VtaXR0ZXI6IFRhc2tFbWl0dGVyLFxuICApIHtcbiAgICBzdXBlcihwcmlvcml0eUV2ZW50cyk7XG5cbiAgICB0aGlzLm1heFJlbmRlcmVkQ2h1bmtzID0gdGhpcy5vcHRpb25zLm1heEl0ZW1zO1xuXG4gICAgdGhpcy5vblJvb3RSZWFjaEJvdW5kKGV2ZW50ID0+IHtcbiAgICAgIHRoaXMubG9ja01vdmVIYW5kbGVyID0gZmFsc2U7XG5cbiAgICAgIC8qKlxuICAgICAgICogSWYgZGlyZWN0aW9uIHRvIHRvcCwgcmVtYWluaW5nIGRpc3RhbmNlIGNhbiBiZSBuZWdhdGl2ZSB2YWx1ZVxuICAgICAgICogaWYgc2Nyb2xsIGlzIG92ZXIgb2YgdG9wIGNodW5rcyBib3g7XG4gICAgICAgKlxuICAgICAgICogSWYgZGlyZWN0aW9uIHRvIGJvdHRvbSwgcmVtYWluaW5nIGRpc3RhbmNlIGNhbiBiZSBuZWdhdGl2ZSB2YWx1ZVxuICAgICAgICogaWYgc2Nyb2xsIGlzIG92ZXIgb2YgYm90dG9tIGNodW5rcyBib3g7XG4gICAgICAgKi9cblxuICAgICAgbGV0IHJlbWFpbkhlaWdodCA9IE1hdGguYWJzKGV2ZW50LmRldGFpbC5tb3ZlSW5mby5yZW1haW5pbmdEaXN0YW5jZSk7XG5cbiAgICAgIGlmIChldmVudC5kZXRhaWwubW92ZUluZm8uZGlyZWN0aW9uID09PSBNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTSkge1xuICAgICAgICBpZiAoZXZlbnQuZGV0YWlsLmZvcndhcmRDaHVua3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHJlZHVjZURlbHRhID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGFzdFJlbmRlcmVkSW5kZXggPSB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXggKyB0aGlzLm1heFJlbmRlcmVkQ2h1bmtzO1xuXG4gICAgICAgICAgICBpZiAobGFzdFJlbmRlcmVkSW5kZXggPj0gdGhpcy5jaHVua3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4Kys7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNodW5rc1tsYXN0UmVuZGVyZWRJbmRleF0uY2FsY3VsYXRlZCkge1xuICAgICAgICAgICAgICByZW1haW5IZWlnaHQgLT0gdGhpcy5jaHVua3NbbGFzdFJlbmRlcmVkSW5kZXhdLmhlaWdodDtcblxuICAgICAgICAgICAgICBpZiAocmVtYWluSGVpZ2h0ID4gMCkge1xuICAgICAgICAgICAgICAgIHJlZHVjZURlbHRhKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVkdWNlRGVsdGEoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQuZGV0YWlsLm1vdmVJbmZvLmRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19UT1ApIHtcbiAgICAgICAgaWYgKGV2ZW50LmRldGFpbC5mb3J3YXJkQ2h1bmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCByZWR1Y2VEZWx0YSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXggPD0gMCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleC0tO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5jaHVua3NbdGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4XS5jYWxjdWxhdGVkKSB7XG4gICAgICAgICAgICAgIHJlbWFpbkhlaWdodCAtPSB0aGlzLmNodW5rc1t0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXhdLmhlaWdodDtcblxuICAgICAgICAgICAgICBpZiAocmVtYWluSGVpZ2h0ID4gMCkge1xuICAgICAgICAgICAgICAgIHJlZHVjZURlbHRhKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVkdWNlRGVsdGEoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJlbmRlclRyZWUoKTtcbiAgICB9KTtcblxuICAgIHRoaXMub25Sb290UmVuZGVyKGV2ZW50ID0+IHtcbiAgICAgIHRoaXMucmVuZGVyQ2h1bmsoZXZlbnQuZGV0YWlsLmNodW5rKTtcbiAgICB9KTtcblxuICAgIHRoaXMub25Sb290TW91bnQoZXZlbnQgPT4ge1xuICAgICAgY29uc3QgeyBjaHVuayB9ID0gZXZlbnQuZGV0YWlsO1xuXG4gICAgICB0aGlzLmNhbGNDaHVuayhjaHVuayk7XG5cbiAgICAgIC8vIElmIHRoaXMgY2h1bmsgaXMgbm90IG5lZWQgdG8gYmUgaW4gbGlzdCBhbnltb3JlLCBkZXN0cm95IGl0XG4gICAgICBpZiAodGhpcy50b1JlbmRlckNodW5rSWRzLmhhcyhjaHVuay5pZCkgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMudHJ5VG9EZXN0cm95Q2h1bmsoY2h1bmsuaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5vblJvb3RVbm1vdW50KGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IHsgY2h1bmsgfSA9IGV2ZW50LmRldGFpbDtcblxuICAgICAgdGhpcy5yZW1vdmVDaHVuayhjaHVuayk7XG4gICAgfSk7XG4gIH1cblxuICBiaW5kKCR0YXJnZXQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy4kdGFyZ2V0ID0gJHRhcmdldDtcblxuICAgIHRoaXMuc2V0dXBTdHJhdGVneSgpO1xuICB9XG5cbiAgYXBwZW5kSXRlbXMoaXRlbXM6IFJhd0l0ZW1bXSk6IHZvaWQge1xuICAgIGNvbnN0IGNodW5rcyA9IHRoaXMuY29udmVydEl0ZW1zVG9DaHVua3MoaXRlbXMpO1xuXG4gICAgdGhpcy5jaHVua3MucHVzaCguLi5jaHVua3MpO1xuICAgIHRoaXMucmVuZGVyVHJlZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy51c2VTaGFkb3dQbGFjZWhvbGRlcikge1xuICAgICAgdGhpcy5yZW5kZXJTaGFkb3dQbGFjZWhvbGRlclRyZWUoTW92ZURpcmVjdGlvbi5UT19CT1RUT00pO1xuICAgIH1cbiAgfVxuXG4gIHByZXBlbmRJdGVtcyhpdGVtczogUmF3SXRlbVtdKTogdm9pZCB7XG4gICAgY29uc3QgY2h1bmtzID0gdGhpcy5jb252ZXJ0SXRlbXNUb0NodW5rcyhpdGVtcyk7XG5cbiAgICB0aGlzLmNodW5rcy51bnNoaWZ0KC4uLmNodW5rcyk7XG4gICAgdGhpcy5yZW5kZXJUcmVlKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnVzZVNoYWRvd1BsYWNlaG9sZGVyKSB7XG4gICAgICB0aGlzLnJlbmRlclNoYWRvd1BsYWNlaG9sZGVyVHJlZShNb3ZlRGlyZWN0aW9uLlRPX1RPUCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJUcmVlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5ld1RvUmVuZGVyQ2h1bmtzID0gdGhpcy5jaHVua3Muc2xpY2UodGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4LCB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXggKyB0aGlzLm1heFJlbmRlcmVkQ2h1bmtzKTtcbiAgICBjb25zdCBrZWVwQ2h1bmtzOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgY29uc3Qgd2FpdERlc3Ryb3kgPSBbXTtcblxuICAgIC8vIEdldCBvbGQgY2h1bmtzLCB0aGF0IG5lZWQgdG8ga2VlcCBpbiB0cmVlXG4gICAgbmV3VG9SZW5kZXJDaHVua3MuZm9yRWFjaChjaHVuayA9PiB7XG4gICAgICBpZiAodGhpcy50b1JlbmRlckNodW5rSWRzLmhhcyhjaHVuay5pZCkgPT09IHRydWUpIHtcbiAgICAgICAga2VlcENodW5rcy5wdXNoKGNodW5rLmlkKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMucnVubmluZ1NoYWRvd1BsYWNlaG9sZGVySWRzLmhhcyhjaHVuay5pZCkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIHRoaXMgY2h1bmsgbmVlZCB0byBrZWVwIGluIHRyZWUgYW5kIGl0IGV4aXN0cyBpbiB0cmVlIGFzIHNoYWRvdyBwbGFjZWhvbGRlcixcbiAgICAgICAgICogd2UgbmVlZCB0byBkZXN0cm95IGl0LCBhbmQgbW91bnQgY2h1bmsgYWdhaW4gd2l0aG91dCBgaXNTaGFkb3dQbGFjZWhvbGRlcmAgcHJvcGVydHlcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IGRlc3Ryb3llZENodW5rID0gdGhpcy5kZXN0cm95Q2h1bmsodGhpcy5nZXRDaHVua0J5SWQoY2h1bmsuaWQpKS50aGVuKGV2ZW50ID0+IHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNodW5rLmlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2FpdERlc3Ryb3kucHVzaChkZXN0cm95ZWRDaHVuayk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBQcm9taXNlLmFsbCh3YWl0RGVzdHJveSkudGhlbihkZXN0cm95ZWRJZHMgPT4ge1xuICAgICAgLy8gRGVzdHJveSBjaHVua3MgdGhhdCBub3QgbmVlZGVkIG5vd1xuICAgICAgWy4uLnRoaXMucmVuZGVyZWRDaHVua0lkc10uZm9yRWFjaChjaHVua0lkID0+IHtcbiAgICAgICAgaWYgKGtlZXBDaHVua3MuaW5jbHVkZXMoY2h1bmtJZCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgdGhpcy50cnlUb0Rlc3Ryb3lDaHVuayhjaHVua0lkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudG9SZW5kZXJDaHVua0lkcyA9IG5ldyBTZXQoWy4uLm5ld1RvUmVuZGVyQ2h1bmtzLm1hcChjaHVuayA9PiBjaHVuay5pZCksIC4uLmRlc3Ryb3llZElkc10pO1xuXG4gICAgICAvLyBSZW5kZXIgbmV3IGNodW5rc1xuICAgICAgdGhpcy50b1JlbmRlckNodW5rSWRzLmZvckVhY2goY2h1bmtJZCA9PiB7XG4gICAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5nZXRDaHVua0J5SWQoY2h1bmtJZCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoYXQgY2FzZSBpcyBwb3NzaWJsZSBpZiB0aGUgbW91bnQgb2YgdGhlIGNodW5rIFggd2FzIGNvbXBsZXRlZCBhZnRlclxuICAgICAgICAgKiB0aGUgY2h1bmsgWCBhcHBlYXJlZCBpbiB0aGUgbGlzdCBmb3IgdGhlIDJuZCB0aW1lXG4gICAgICAgICAqL1xuICAgICAgICBpZiAodGhpcy5yZW5kZXJlZENodW5rSWRzLmhhcyhjaHVuay5pZCkgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2VlcENodW5rcy5pbmNsdWRlcyhjaHVuay5pZCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgdGhpcy50YXNrRW1pdHRlci5lbWl0UmVuZGVyKHtcbiAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgaXNTaGFkb3dQbGFjZWhvbGRlcjogZmFsc2UsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTaGFkb3dQbGFjZWhvbGRlclRyZWUoZGlyZWN0aW9uOiBNb3ZlRGlyZWN0aW9uKTogdm9pZCB7XG4gICAgbGV0IHNoYWRvd1BsYWNlaG9sZGVyQ2h1bmtzOiBDaHVua1tdID0gW107XG5cbiAgICBpZiAoZGlyZWN0aW9uID09PSBNb3ZlRGlyZWN0aW9uLlRPX0JPVFRPTSkge1xuICAgICAgc2hhZG93UGxhY2Vob2xkZXJDaHVua3MgPSB0aGlzLmNodW5rcy5zbGljZSh0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXggKyB0aGlzLm1heFJlbmRlcmVkQ2h1bmtzKTtcbiAgICB9XG5cbiAgICBpZiAoZGlyZWN0aW9uID09PSBNb3ZlRGlyZWN0aW9uLlRPX1RPUCkge1xuICAgICAgc2hhZG93UGxhY2Vob2xkZXJDaHVua3MgPSB0aGlzLmNodW5rcy5zbGljZSgwLCB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXgpO1xuICAgIH1cblxuICAgIHNoYWRvd1BsYWNlaG9sZGVyQ2h1bmtzLmZvckVhY2goY2h1bmsgPT4ge1xuICAgICAgaWYgKGlzRXhpc3RzKGNodW5rLmhlaWdodCkgJiYgY2h1bmsuaGVpZ2h0ID4gMCkge1xuICAgICAgICB0aGlzLnVwZGF0ZUNodW5rKGNodW5rLCB7XG4gICAgICAgICAgY2FsY3VsYXRlZDogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJ1bm5pbmdTaGFkb3dQbGFjZWhvbGRlcklkcy5hZGQoY2h1bmsuaWQpO1xuXG4gICAgICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdFJlbmRlcih7XG4gICAgICAgICAgY2h1bmssXG4gICAgICAgICAgaXNTaGFkb3dQbGFjZWhvbGRlcjogdHJ1ZSxcbiAgICAgICAgfSkudGhlbihldmVudCA9PiB7XG4gICAgICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICBjb25zdCAkY2h1bmtFbCA9IHRoaXMuZHJhd0NodW5rKGNodW5rKTtcblxuICAgICAgICAgIHRoaXMucmVuZGVyZWRDaHVua0lkcy5hZGQoY2h1bmsuaWQpO1xuXG4gICAgICAgICAgdGhpcy50YXNrRW1pdHRlci5lbWl0TW91bnQoe1xuICAgICAgICAgICAgJGVsOiAkY2h1bmtFbCxcbiAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgcmVuZGVyZWRDaHVua3M6IHRoaXMuZ2V0Q2h1bmtzQnlJZHModGhpcy5yZW5kZXJlZENodW5rSWRzKSxcbiAgICAgICAgICAgIGlzU2hhZG93UGxhY2Vob2xkZXI6IHRydWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDaHVuayhjaHVuazogQ2h1bmspOiB2b2lkIHtcbiAgICBpZiAodGhpcy50b1JlbmRlckNodW5rSWRzLmhhcyhjaHVuay5pZCkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgJGNodW5rRWwgPSB0aGlzLmRyYXdDaHVuayhjaHVuayk7XG5cbiAgICB0aGlzLnJlbmRlcmVkQ2h1bmtJZHMuYWRkKGNodW5rLmlkKTtcblxuICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdE1vdW50KHtcbiAgICAgICRlbDogJGNodW5rRWwsXG4gICAgICBjaHVuayxcbiAgICAgIHJlbmRlcmVkQ2h1bmtzOiB0aGlzLmdldENodW5rc0J5SWRzKHRoaXMucmVuZGVyZWRDaHVua0lkcyksXG4gICAgICBpc1NoYWRvd1BsYWNlaG9sZGVyOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZHJhd0NodW5rKGNodW5rOiBDaHVuayk6ICRDaHVua0VsIHtcbiAgICBjb25zdCAkY2h1bmtFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICRjaHVua0VsLmRhdGFzZXRbJ2NodW5rJ10gPSBjaHVuay5pZC50b1N0cmluZygpO1xuICAgICRjaHVua0VsLmlubmVySFRNTCA9IGNodW5rLnRlbXBsYXRlO1xuXG4gICAgdGhpcy5pbnNlcnRDaHVua0VsKGNodW5rLCAkY2h1bmtFbCk7XG5cbiAgICByZXR1cm4gJGNodW5rRWw7XG4gIH1cblxuICBwcml2YXRlIGluc2VydENodW5rRWwoY2h1bms6IENodW5rLCAkY2h1bmtFbDogJENodW5rRWwpOiB2b2lkIHtcbiAgICBsZXQgY2h1bmtJbmRleCA9IHRoaXMuZ2V0Q2h1bmtJbmRleChjaHVuay5pZCk7XG5cbiAgICBpZiAoY2h1bmtJbmRleCA9PT0gMCkge1xuICAgICAgdGhpcy5nZXRDaHVua3NDb250YWluZXIoKS5wcmVwZW5kKCRjaHVua0VsKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucmVuZGVyZWRDaHVua0lkcy5zaXplID09PSAwKSB7XG4gICAgICB0aGlzLmdldENodW5rc0NvbnRhaW5lcigpLmFwcGVuZENoaWxkKCRjaHVua0VsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0ICRwcmV2Q2h1bmsgPSB0aGlzLmdldFRhaWxDaHVua0VsKCk7XG4gICAgICBsZXQgJHRhcmdldENodW5rRWw6ICRDaHVua0VsO1xuXG4gICAgICB3aGlsZSgkcHJldkNodW5rKSB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVkQ2h1bmtJZCA9ICskcHJldkNodW5rLmRhdGFzZXRbJ2NodW5rJ107XG5cbiAgICAgICAgLy8gQ2hlY2sgaW5kZXggb2YgZnV0dXJlIHJlbmRlciBjaHVuayBiZXR3ZWVuIGNodW5rcywgd2hpY2ggd2VyZSBhbHJlYWR5IHJlbmRlcmVkXG4gICAgICAgIGNvbnN0IHJlbmRlcmVkQ2h1bmtJbmRleCA9IHRoaXMuZ2V0Q2h1bmtJbmRleChyZW5kZXJlZENodW5rSWQpO1xuICAgICAgICBjaHVua0luZGV4ID0gdGhpcy5nZXRDaHVua0luZGV4KGNodW5rLmlkKTtcblxuICAgICAgICBpZiAoY2h1bmtJbmRleCA+IHJlbmRlcmVkQ2h1bmtJbmRleCkge1xuICAgICAgICAgICR0YXJnZXRDaHVua0VsID0gJHByZXZDaHVuaztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0V4aXN0cygkcHJldkNodW5rLnByZXZpb3VzRWxlbWVudFNpYmxpbmcpID09PSBmYWxzZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgJHByZXZDaHVuayA9ICRwcmV2Q2h1bmsucHJldmlvdXNFbGVtZW50U2libGluZyBhcyAkQ2h1bmtFbDtcbiAgICAgIH1cblxuICAgICAgaWYgKCR0YXJnZXRDaHVua0VsKSB7XG4gICAgICAgICR0YXJnZXRDaHVua0VsLmFmdGVyKCRjaHVua0VsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRwcmV2Q2h1bmsuYmVmb3JlKCRjaHVua0VsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHRyeVRvRGVzdHJveUNodW5rKGNodW5rSWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNodW5rID0gdGhpcy5nZXRDaHVua0J5SWQoY2h1bmtJZCk7XG5cbiAgICBpZiAoY2h1bmsuY2FsY3VsYXRlZCkge1xuICAgICAgdGhpcy5kZXN0cm95Q2h1bmsoY2h1bmspO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGV2ZW50IHRvIHVubW91bnQgY2h1bmtcbiAgICogV2l0aCB0aGlzIGV2ZW50IGNsaWVudCBjYW4gcmVtb3ZlIGxpc3RlbmVycyBmcm9tIGVsZW1lbnRzIGFuZCBldGMuXG4gICAqL1xuICBwcml2YXRlIGRlc3Ryb3lDaHVuayhjaHVuazogQ2h1bmspIHtcbiAgICBjb25zdCAkY2h1bmtFbCA9IHRoaXMuZ2V0Q2h1bmtFbChjaHVuayk7XG5cbiAgICBpZiAoJGNodW5rRWwpIHtcbiAgICAgIHJldHVybiB0aGlzLnRhc2tFbWl0dGVyLmVtaXRVbm1vdW50KHtcbiAgICAgICAgJGVsOiAkY2h1bmtFbCxcbiAgICAgICAgY2h1bmssXG4gICAgICAgIHJlbmRlcmVkQ2h1bmtzOiB0aGlzLmdldENodW5rc0J5SWRzKHRoaXMucmVuZGVyZWRDaHVua0lkcyksXG4gICAgICAgIGlzU2hhZG93UGxhY2Vob2xkZXI6IHRoaXMucnVubmluZ1NoYWRvd1BsYWNlaG9sZGVySWRzLmhhcyhjaHVuay5pZCksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGNodW5rIGZyb20gdGhlIERPTVxuICAgKi9cbiAgcHJpdmF0ZSByZW1vdmVDaHVuayhjaHVuazogQ2h1bmspOiB2b2lkIHtcbiAgICBjb25zdCAkY2h1bmtFbCA9IHRoaXMuZ2V0Q2h1bmtFbChjaHVuayk7XG5cbiAgICBpZiAoJGNodW5rRWwpIHtcbiAgICAgICRjaHVua0VsLnJlbW92ZSgpO1xuXG4gICAgICB0aGlzLnJ1bm5pbmdTaGFkb3dQbGFjZWhvbGRlcklkcy5kZWxldGUoY2h1bmsuaWQpO1xuICAgICAgdGhpcy5yZW5kZXJlZENodW5rSWRzLmRlbGV0ZShjaHVuay5pZCk7XG4gICAgICB0aGlzLmNhbGNUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRUYWlsQ2h1bmtFbCgpOiAkQ2h1bmtFbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2h1bmtzQ29udGFpbmVyKCkubGFzdEVsZW1lbnRDaGlsZCBhcyAkQ2h1bmtFbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2h1bmtzQ29udGFpbmVyKCk6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5zdHJhdGVneS4kY2h1bmtzQ29udGFpbmVyO1xuICB9XG5cbiAgcHJpdmF0ZSBjYWxjQ2h1bmsoY2h1bms6IENodW5rKTogdm9pZCB7XG4gICAgLyoqXG4gICAgICogV293LCB0aGlzIHNjcm9sbCBpcyBzbyBmYXN0XG4gICAgICogVGhpcyBjYXNlIGNhbiBiZSBoYXBwZW4gaWYgY2h1bmsgd2FzIGFscmVhZHkgY2FsY3VsYXRlZCBhbmRcbiAgICAgKiBub3cgaXMgcmVtb3ZlZCBpbiB0cmVlIHJlbmRlclxuICAgICAqL1xuICAgIGlmICh0aGlzLnJlbmRlcmVkQ2h1bmtJZHMuaGFzKGNodW5rLmlkKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCAkZWwgPSB0aGlzLmdldENodW5rRWwoY2h1bmspO1xuXG4gICAgY29uc3QgZWxIZWlnaHQgPSBNYXRoLm1heChcbiAgICAgICRlbC5vZmZzZXRIZWlnaHQsICRlbC5jbGllbnRIZWlnaHQsICRlbC5zY3JvbGxIZWlnaHRcbiAgICApO1xuXG4gICAgdGhpcy51cGRhdGVDaHVuayhjaHVuaywge1xuICAgICAgY2FsY3VsYXRlZDogdHJ1ZSxcbiAgICAgIGhlaWdodDogZWxIZWlnaHQsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNhbGNUcmVlKCk6IHZvaWQge1xuICAgIGNvbnN0IGhlYWRSZW5kZXJlZENodW5rcyA9IHRoaXMuY2h1bmtzLnNsaWNlKDAsIHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleCkuZmlsdGVyKGNodW5rID0+IGNodW5rLmNhbGN1bGF0ZWQpO1xuICAgIGNvbnN0IHRhaWxSZW5kZXJlZENodW5rcyA9IHRoaXMuY2h1bmtzLnNsaWNlKHRoaXMuaGVhZFJlbmRlcmVkQ2h1bmtJbmRleCArIHRoaXMubWF4UmVuZGVyZWRDaHVua3MpLmZpbHRlcihjaHVuayA9PiBjaHVuay5jYWxjdWxhdGVkKTtcblxuICAgIGNvbnN0IG9mZnNldFRvcCA9IGhlYWRSZW5kZXJlZENodW5rcy5yZWR1Y2UoKG9mZnNldCwgY2h1bmspID0+IG9mZnNldCArIGNodW5rLmhlaWdodCwgMCk7XG4gICAgY29uc3Qgb2Zmc2V0Qm90dG9tID0gdGFpbFJlbmRlcmVkQ2h1bmtzLnJlZHVjZSgob2Zmc2V0LCBjaHVuaykgPT4gb2Zmc2V0ICsgY2h1bmsuaGVpZ2h0LCAwKTtcblxuICAgIHRoaXMuJHRhcmdldC5zdHlsZS5wYWRkaW5nVG9wID0gYCR7b2Zmc2V0VG9wfXB4YDtcbiAgICB0aGlzLiR0YXJnZXQuc3R5bGUucGFkZGluZ0JvdHRvbSA9IGAke29mZnNldEJvdHRvbX1weGA7XG4gIH1cblxuICBwcml2YXRlIHNldHVwU3RyYXRlZ3koKTogdm9pZCB7XG4gICAgdGhpcy5zdHJhdGVneSA9IHRoaXMub3B0aW9ucy5zdHJhdGVneSh0aGlzLiR0YXJnZXQpO1xuXG4gICAgdGhpcy5zdHJhdGVneS5vbk1vdmUoaW5mbyA9PiB7XG4gICAgICBpZiAodGhpcy5sb2NrTW92ZUhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaW5mby5kaXJlY3Rpb24gPT09IE1vdmVEaXJlY3Rpb24uVE9fQk9UVE9NICYmIGluZm8ucmVtYWluaW5nRGlzdGFuY2UgPCB0aGlzLm9wdGlvbnMuc2Vuc2l0aXZpdHlbTW92ZURpcmVjdGlvbi5UT19CT1RUT01dKSB7XG4gICAgICAgIHRoaXMubG9ja01vdmVIYW5kbGVyID0gdHJ1ZTtcblxuICAgICAgICBjb25zdCBmb3J3YXJkQ2h1bmtzID0gdGhpcy5jaHVua3Muc2xpY2UodGhpcy5oZWFkUmVuZGVyZWRDaHVua0luZGV4ICsgdGhpcy50b1JlbmRlckNodW5rSWRzLnNpemUpO1xuXG4gICAgICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdFJlYWNoQm91bmQoe1xuICAgICAgICAgIG1vdmVJbmZvOiBpbmZvLFxuICAgICAgICAgIGZvcndhcmRDaHVua3MsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChpbmZvLmRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19UT1AgJiYgaW5mby5yZW1haW5pbmdEaXN0YW5jZSA8IHRoaXMub3B0aW9ucy5zZW5zaXRpdml0eVtNb3ZlRGlyZWN0aW9uLlRPX1RPUF0pIHtcbiAgICAgICAgdGhpcy5sb2NrTW92ZUhhbmRsZXIgPSB0cnVlO1xuXG4gICAgICAgIGNvbnN0IGZvcndhcmRDaHVua3MgPSB0aGlzLmNodW5rcy5zbGljZSgwLCB0aGlzLmhlYWRSZW5kZXJlZENodW5rSW5kZXgpO1xuXG4gICAgICAgIHRoaXMudGFza0VtaXR0ZXIuZW1pdFJlYWNoQm91bmQoe1xuICAgICAgICAgIG1vdmVJbmZvOiBpbmZvLFxuICAgICAgICAgIGZvcndhcmRDaHVua3MsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0SXRlbXNUb0NodW5rcyhpdGVtczogUmF3SXRlbVtdKTogQ2h1bmtbXSB7XG4gICAgcmV0dXJuIGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+ICh7XG4gICAgICBkYXRhOiBpdGVtLmRhdGEsXG4gICAgICBjYWxjdWxhdGVkOiBmYWxzZSxcbiAgICAgIHRlbXBsYXRlOiBpdGVtLnRlbXBsYXRlLFxuICAgICAgaGVpZ2h0OiBpc0V4aXN0cyhpdGVtLmhlaWdodCkgPyBpdGVtLmhlaWdodCA6IDAsXG4gICAgICBpZDogdGhpcy5sYXN0Q2h1bmtJZCsrLFxuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ2h1bmsoY2h1bms6IENodW5rLCBwYXJ0aWFsOiBQYXJ0aWFsPENodW5rPik6IHZvaWQge1xuICAgIGNvbnN0IGNodW5rSW5kZXggPSB0aGlzLmdldENodW5rSW5kZXgoY2h1bmspO1xuXG4gICAgaWYgKGNodW5rSW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY2h1bmsgaW5kZXggYXQgdXBkYXRlQ2h1bmsoKScpO1xuICAgIH1cblxuICAgIGNvbnN0IG9sZENodW5rID0gdGhpcy5jaHVua3NbY2h1bmtJbmRleF07XG5cbiAgICB0aGlzLmNodW5rc1tjaHVua0luZGV4XSA9IHtcbiAgICAgIC4uLm9sZENodW5rLFxuICAgICAgLi4ucGFydGlhbCxcbiAgICAgIGlkOiBvbGRDaHVuay5pZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDaHVua0VsKGNodW5rOiBDaHVuayk6ICRDaHVua0VsIHtcbiAgICBsZXQgJGNodW5rRWw6ICRDaHVua0VsO1xuXG4gICAgQXJyYXkuZnJvbSh0aGlzLmdldENodW5rc0NvbnRhaW5lcigpLmNoaWxkcmVuKS5mb3JFYWNoKCgkZWw6ICRDaHVua0VsKSA9PiB7XG4gICAgICBpZiAoJGVsLmRhdGFzZXRbJ2NodW5rJ10gPT09IGNodW5rLmlkLnRvU3RyaW5nKCkpIHtcbiAgICAgICAgJGNodW5rRWwgPSAkZWw7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gJGNodW5rRWw7XG4gIH1cblxuICBwcml2YXRlIGdldENodW5rc0J5SWRzKGNodW5rSWRzOiBTZXQ8bnVtYmVyPik6IENodW5rW10ge1xuICAgIHJldHVybiBbLi4uY2h1bmtJZHNdLm1hcChjaHVua0lkID0+IHRoaXMuZ2V0Q2h1bmtCeUlkKGNodW5rSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2h1bmtCeUlkKGNodW5rSWQ6IG51bWJlcik6IENodW5rIHtcbiAgICByZXR1cm4gdGhpcy5jaHVua3NbdGhpcy5nZXRDaHVua0luZGV4KGNodW5rSWQpXTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2h1bmtJbmRleChjaHVuazogQ2h1bmsgfCBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmICh0eXBlb2YgY2h1bmsgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaHVua3MuZmluZEluZGV4KGN1cnJDaHVuayA9PiBjdXJyQ2h1bmsuaWQgPT09IGNodW5rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2h1bmtzLmZpbmRJbmRleChjdXJyQ2h1bmsgPT4gY3VyckNodW5rLmlkID09PSBjaHVuay5pZCk7XG4gICAgfVxuICB9XG59XG4iLCJleHBvcnQgdHlwZSBDYWxsYmFja0ZuID0gKC4uLmFyZ3MpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBFdmVudEl0ZW0gPSB7XG4gIGNhbGxiYWNrOiBDYWxsYmFja0ZuO1xuICBvbmNlPzogYm9vbGVhbjtcbn07XG5cbmV4cG9ydCB0eXBlIEV2ZW50cyA9IHtcbiAgW2V2ZW50OiBzdHJpbmddOiBFdmVudEl0ZW1bXTtcbn1cblxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgcHJpdmF0ZSBldmVudHM6IEV2ZW50cyA9IHt9O1xuXG4gIG9uKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiBDYWxsYmFja0ZuLCBvbmNlPzogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIEZ1bmN0aW9uID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFdmVudCBoYW5kbGVyIHNob3VsZCBiZSBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudF0pIHtcbiAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XS5wdXNoKHtcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIG9uY2UsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ldmVudHNbZXZlbnRdID0gW3tcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIG9uY2UsXG4gICAgICB9XTtcbiAgICB9XG4gIH1cblxuICBvbmNlKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiBDYWxsYmFja0ZuKTogdm9pZCB7XG4gICAgdGhpcy5vbihldmVudCwgY2FsbGJhY2ssIHRydWUpO1xuICB9XG5cbiAgb2ZmKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrPzogQ2FsbGJhY2tGbik6IHZvaWQge1xuICAgIGlmIChjYWxsYmFjayAmJiBjYWxsYmFjayBpbnN0YW5jZW9mIEZ1bmN0aW9uID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJZiB5b3UgcHJvdmlkZSBoYW5kbGVyLCBpdCBzaG91bGQgYmUgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGlmICghdGhpcy5ldmVudHNbZXZlbnRdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5ldmVudHNbZXZlbnRdLmZvckVhY2goKGV2ZW50SXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgaWYgKGV2ZW50SXRlbS5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLmRlbGV0ZUV2ZW50Q2FsbGJhY2soZXZlbnQsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XSA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIGVtaXQoZXZlbnQ6IHN0cmluZywgLi4uYXJncyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudF0pIHtcbiAgICAgIHRoaXMuZXZlbnRzW2V2ZW50XS5mb3JFYWNoKChldmVudEl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgIGV2ZW50SXRlbS5jYWxsYmFjay5hcHBseShldmVudEl0ZW0uY2FsbGJhY2ssIGFyZ3MpO1xuXG4gICAgICAgIGlmIChldmVudEl0ZW0ub25jZSkge1xuICAgICAgICAgIHRoaXMuZGVsZXRlRXZlbnRDYWxsYmFjayhldmVudCwgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlbGV0ZUV2ZW50Q2FsbGJhY2soZXZlbnQ6IHN0cmluZywgY2JJbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5ldmVudHNbZXZlbnRdLnNwbGljZShjYkluZGV4LCAxKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgRXZlbnRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiIsImV4cG9ydCBjbGFzcyBQcmlvcml0eUV2ZW50cyB7XG4gIHByaXZhdGUgcm9vdEJ1czogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgYnVzOiBIVE1MRWxlbWVudDtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJvb3RCdXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmJ1cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMucm9vdEJ1cy5hcHBlbmRDaGlsZCh0aGlzLmJ1cyk7XG4gIH1cblxuICBvbihldmVudDogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQge1xuICAgIHRoaXMuYnVzLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgfVxuXG4gIG9uUm9vdChldmVudDogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQge1xuICAgIHRoaXMucm9vdEJ1cy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gIH1cblxuICBvbmNlKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrOiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5vbihldmVudCwgY2FsbGJhY2ssIHRydWUpO1xuICB9XG5cbiAgb25jZVJvb3QoZXZlbnQ6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLm9uUm9vdChldmVudCwgY2FsbGJhY2ssIHRydWUpO1xuICB9XG5cbiAgb2ZmKGV2ZW50OiBzdHJpbmcsIGNhbGxiYWNrPzogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCk6IHZvaWQge1xuICAgIHRoaXMuYnVzLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIG9mZlJvb3QoZXZlbnQ6IHN0cmluZywgY2FsbGJhY2s/OiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5yb290QnVzLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGVtaXQoZXZlbnQ6IEN1c3RvbUV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5idXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IFN0cmF0ZWd5LCBTdHJhdGVneUZhY3RvcnksIFN0cmF0ZWd5TW92ZUluZm8gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXZlbnRlciB9IGZyb20gJy4uL3NlcnZpY2VzL2V2ZW50ZXInO1xuaW1wb3J0IHsgTW92ZURpcmVjdGlvbiB9IGZyb20gJy4uL3Rhc2svaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCB0eXBlIEJvdW5kaW5nQm94ID0gQ2xpZW50UmVjdCB8IERPTVJlY3Q7XG5cbmNvbnN0IG1vdmVFdmVudCA9ICdzY3JvbGwtbW92ZSc7XG5cbmNsYXNzIFNjcm9sbFN0cmF0ZWd5IGltcGxlbWVudHMgU3RyYXRlZ3kge1xuICAkY2h1bmtzQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcblxuICBwcml2YXRlIGxhc3RZQ29vcmQgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgJHNjcm9sbENvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBXaW5kb3csXG4gICAgcHJpdmF0ZSAkdGFyZ2V0OiBIVE1MRWxlbWVudFxuICApIHtcbiAgICAkdGFyZ2V0LmlubmVySFRNTCA9IGA8ZGl2PjwvZGl2PmA7XG5cbiAgICB0aGlzLiRjaHVua3NDb250YWluZXIgPSAkdGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkIGFzIEhUTUxFbGVtZW50O1xuXG4gICAgdGhpcy5jaGVjaygpO1xuXG4gICAgdGhpcy4kc2Nyb2xsQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwsIHtcbiAgICAgIHBhc3NpdmU6IHRydWUsXG4gICAgfSk7XG4gIH1cblxuICBkZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuJHNjcm9sbENvbnRhaW5lci5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgfVxuXG4gIG9uTW92ZShjYWxsYmFjazogKGluZm86IFN0cmF0ZWd5TW92ZUluZm8pID0+IHZvaWQpIHtcbiAgICBFdmVudGVyLm9uKG1vdmVFdmVudCwgY2FsbGJhY2spO1xuICB9XG5cbiAgcHJpdmF0ZSBvblNjcm9sbCA9ICgpID0+IHtcbiAgICB0aGlzLmNoZWNrKCk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrKCk6IHZvaWQge1xuICAgIGNvbnN0IGNodW5rc0JveCA9IHRoaXMuZ2V0Q2h1bmtzQm94KCk7XG4gICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5nZXRWZXJ0aWNhbERpcmVjdGlvbigpO1xuICAgIGxldCByZW1haW5pbmdEaXN0YW5jZTogbnVtYmVyO1xuXG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19CT1RUT00pIHtcbiAgICAgIHJlbWFpbmluZ0Rpc3RhbmNlID0gY2h1bmtzQm94LmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gTW92ZURpcmVjdGlvbi5UT19UT1ApIHtcbiAgICAgIHJlbWFpbmluZ0Rpc3RhbmNlID0gY2h1bmtzQm94LnRvcCAqIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZGVmaW5lZCBkaXJlY3Rpb24nKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbmZvOiBTdHJhdGVneU1vdmVJbmZvID0ge1xuICAgICAgZGlyZWN0aW9uLFxuICAgICAgcmVtYWluaW5nRGlzdGFuY2UsXG4gICAgfTtcblxuICAgIEV2ZW50ZXIuZW1pdChtb3ZlRXZlbnQsIGluZm8pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRWZXJ0aWNhbERpcmVjdGlvbigpOiBNb3ZlRGlyZWN0aW9uIHtcbiAgICBsZXQgZGlyZWN0aW9uOiBNb3ZlRGlyZWN0aW9uO1xuICAgIGxldCBjdXJyZW50WTogbnVtYmVyO1xuXG4gICAgaWYgKHRoaXMuJHNjcm9sbENvbnRhaW5lciBpbnN0YW5jZW9mIFdpbmRvdykge1xuICAgICAgY3VycmVudFkgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudFkgPSB0aGlzLiRzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50WSA+IHRoaXMubGFzdFlDb29yZCkge1xuICAgICAgZGlyZWN0aW9uID0gTW92ZURpcmVjdGlvbi5UT19CT1RUT007XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpcmVjdGlvbiA9IE1vdmVEaXJlY3Rpb24uVE9fVE9QO1xuICAgIH1cblxuICAgIHRoaXMubGFzdFlDb29yZCA9IGN1cnJlbnRZO1xuXG4gICAgcmV0dXJuIGRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBCb3ggd2hlcmUgaXMgcGxhY2VkIGNodW5rcyBib3ggYW5kIGNvbnNpZGVyaW5nIHBhZGRpbmdzIG9mICR0YXJnZXRcbiAgICovXG4gIHByaXZhdGUgZ2V0U2Nyb2xsQm94KCk6IEJvdW5kaW5nQm94IHtcbiAgICBjb25zdCB2aWV3cG9ydEJveCA9IHRoaXMuZ2V0Vmlld3BvcnRCb3goKTtcbiAgICBjb25zdCB0YXJnZXRCb3ggPSB0aGlzLiR0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiB0YXJnZXRCb3gudG9wIC0gdmlld3BvcnRCb3gudG9wLFxuICAgICAgcmlnaHQ6IHRhcmdldEJveC5yaWdodCxcbiAgICAgIGJvdHRvbTogdGFyZ2V0Qm94LmJvdHRvbSAtIHZpZXdwb3J0Qm94LmJvdHRvbSxcbiAgICAgIGxlZnQ6IHRhcmdldEJveC5sZWZ0IC0gdmlld3BvcnRCb3gubGVmdCxcbiAgICAgIGhlaWdodDogdGFyZ2V0Qm94LmhlaWdodCxcbiAgICAgIHdpZHRoOiB0YXJnZXRCb3gud2lkdGgsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCb3ggd2l0aCByZW5kZXJlZCBjaHVua3NcbiAgICovXG4gIHByaXZhdGUgZ2V0Q2h1bmtzQm94KCk6IEJvdW5kaW5nQm94IHtcbiAgICBjb25zdCB2aWV3cG9ydEJveCA9IHRoaXMuZ2V0Vmlld3BvcnRCb3goKTtcbiAgICBjb25zdCBjaHVua3NCb3ggPSB0aGlzLiRjaHVua3NDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiBjaHVua3NCb3gudG9wIC0gdmlld3BvcnRCb3gudG9wLFxuICAgICAgcmlnaHQ6IGNodW5rc0JveC5yaWdodCxcbiAgICAgIGJvdHRvbTogY2h1bmtzQm94LmJvdHRvbSAtIHZpZXdwb3J0Qm94LmJvdHRvbSxcbiAgICAgIGxlZnQ6IGNodW5rc0JveC5sZWZ0IC0gdmlld3BvcnRCb3gubGVmdCxcbiAgICAgIGhlaWdodDogY2h1bmtzQm94LmhlaWdodCxcbiAgICAgIHdpZHRoOiBjaHVua3NCb3gud2lkdGgsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCb3ggb2Ygdmlld3BvcnRcbiAgICovXG4gIHByaXZhdGUgZ2V0Vmlld3BvcnRCb3goKTogQm91bmRpbmdCb3gge1xuICAgIGlmICh0aGlzLiRzY3JvbGxDb250YWluZXIgaW5zdGFuY2VvZiBXaW5kb3cpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogMCxcbiAgICAgICAgcmlnaHQ6IHRoaXMuZ2V0V2luZG93V2lkdGgoKSxcbiAgICAgICAgYm90dG9tOiB0aGlzLmdldFdpbmRvd0hlaWdodCgpLFxuICAgICAgICBsZWZ0OiAwLFxuICAgICAgICBoZWlnaHQ6IHRoaXMuZ2V0V2luZG93SGVpZ2h0KCksXG4gICAgICAgIHdpZHRoOiB0aGlzLmdldFdpbmRvd1dpZHRoKCksXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLiRzY3JvbGxDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRXaW5kb3dXaWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1pbihcbiAgICAgIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgsIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGdldFdpbmRvd0hlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1pbihcbiAgICAgIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0LCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0XG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Nyb2xsU3RyYXRlZ3koJHNjcm9sbENvbnRhaW5lcjogc3RyaW5nIHwgSFRNTEVsZW1lbnQgfCBXaW5kb3cgPSB3aW5kb3cpOiBTdHJhdGVneUZhY3Rvcnkge1xuICBpZiAodHlwZW9mICRzY3JvbGxDb250YWluZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgJHNjcm9sbENvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJHNjcm9sbENvbnRhaW5lcikgYXMgSFRNTEVsZW1lbnQ7XG4gIH1cblxuICByZXR1cm4gJHRhcmdldCA9PiB7XG4gICAgcmV0dXJuIG5ldyBTY3JvbGxTdHJhdGVneSgkc2Nyb2xsQ29udGFpbmVyIGFzIEhUTUxFbGVtZW50IHwgV2luZG93LCAkdGFyZ2V0KTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUHJpb3JpdHlFdmVudHMgfSBmcm9tICcuLi9zZXJ2aWNlcy9wcmlvcml0eS1ldmVudHMnO1xuaW1wb3J0IHtcbiAgRXh0ZW5kYWJsZUV2ZW50LFxuICBUYXNrUmVhY2hCb3VuZERhdGEsXG4gIFRhc2tUeXBlLFxuICBUYXNrUmVuZGVyRGF0YSxcbiAgVGFza01vdW50RGF0YSxcbiAgVGFza1VubW91bnREYXRhLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgVGFza0NoaWxkSGFuZGxlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcHJpb3JpdHlFdmVudHM6IFByaW9yaXR5RXZlbnRzLFxuICApIHt9XG5cbiAgb25SZWFjaEJvdW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrUmVhY2hCb3VuZERhdGE+KSA9PiB2b2lkKSB7XG4gICAgdGhpcy5wcmlvcml0eUV2ZW50cy5vbihUYXNrVHlwZS5SRUFDSF9CT1VORCwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25SZW5kZXIoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tSZW5kZXJEYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub24oVGFza1R5cGUuUkVOREVSLCBjYWxsYmFjayk7XG4gIH1cblxuICBvbk1vdW50KGNhbGxiYWNrOiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUYXNrTW91bnREYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub24oVGFza1R5cGUuTU9VTlQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIG9uVW5tb3VudChjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza1VubW91bnREYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub24oVGFza1R5cGUuVU5NT1VOVCwgY2FsbGJhY2spO1xuICB9XG59XG5cbiIsImltcG9ydCB7XG4gIEV4dGVuZGFibGVFdmVudCxcbiAgVGFza01vdW50RGF0YSxcbiAgVGFza1JlYWNoQm91bmREYXRhLFxuICBUYXNrUmVuZGVyRGF0YSxcbiAgVGFza1R5cGUsXG4gIFRhc2tVbm1vdW50RGF0YSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IFByaW9yaXR5RXZlbnRzIH0gZnJvbSAnLi4vc2VydmljZXMvcHJpb3JpdHktZXZlbnRzJztcbmltcG9ydCB7IEV2ZW50ZXIgfSBmcm9tICcuLi9zZXJ2aWNlcy9ldmVudGVyJztcbmltcG9ydCB7IHJhbmRTdHJpbmcgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyBoYW5kbGVFeHRlbmRhYmxlRXZlbnQgfSBmcm9tICcuL3Jvb3QtaGFuZGxlcic7XG5cbmNvbnN0IHN1cHBseVdhaXRVbnRpbCA9IDxUPihjdXN0b21FdmVudCk6IEV4dGVuZGFibGVFdmVudDxUPiA9PiB7XG4gIGNvbnN0IGV2ZW50TmFtZSA9IHJhbmRTdHJpbmcoNCk7XG5cbiAgY29uc3QgcmVzb2x2ZSA9ICgpID0+IHtcbiAgICBFdmVudGVyLmVtaXQoZXZlbnROYW1lKTtcbiAgICBFdmVudGVyLm9mZihldmVudE5hbWUpO1xuICB9O1xuXG4gIGN1c3RvbUV2ZW50Ll9fb25SZXNvbHZlID0gY2FsbGJhY2sgPT4ge1xuICAgIEV2ZW50ZXIub24oZXZlbnROYW1lLCBjYWxsYmFjaylcbiAgfTtcblxuICBjdXN0b21FdmVudC5fX3Jlc29sdmUgPSByZXNvbHZlO1xuXG4gIGN1c3RvbUV2ZW50LndhaXRVbnRpbCA9IHByb21pc2UgPT4ge1xuICAgIGN1c3RvbUV2ZW50Ll9faXNQZW5kaW5nID0gdHJ1ZTtcblxuICAgIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICBjdXN0b21FdmVudC5fX2lzUGVuZGluZyA9IGZhbHNlO1xuXG4gICAgICBpZiAoY3VzdG9tRXZlbnQuX19jYW5jZWxlZCAhPT0gdHJ1ZSkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3Qgb3JpZ2luYWxTSVAgPSBjdXN0b21FdmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb247XG5cbiAgY3VzdG9tRXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uID0gKCkgPT4ge1xuICAgIGN1c3RvbUV2ZW50Ll9fY2FuY2VsZWQgPSB0cnVlO1xuICAgIG9yaWdpbmFsU0lQLmNhbGwoY3VzdG9tRXZlbnQpO1xuICB9XG5cbiAgcmV0dXJuIGN1c3RvbUV2ZW50O1xufVxuXG5leHBvcnQgdHlwZSBCdXN5VGFza3MgPSB7XG4gIFt0YXNrVHlwZSBpbiBUYXNrVHlwZV06IGFueVtdO1xufVxuXG5leHBvcnQgY2xhc3MgVGFza0VtaXR0ZXIge1xuICBwcml2YXRlIGJ1c3lUYXNrczogQnVzeVRhc2tzID0ge1xuICAgIFtUYXNrVHlwZS5SRUFDSF9CT1VORF06IFtdLFxuICAgIFtUYXNrVHlwZS5SRU5ERVJdOiBbXSxcbiAgICBbVGFza1R5cGUuTU9VTlRdOiBbXSxcbiAgICBbVGFza1R5cGUuVU5NT1VOVF06IFtdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcHJpb3JpdHlFdmVudHM6IFByaW9yaXR5RXZlbnRzLFxuICApIHt9XG5cbiAgZW1pdFJlYWNoQm91bmQoZGF0YTogVGFza1JlYWNoQm91bmREYXRhKTogUHJvbWlzZTxFeHRlbmRhYmxlRXZlbnQ8VGFza1JlYWNoQm91bmREYXRhPj4ge1xuICAgIHJldHVybiB0aGlzLmVtaXRFeHRlbmRhYmxlRXZlbnQ8VGFza1JlYWNoQm91bmREYXRhPihUYXNrVHlwZS5SRUFDSF9CT1VORCwgZGF0YSwgZGF0YS5tb3ZlSW5mby5kaXJlY3Rpb24pO1xuICB9XG5cbiAgZW1pdFJlbmRlcihkYXRhOiBUYXNrUmVuZGVyRGF0YSk6IFByb21pc2U8RXh0ZW5kYWJsZUV2ZW50PFRhc2tSZW5kZXJEYXRhPj4ge1xuICAgIHJldHVybiB0aGlzLmVtaXRFeHRlbmRhYmxlRXZlbnQ8VGFza1JlbmRlckRhdGE+KFRhc2tUeXBlLlJFTkRFUiwgZGF0YSwgZGF0YS5jaHVuay5pZCk7XG4gIH1cblxuICBlbWl0TW91bnQoZGF0YTogVGFza01vdW50RGF0YSk6IFByb21pc2U8RXh0ZW5kYWJsZUV2ZW50PFRhc2tNb3VudERhdGE+PiB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdEV4dGVuZGFibGVFdmVudDxUYXNrTW91bnREYXRhPihUYXNrVHlwZS5NT1VOVCwgZGF0YSwgZGF0YS5jaHVuay5pZCk7XG4gIH1cblxuICBlbWl0VW5tb3VudChkYXRhOiBUYXNrVW5tb3VudERhdGEpOiBQcm9taXNlPEV4dGVuZGFibGVFdmVudDxUYXNrVW5tb3VudERhdGE+PiB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdEV4dGVuZGFibGVFdmVudDxUYXNrVW5tb3VudERhdGE+KFRhc2tUeXBlLlVOTU9VTlQsIGRhdGEsIGRhdGEuY2h1bmsuaWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0RXh0ZW5kYWJsZUV2ZW50PFQ+KHRhc2tUeXBlOiBUYXNrVHlwZSwgZGF0YTogVCwgbWFya2VyKTogUHJvbWlzZTxFeHRlbmRhYmxlRXZlbnQ8VD4+IHtcbiAgICBpZiAodGhpcy5idXN5VGFza3NbdGFza1R5cGVdLmluY2x1ZGVzKG1hcmtlcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXN0b21FdmVudCA9IG5ldyBDdXN0b21FdmVudDxUPih0YXNrVHlwZSwge1xuICAgICAgZGV0YWlsOiBkYXRhLFxuICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGVuaGFuY2VkQ3VzdG9tRXZlbnQgPSBzdXBwbHlXYWl0VW50aWw8VD4oY3VzdG9tRXZlbnQpO1xuXG4gICAgZW5oYW5jZWRDdXN0b21FdmVudC5fX29uUmVzb2x2ZSgoKSA9PiB7XG4gICAgICB0aGlzLmJ1c3lUYXNrc1t0YXNrVHlwZV0uc3BsaWNlKHRoaXMuYnVzeVRhc2tzW3Rhc2tUeXBlXS5pbmRleE9mKG1hcmtlciksIDEpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5idXN5VGFza3NbdGFza1R5cGVdLnB1c2gobWFya2VyKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIHRoaXMucHJpb3JpdHlFdmVudHMub25jZVJvb3QodGFza1R5cGUsIChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFQ+KSA9PiB7XG4gICAgICAgIGlmIChldmVudCA9PT0gZW5oYW5jZWRDdXN0b21FdmVudCkge1xuICAgICAgICAgIGhhbmRsZUV4dGVuZGFibGVFdmVudDxUPihyZXNvbHZlKShldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnByaW9yaXR5RXZlbnRzLmVtaXQoZW5oYW5jZWRDdXN0b21FdmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IENodW5rLCAkQ2h1bmtFbCB9IGZyb20gJy4uL2xpYic7XG5pbXBvcnQgeyBTdHJhdGVneU1vdmVJbmZvIH0gZnJvbSAnLi4vc3RyYXRlZ3kvaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCB0eXBlIEV4dGVuZGFibGVFdmVudDxUPiA9IEN1c3RvbUV2ZW50PFQ+ICYge1xuICByZWFkb25seSB3YWl0VW50aWw6IChwcm9taXNlOiBQcm9taXNlPGFueT4pID0+IHZvaWQ7XG4gIHJlYWRvbmx5IF9fb25SZXNvbHZlOiAoY2FsbGJhY2s6ICgpID0+IHZvaWQpID0+IHZvaWQ7XG4gIHJlYWRvbmx5IF9fcmVzb2x2ZTogKCkgPT4gdm9pZDtcbiAgX19pc1BlbmRpbmc6IGJvb2xlYW47XG4gIF9fY2FuY2VsZWQ6IGJvb2xlYW47XG59O1xuXG5leHBvcnQgZW51bSBNb3ZlRGlyZWN0aW9uIHtcbiAgVE9fVE9QID0gJ3RvX3RvcCcsXG4gIFRPX0JPVFRPTSA9ICd0b19ib3R0b20nLFxufVxuXG5leHBvcnQgZW51bSBUYXNrVHlwZSB7XG4gIE1PVU5UID0gJ21vdW50JyxcbiAgVU5NT1VOVCA9ICd1bm1vdW50JyxcbiAgUkVOREVSID0gJ3JlbmRlcicsXG4gIFJFQUNIX0JPVU5EID0gJ3JlYWNoLWJvdW5kJyxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYXNrRGF0YSB7XG4gIHJlYWRvbmx5IGNodW5rOiBDaHVuaztcbiAgcmVhZG9ubHkgcmVuZGVyZWRDaHVua3M6IENodW5rW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFza1JlYWNoQm91bmREYXRhIHtcbiAgcmVhZG9ubHkgZm9yd2FyZENodW5rczogQ2h1bmtbXTtcbiAgcmVhZG9ubHkgbW92ZUluZm86IFN0cmF0ZWd5TW92ZUluZm87XG59O1xuXG5leHBvcnQgdHlwZSBUYXNrUmVuZGVyRGF0YSA9IHtcbiAgcmVhZG9ubHkgY2h1bms6IENodW5rO1xuICByZWFkb25seSBpc1NoYWRvd1BsYWNlaG9sZGVyOiBib29sZWFuO1xufTtcblxuZXhwb3J0IHR5cGUgVGFza01vdW50RGF0YSA9IFRhc2tEYXRhICYge1xuICByZWFkb25seSAkZWw6ICRDaHVua0VsO1xuICByZWFkb25seSBpc1NoYWRvd1BsYWNlaG9sZGVyOiBib29sZWFuO1xufTtcblxuZXhwb3J0IHR5cGUgVGFza1VubW91bnREYXRhID0gVGFza0RhdGEgJiB7XG4gIHJlYWRvbmx5ICRlbDogJENodW5rRWw7XG4gIHJlYWRvbmx5IGlzU2hhZG93UGxhY2Vob2xkZXI6IGJvb2xlYW47XG59O1xuIiwiaW1wb3J0IHsgUHJpb3JpdHlFdmVudHMgfSBmcm9tICcuLi9zZXJ2aWNlcy9wcmlvcml0eS1ldmVudHMnO1xuaW1wb3J0IHtcbiAgRXh0ZW5kYWJsZUV2ZW50LFxuICBUYXNrVHlwZSxcbiAgVGFza01vdW50RGF0YSxcbiAgVGFza1JlbmRlckRhdGEsXG4gIFRhc2tSZWFjaEJvdW5kRGF0YSxcbiAgVGFza1VubW91bnREYXRhLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNFeGlzdHMgfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVFeHRlbmRhYmxlRXZlbnQgPSA8VD4oY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFQ+KSA9PiB2b2lkKSA9PiB7XG4gIHJldHVybiAoZXZlbnQ6IEV4dGVuZGFibGVFdmVudDxUPikgPT4ge1xuICAgIGV2ZW50Ll9fb25SZXNvbHZlKCgpID0+IHtcbiAgICAgIGNhbGxiYWNrKGV2ZW50KTtcbiAgICB9KTtcblxuICAgIGlmIChpc0V4aXN0cyhldmVudC5fX2lzUGVuZGluZykgPT09IGZhbHNlKSB7XG4gICAgICBldmVudC5fX3Jlc29sdmUoKTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnQgY2xhc3MgVGFza1Jvb3RIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBwcmlvcml0eUV2ZW50czogUHJpb3JpdHlFdmVudHMsXG4gICkge31cblxuICBwcm90ZWN0ZWQgb25Sb290UmVhY2hCb3VuZChjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza1JlYWNoQm91bmREYXRhPikgPT4gdm9pZCkge1xuICAgIHRoaXMucHJpb3JpdHlFdmVudHMub25Sb290KFRhc2tUeXBlLlJFQUNIX0JPVU5ELCBoYW5kbGVFeHRlbmRhYmxlRXZlbnQ8VGFza1JlYWNoQm91bmREYXRhPihjYWxsYmFjaykpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uUm9vdFJlbmRlcihjYWxsYmFjazogKGV2ZW50OiBFeHRlbmRhYmxlRXZlbnQ8VGFza1JlbmRlckRhdGE+KSA9PiB2b2lkKSB7XG4gICAgdGhpcy5wcmlvcml0eUV2ZW50cy5vblJvb3QoVGFza1R5cGUuUkVOREVSLCBoYW5kbGVFeHRlbmRhYmxlRXZlbnQ8VGFza1JlbmRlckRhdGE+KGNhbGxiYWNrKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgb25Sb290TW91bnQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tNb3VudERhdGE+KSA9PiB2b2lkKSB7XG4gICAgdGhpcy5wcmlvcml0eUV2ZW50cy5vblJvb3QoVGFza1R5cGUuTU9VTlQsIGhhbmRsZUV4dGVuZGFibGVFdmVudDxUYXNrTW91bnREYXRhPihjYWxsYmFjaykpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uUm9vdFVubW91bnQoY2FsbGJhY2s6IChldmVudDogRXh0ZW5kYWJsZUV2ZW50PFRhc2tVbm1vdW50RGF0YT4pID0+IHZvaWQpIHtcbiAgICB0aGlzLnByaW9yaXR5RXZlbnRzLm9uUm9vdChUYXNrVHlwZS5VTk1PVU5ULCBoYW5kbGVFeHRlbmRhYmxlRXZlbnQ8VGFza1VubW91bnREYXRhPihjYWxsYmFjaykpO1xuICB9XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gaXNFeGlzdHModmFsdWUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kU3RyaW5nKGxlbmd0aCkge1xuICBsZXQgdGV4dCA9ICcnO1xuICBsZXQgcG9zc2libGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB0ZXh0ICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcbiAgfVxuXG4gIHJldHVybiB0ZXh0O1xufVxuIl19
