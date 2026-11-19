/* Molxo portfolio: мелкие общие помощники (ES5). PF.onScreen(el, onShow, onHide), PF.reduced, PF.tabs(root, onChange). */
(function (w) {
  'use strict';
  var mq = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var PF = { reduced: !!mq.matches };
  if (mq.addEventListener) mq.addEventListener('change', function (e) { PF.reduced = !!e.matches; });

  /* Вызывает onShow, когда элемент виден, и onHide, когда ушёл с экрана или вкладка скрыта (паузы анимаций). */
  PF.onScreen = function (el, onShow, onHide) {
    var vis = false, tab = true;
    function upd() { var n = vis && tab; if (n) onShow(); else if (onHide) onHide(); }
    if ('IntersectionObserver' in w) {
      new w.IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; upd(); }, { threshold: 0.15 }).observe(el);
    } else { vis = true; }
    w.document.addEventListener('visibilitychange', function () { tab = !w.document.hidden; upd(); });
    upd();
  };

  /* Вкладки: кнопки с role="tab"/aria-selected внутри root; onChange(id) получает data-tab. */
  PF.tabs = function (root, onChange) {
    var btns = root.querySelectorAll('[data-tab]');
    function sel(id) {
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute('aria-selected', btns[i].getAttribute('data-tab') === id ? 'true' : 'false');
      }
      if (onChange) onChange(id);
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-tab]') : null;
      if (b && root.contains(b)) sel(b.getAttribute('data-tab'));
    });
    return sel;
  };
  w.PF = PF;
}(window));
