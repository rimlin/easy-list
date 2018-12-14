import { EasyList } from '../../index';

const randPicture = 'https://source.unsplash.com/random/800x600';
let id = 0;

const easyList = new EasyList();

const $feed = document.querySelector('#feed');

easyList.bind($feed);

easyList.onReachBound(event => {
  const item = getItem();

  easyList.appendItems([{
    template: getItemTemplate(item),
    data: item
  }]);
})

/*
easyList.onRender(event => {
  if (event.detail.chunk.data.id == 0) {
    event.waitUntil(new Promise(resolve => {
      setTimeout(() => resolve(), 2500);
    }))
  }
})
*/

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
  return `<div>
    <h1>Picture ${item.id}</h1>
    <img src="${item.image}" />
  </div>`;
}
