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
        console.log('on reach bound with wait until')
        event.waitUntil(new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 500)
        }))
      } else {

        console.log('on reach bound simple')
      }
    })



  }
}

new a(new EasyList());
