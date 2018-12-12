import { EasyList } from '../../index';

class a {
  readonly cbec: boolean;

  constructor(
    private easyList: EasyList,
  ) {
    easyList.bind();

    easyList.onReachBound(event => {
      console.log('on reach bound', event)

      event.waitUntil(new Promise(resolve => {
        setTimeout(() => {
          resolve()
        }, 500)
      }))
    })
  }
}

new a(new EasyList());
