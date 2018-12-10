import { EasyList } from '../../index';

class a {
  readonly cbec: boolean;

  constructor(
    private easyList: EasyList,
  ) {
    easyList.bind();
    easyList.onReachBound(event => {
      console.log('reach bound 1');
    });

    setTimeout(() => {
      easyList.onReachBound(event => {
        console.log('reach bound 2');
        event.stopPropagation();
      });
    }, 500)
  }
}

new a(new EasyList());
