/* Нижние шторки (bottom sheet) — общий контейнер для форм и карточек. */
import { A } from '../core/index.js';
const { $ } = A;
/* ------------------------- шторки ------------------------- */
A.openSheet = function (opts) {
  const back = $('#sheetBack');
  $('#sheetTitle').textContent = opts.title || '';
  $('#sheetBody').innerHTML = opts.body || '';
  const foot = $('#sheetFoot');
  if (opts.foot) {
    foot.innerHTML = opts.foot;
    foot.classList.remove('hidden');
  } else {
    foot.innerHTML = '';
    foot.classList.add('hidden');
  }
  back.classList.add('open');
  if (opts.mount)
    setTimeout(() => {
      try {
        opts.mount($('#sheet'));
      } catch (e) {
        console.error(e);
      }
    }, 0);
};

A.closeSheet = function () {
  $('#sheetBack').classList.remove('open');
  $('#sheetBody').innerHTML = '';
};
