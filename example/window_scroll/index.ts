import { EasyList } from '../../index';

const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;

const easyList = new EasyList();
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
