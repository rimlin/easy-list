import { EasyList } from '../../index';
import { createScrollStrategy } from '../../src/strategy/scroll';

const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;

const easyList = new EasyList({
  strategy: createScrollStrategy('#parent'),
});

const $feed = document.querySelector('#feed');

easyList.bind($feed);

easyList.onReachBound(event => {
  const item = getItem();

  easyList.appendItems([{
    template: getItemTemplate(item),
    data: item
  }]);
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

setTimeout(() => {
  const item = getItem();

  easyList.prependItems([{
    template: getItemTemplate(item),
    data: item
  }]);
}, 500);

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
