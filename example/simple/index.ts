import { EasyList } from '../../index';

class a {
  readonly cbec: boolean;

  constructor(
    private easyList: EasyList,
  ) {
    easyList.bind();

    var i = 0;

    easyList.onReachBound(event => {
      if (i == 0) {
        i++;
        console.log('on reach bound with wait until 500ms')
        event.waitUntil(new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 500)
        }))
      } else {

        console.log('on reach bound simple')
      }
    })

    easyList.onRender(event => {
      if (i == 0) {
        i++;
        console.log('on render with wait until 500ms', event.detail.chunk.id)
        event.waitUntil(new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 500)
        }))
      } else {

        console.log('on render simple', event.detail.chunk.id)
      }
    })



  }
}

new a(new EasyList());
