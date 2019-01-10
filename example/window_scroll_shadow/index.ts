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
  const shadowHost = event.detail.$el.querySelector('div');

  let shadowRoot = shadowHost.attachShadow({
    mode: 'open'
  });

  shadowRoot.innerHTML = getItemTemplate(event.detail.chunk.data);

  event.waitUntil(new Promise(resolve => {
    const imgEl = shadowRoot.querySelector('img');

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
    template: '<div class="item">Here will be shadow DOM</div>',
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
  return `
  <style>
    .shadow-item img {
      height: 600px;
    }
  </style>
  <div class="shadow-item">
    <h1>Picture ${item.id}</h1>
    <img src="${item.image}" />
  </div>
  `;
}
