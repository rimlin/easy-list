# Easy List
> Fast infinity list without dependencies

![npm version](https://badge.fury.io/js/easy-list.svg)

## Installation
```
$ npm i easy-list
```

## Example
*index.html*
```
<html>
  <head>
    <title>Simple Example</title>
    <style>
      .item {
        padding: 100px 0;
        margin: 50px 0;
      }

      .item img {
        height: 600px;
      }
    </style>
  </head>
  <body>
    <div id="feed"></div>

    <script src="/index.js"></script>
  </body>
</html>
```

*index.js*
```
const easyList = new EasyList();
easyList.bind(document.querySelector('#feed'));

easyList.onReachBound(event => {
  if (event.detail.forwardChunks.length !== 0) {
    return;
  }

  if (event.detail.moveInfo.direction !== MoveDirection.TO_BOTTOM) {
    return;
  }

  addItems();
});
```

## How it work
Section in progress

## Roadmap to version 1.0.0
- test coverage
- intersection strategy
- Angular/React implementation
- perfomance benchmarking

## API
### Options

`EasyList` instance can accept next options:

#### strategy?: StrategyFactory;
Strategy is used to detect, that scroll bound is touched chunks box.

By default is `ScrollStrategy`.

#### useShadowPlaceholder?: boolean;

If enabled, after adding new chunks add space as placeholder after/before rendered chunks. If chunk height is not defined, mount him as placeholder to detect height of him element and increase placehodler space.

Emitting `onMount/onUnmount` event with `isShadowPlaceholder: true` option.

#### maxItems?: number;

Max amount of items in list.

By default is 5 items.

#### sensitivity?: object;

Amount of pixels between edge item and current scroll position.
It should be less than item height.

By default is 300px.


Example of options: 
```
const easyList = new EasyList({
  strategy: createScrollStrategy('#parent'),
  useShadowPlaceholder: true,
  maxItems: 3,
  sensitivity: {
    [MoveDirection.TO_BOTTOM]: 500,
  }
});
```

`MoveDirection` - is enum with properties: `TO_BOTTOM` (`'to_bottom'`), `TO_TOP` (`'to_top'`).

### Methods

`bind($target: HTMLElement | string)`

Function to bind HTML element to `EasyList` as target.

`appendItems(items: RawItem[])`

Function to append new items in list.

`prependItems(items: RawItem[])`

Function to prepend new items in list.

`RawItem` - source object in `EasyList`. Contain next properties:

| Property | Value  |
|----------|--------|
| template | string |
| height?  | number |
| data?    | any    |

In `data` property could be stored any object. For example, you can set a real `id` to bind it to a real object.

### Events
Created `EasyList` instance emit next events: `ReachBound`, `Render`, `Mount`, `Unmount`.

You can easily subscribe to it by next methods:

`onReachBound(callback: (event: ExtendableEvent<TaskReachBoundData>) => void)`

`onRender(callback: (event: ExtendableEvent<TaskRenderData>) => void)`

`onMount(callback: (event: ExtendableEvent<TaskMountData>) => void)`

`onUnmount(callback: (event: ExtendableEvent<TaskUnmountData>) => void)`


`ExtendableEvent<T>` - is simple [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent), which was supplied `waitUntil` method. 

#### `ExtendableEvent<T>` methods
`waitUntil(promise: Promise<any>)`

Delay time of event resolving. Example of waiting mount until image is loaded:
```
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
```

#### `ExtendableEvent<T>` details properties
Each type of event have own readonly properties.

**TaskReachBoundData**

| Property      | Value            |
|---------------|------------------|
| forwardChunks | Chunk[]          |
| moveInfo      | StrategyMoveInfo |


**TaskRenderData**

| Property            | Value   |
|---------------------|---------|
| chunk               | Chunk   |
| isShadowPlaceholder | boolean |


**TaskMountData**

| Property            | Value    |
|---------------------|----------|
| chunk               | Chunk    |
| isShadowPlaceholder | Chunk[]  |
| renderedChunks      | Chunk[]  |
| $el                 | $ChunkEl |


**TaskUnmountData**

| Property            | Value    |
|---------------------|----------|
| chunk               | Chunk    |
| isShadowPlaceholder | Chunk[]  |
| renderedChunks      | Chunk[]  |
| $el                 | $ChunkEl |


`Chunk` - object which operated by `EasyList`. Contain next properties:

| Property   | Value   |
|------------|---------|
| id         | number  |
| calculated | boolean |
| template   | string  |
| height     | number  |
| data       | any     |

`$ChunkEl` - is `HTMLDivElement` object.

`StrategyMoveInfo` - is object of Strategy `move` event. Contain next properties:

| Property          | Value                            |
|-------------------|----------------------------------|
| direction         | MoveDirection(to_top, to_bottom) |
| remainingDistance | number                           |
