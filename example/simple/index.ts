import { EasyList } from '../../index';
import { createScrollStrategy } from '../../src/strategy/scroll';
import { RawItem } from '../../src/lib';
import { MoveDirection } from '../../src/task/interfaces';

const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;

const easyList = new EasyList({
  strategy: createScrollStrategy('#parent'),
  useShadowPlaceholder: true,
  maxItems: 3,
  sensitivity: {
    [MoveDirection.TO_BOTTOM]: 500,
  }
});

const $feed = document.querySelector('#feed');
addItems();
easyList.bind($feed);

easyList.onReachBound(event => {
  if (event.detail.forwardChunks.length !== 0) {
    return;
  }

  if (event.detail.moveInfo.direction !== MoveDirection.TO_BOTTOM) {
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
  const items: RawItem[] = [];

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
